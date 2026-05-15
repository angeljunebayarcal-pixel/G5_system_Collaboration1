import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService, DirectoryUserData } from '../../../services/auth.service';
import { SettingsService } from '../../../services/settings.service';
import Swal from 'sweetalert2';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';

type DirectoryUserWithPrivacy = DirectoryUserData & {
  contact?: string;
  contactNumber?: string;
  contactNo?: string;
  phone?: string;
  phoneNumber?: string;
  mobile?: string;
  mobileNumber?: string;
  tel?: string;
  telephone?: string;
  showContactInfo?: boolean;
  contactHidden?: boolean;
  originalContact?: string;
};

@Component({
  selector: 'app-userdirectory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './userdirectory.html',
  styleUrl: './userdirectory.scss',
})
export class Userdirectory implements OnInit, OnDestroy {
  searchTerm = '';
  selectedRole = 'all';
  selectedStatus = 'all';

  users: DirectoryUserWithPrivacy[] = [];
  filteredUsers: DirectoryUserWithPrivacy[] = [];

  selectedUser: DirectoryUserWithPrivacy | null = null;
  showViewModal = false;
  loading = true;

  private routerSub?: Subscription;
  private readonly userDirectoryCacheKey = 'admin_user_directory_cache_v1';
  private isLoadingUsers = false;

  constructor(
    private authService: AuthService,
    private settingsService: SettingsService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    this.loadUsersCache();

    this.loading = false;
    this.cdr.detectChanges();

    await this.loadUsers(false);

    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(async () => {
        if (this.router.url.includes('/userdirectory')) {
          await this.loadUsers(false);
        }
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  private loadUsersCache(): void {
    try {
      const cached = localStorage.getItem(this.userDirectoryCacheKey);

      if (cached) {
        this.users = JSON.parse(cached) || [];
        this.applyFilters();
      }
    } catch (error) {
      console.error('Failed to load user directory cache:', error);
      localStorage.removeItem(this.userDirectoryCacheKey);
    }
  }

  private saveUsersCache(): void {
    try {
      const safeUsers = (this.users || []).map((user: any) => ({
        uid: user.uid || '',
        fullName: user.fullName || '',
        email: user.email || '',
        role: user.role || '',
        status: user.status || '',
        activityStatus: user.activityStatus ?? true,

        contact: user.contact || '',
        contactNumber: user.contactNumber || '',
        contactNo: user.contactNo || '',
        phone: user.phone || '',
        phoneNumber: user.phoneNumber || '',
        mobile: user.mobile || '',
        mobileNumber: user.mobileNumber || '',
        tel: user.tel || '',
        telephone: user.telephone || '',
        originalContact: user.originalContact || '',

        showContactInfo: user.showContactInfo ?? false,
        contactHidden: user.contactHidden ?? true
      }));

      localStorage.setItem(
        this.userDirectoryCacheKey,
        JSON.stringify(safeUsers)
      );
    } catch (error) {
      console.error('Failed to save user directory cache:', error);
      localStorage.removeItem(this.userDirectoryCacheKey);
    }
  }

  private maskUsersBeforePrivacyCheck(users: DirectoryUserData[]): DirectoryUserWithPrivacy[] {
    return (users || []).map((user: any) => ({
      ...user,
      contact: 'Checking privacy...',
      contactNumber: 'Checking privacy...',
      contactNo: 'Checking privacy...',
      phone: 'Checking privacy...',
      phoneNumber: 'Checking privacy...',
      mobile: 'Checking privacy...',
      mobileNumber: 'Checking privacy...',
      tel: 'Checking privacy...',
      telephone: 'Checking privacy...',
      originalContact: 'Checking privacy...',
      showContactInfo: false,
      contactHidden: true
    })) as DirectoryUserWithPrivacy[];
  }

  async loadUsers(showLoader: boolean = true): Promise<void> {
    if (this.isLoadingUsers) return;

    try {
      this.isLoadingUsers = true;

      if (showLoader) {
        this.loading = true;
        this.cdr.detectChanges();
      }

      const users = await this.authService.getAllUsersForDirectory();

      this.ngZone.run(() => {
        this.users = this.maskUsersBeforePrivacyCheck(users || []);
        this.applyFilters();
        this.loading = false;
        this.cdr.detectChanges();
      });

      const usersWithPrivacy = await this.applyContactPrivacy(users || []);

      this.ngZone.run(() => {
        this.users = usersWithPrivacy;
        this.applyFilters();
        this.saveUsersCache();
        this.loading = false;
        this.cdr.detectChanges();
      });
    } catch (error) {
      console.error('Failed to load users:', error);

      this.ngZone.run(() => {
        this.loading = false;
        this.cdr.detectChanges();
      });

      if (showLoader) {
        Swal.fire('Error', 'Failed to load user directory.', 'error');
      }
    } finally {
      this.isLoadingUsers = false;
    }
  }

  private async applyContactPrivacy(users: DirectoryUserData[]): Promise<DirectoryUserWithPrivacy[]> {
    const processedUsers = await Promise.all(
      users.map(async (user) => {
        const rawUser: any = user;

        const realContact =
          rawUser.contact ||
          rawUser.contactNumber ||
          rawUser.contactNo ||
          rawUser.phone ||
          rawUser.phoneNumber ||
          rawUser.mobile ||
          rawUser.mobileNumber ||
          rawUser.tel ||
          rawUser.telephone ||
          rawUser.originalContact ||
          '';

        try {
          const settings = await this.settingsService.getSettings(user.uid);
          const showContactInfo = settings?.showContactInfo === true;

          const displayContact = showContactInfo ? realContact : 'Hidden by user';

          return {
            ...user,
            contact: displayContact,
            contactNumber: displayContact,
            contactNo: displayContact,
            phone: displayContact,
            phoneNumber: displayContact,
            mobile: displayContact,
            mobileNumber: displayContact,
            tel: displayContact,
            telephone: displayContact,
            originalContact: displayContact,
            showContactInfo,
            contactHidden: !showContactInfo
          } as DirectoryUserWithPrivacy;
        } catch {
          return {
            ...user,
            contact: 'Hidden by user',
            contactNumber: 'Hidden by user',
            contactNo: 'Hidden by user',
            phone: 'Hidden by user',
            phoneNumber: 'Hidden by user',
            mobile: 'Hidden by user',
            mobileNumber: 'Hidden by user',
            tel: 'Hidden by user',
            telephone: 'Hidden by user',
            originalContact: 'Hidden by user',
            showContactInfo: false,
            contactHidden: true
          } as DirectoryUserWithPrivacy;
        }
      })
    );

    return processedUsers;
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredUsers = this.users.filter(user => {
      const searchableContact = user.contactHidden ? '' : (user.contact || '');

      const matchesSearch =
        user.fullName.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.uid.toLowerCase().includes(term) ||
        searchableContact.toLowerCase().includes(term);

      const matchesRole =
        this.selectedRole === 'all' || user.role === this.selectedRole;

      const matchesStatus =
        this.selectedStatus === 'all' || user.status === this.selectedStatus;

      return matchesSearch && matchesRole && matchesStatus;
    });

    this.cdr.detectChanges();
  }

  openViewUser(user: DirectoryUserWithPrivacy): void {
    this.ngZone.run(() => {
      this.selectedUser = user;
      this.showViewModal = true;
      this.cdr.detectChanges();
    });
  }

  closeViewModal(): void {
    this.selectedUser = null;
    this.showViewModal = false;
    this.cdr.detectChanges();
  }

  viewPdf(base64: string): void {
    if (!base64) {
      Swal.fire('No File', 'No PDF was uploaded by this official.', 'info');
      return;
    }

    const pdfWindow = window.open('', '_blank');
    if (pdfWindow) {
      pdfWindow.document.write(`
        <html>
          <head>
            <title>Official PDF Preview</title>
            <style>
              html, body {
                margin: 0;
                padding: 0;
                height: 100%;
                overflow: hidden;
              }
              iframe {
                width: 100%;
                height: 100%;
                border: none;
              }
            </style>
          </head>
          <body>
            <iframe src="${base64}"></iframe>
          </body>
        </html>
      `);
      pdfWindow.document.close();
    }
  }

  async deleteUser(user: DirectoryUserData): Promise<void> {
    const result = await Swal.fire({
      title: 'Delete User?',
      text: `This will remove ${user.fullName} from Firestore directory records.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
      await this.authService.deleteUserDirectoryRecord(user.uid, user.role);

      this.showViewModal = false;
      this.selectedUser = null;

      await this.loadUsers();

      Swal.fire(
        'Deleted',
        'User record deleted from Firestore successfully.',
        'success'
      );
    } catch (error) {
      console.error('Delete user failed:', error);
      Swal.fire('Error', 'Failed to delete user record.', 'error');
    }
  }

  getRoleLabel(role: string): string {
    if (role === 'resident') return 'Resident';
    if (role === 'official') return 'Official';
    if (role === 'admin') return 'Administrator';
    return role;
  }

  getStatusClass(status: string): string {
    if (status === 'active') return 'status-active';
    if (status === 'inactive') return 'status-inactive';
    if (status === 'pending') return 'status-pending';
    if (status === 'declined') return 'status-declined';
    return '';
  }

  shouldShowPresence(user: DirectoryUserData): boolean {
    return user.status === 'active' && user.activityStatus !== false;
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('');
  }
}