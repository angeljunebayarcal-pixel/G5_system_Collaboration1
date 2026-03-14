import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-ofs-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ofs-profile.html',
  styleUrls: ['./ofs-profile.scss']
})
export class OfsProfile implements OnInit {
  activeTab: string = 'personal';
  loading = true;

  personal = {
    fullname: '',
    address: '',
    contact: '',
    email: '',
    role: 'Officials'
  };

  account = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  constructor(
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.loadProfile();
  }

  switchTab(event: Event, tab: string) {
    event.preventDefault();
    event.stopPropagation();
    this.activeTab = tab;
    this.cdr.detectChanges();
  }

  async loadProfile() {
    try {
      this.loading = true;

      const profile = await this.authService.getProfileData();

      if (profile) {
        this.personal.fullname = profile.fullName || '';
        this.personal.address = profile.address || '';
        this.personal.contact = profile.contact || '';
        this.personal.email = profile.email || '';
        this.personal.role = 'Officials';
      }

      this.loading = false;
      this.cdr.detectChanges();
    } catch (err: any) {
      console.error(err);
      this.loading = false;
      this.cdr.detectChanges();
      Swal.fire('Error', err?.message || 'Failed to load profile', 'error');
    }
  }

  async savePersonal() {
    try {
      await this.authService.updateProfileData({
        fullName: this.personal.fullname,
        address: this.personal.address,
        contact: this.personal.contact,
        email: this.personal.email
      });

      Swal.fire('Success', 'Profile updated successfully.', 'success');
      await this.loadProfile();
    } catch (err: any) {
      console.error(err);
      Swal.fire('Error', err?.message || 'Failed to update profile', 'error');
    }
  }

  async saveAccount() {
    if (!this.account.currentPassword || !this.account.newPassword || !this.account.confirmPassword) {
      Swal.fire('Error', 'Please complete all password fields.', 'error');
      return;
    }

    if (this.account.newPassword !== this.account.confirmPassword) {
      Swal.fire('Error', 'Passwords do not match.', 'error');
      return;
    }

    try {
      await this.authService.changePassword(
        this.account.currentPassword,
        this.account.newPassword
      );

      Swal.fire('Success', 'Password updated successfully.', 'success');

      this.account.currentPassword = '';
      this.account.newPassword = '';
      this.account.confirmPassword = '';
      this.cdr.detectChanges();
    } catch (err: any) {
      console.error(err);
      Swal.fire('Error', err?.message || 'Failed to update password', 'error');
    }
  }
}