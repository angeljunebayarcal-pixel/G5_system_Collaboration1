import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService, DirectoryUserData } from '../../../services/auth.service';
import Swal from 'sweetalert2';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';

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

  users: DirectoryUserData[] = [];
  filteredUsers: DirectoryUserData[] = [];

  selectedUser: DirectoryUserData | null = null;
  showViewModal = false;
  loading = true;

  private routerSub?: Subscription;

  constructor(
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadUsers();

    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(async () => {
        if (this.router.url.includes('/userdirectory')) {
          await this.loadUsers();
        }
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  async loadUsers(): Promise<void> {
    try {
      this.loading = true;
      this.cdr.detectChanges();

      const users = await this.authService.getAllUsersForDirectory();

      this.ngZone.run(() => {
        this.users = users || [];
        this.applyFilters();
        this.loading = false;
        this.cdr.detectChanges();
      });
    } catch (error) {
      console.error('Failed to load users:', error);

      this.ngZone.run(() => {
        this.users = [];
        this.filteredUsers = [];
        this.loading = false;
        this.cdr.detectChanges();
      });

      Swal.fire('Error', 'Failed to load user directory.', 'error');
    }
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredUsers = this.users.filter(user => {
      const matchesSearch =
        user.fullName.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.uid.toLowerCase().includes(term);

      const matchesRole =
        this.selectedRole === 'all' || user.role === this.selectedRole;

      const matchesStatus =
        this.selectedStatus === 'all' || user.status === this.selectedStatus;

      return matchesSearch && matchesRole && matchesStatus;
    });

    this.cdr.detectChanges();
  }

  openViewUser(user: DirectoryUserData): void {
    this.selectedUser = user;
    this.showViewModal = true;
    this.cdr.detectChanges();
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