import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';

interface DirectoryUserData {
  uid: string;
  fullName: string;
  email: string;
  role: 'resident' | 'official' | 'admin';
  status: 'pending' | 'active' | 'declined' | 'inactive';
  address?: string;
  contact?: string;
  username?: string;
  dob?: string;
  gender?: string;
  validIdFileName?: string;
  validIdFileUrl?: string;
  photoURL?: string;
  createdAt?: any;
}

@Component({
  selector: 'app-userdirectory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './userdirectory.html',
  styleUrl: './userdirectory.scss',
})
export class Userdirectory implements OnInit {
  searchTerm = '';
  selectedRole = 'all';
  selectedStatus = 'all';

  users: DirectoryUserData[] = [];
  filteredUsers: DirectoryUserData[] = [];

  selectedUser: DirectoryUserData | null = null;
  showViewModal = false;
  loading = true;

  constructor(
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  async ngOnInit(): Promise<void> {
    this.loading = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.cdr.detectChanges();
      }
    }, 8000);

    await this.loadUsers();
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

  async deleteUser(user: DirectoryUserData): Promise<void> {
    const result = await Swal.fire({
      title: 'Delete User?',
      text: `This will remove ${user.fullName} from the directory records.`,
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

  getInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('');
  }
}