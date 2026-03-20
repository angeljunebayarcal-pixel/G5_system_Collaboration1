import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

import { AuthService } from '../../../services/auth.service';
import { SettingsService, UserSettingsData } from '../../../services/settings.service';

@Component({
  selector: 'app-adm-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './adm-settings.html',
  styleUrl: './adm-settings.scss',
})
export class AdmSettings implements OnInit {
  uid = '';
  fullName = '';
  email = '';
  roleLabel = 'Administrator';

  settings: UserSettingsData = {
    emailNotifications: true,
    smsNotifications: false,
    showContactInfo: false,
    activityStatus: true
  };

  loading = true;
  saving = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private settingsService: SettingsService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  async ngOnInit(): Promise<void> {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      const user = await this.authService.getCurrentUserAsync();

      if (!user) {
        this.ngZone.run(() => {
          this.router.navigate(['/login']);
        });
        return;
      }

      this.uid = user.uid;

      const [profile, settings] = await Promise.all([
        this.authService.getProfileData(user.uid),
        this.settingsService.getSettings(user.uid)
      ]);

      this.ngZone.run(() => {
        this.fullName = profile?.fullName || '';
        this.email = profile?.email || user.email || '';
        this.roleLabel = 'Administrator';
        this.settings = settings;
        this.loading = false;
        this.cdr.detectChanges();
      });
    } catch (error) {
      console.error('Admin settings load error:', error);

      this.ngZone.run(() => {
        this.loading = false;
        this.cdr.detectChanges();
      });

      Swal.fire('Error', 'Failed to load settings.', 'error');
    }
  }

  async saveToggle(field: keyof UserSettingsData): Promise<void> {
    if (!this.uid) return;

    try {
      this.saving = true;
      this.cdr.detectChanges();

      await this.settingsService.updateSettings(this.uid, {
        [field]: this.settings[field]
      });
    } catch (error) {
      console.error('Settings save error:', error);
      Swal.fire('Error', 'Failed to save setting.', 'error');
    } finally {
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  async editFullName(): Promise<void> {
    const result = await Swal.fire({
      title: 'Edit Full Name',
      input: 'text',
      inputValue: this.fullName,
      inputPlaceholder: 'Enter full name',
      showCancelButton: true,
      confirmButtonText: 'Save'
    });

    if (!result.isConfirmed || !result.value?.trim()) return;

    try {
      await this.authService.updateProfileData(
        { fullName: result.value.trim() },
        this.uid
      );

      this.fullName = result.value.trim();
      this.cdr.detectChanges();

      Swal.fire('Saved', 'Full name updated successfully.', 'success');
    } catch (error) {
      console.error('Update full name error:', error);
      Swal.fire('Error', 'Failed to update full name.', 'error');
    }
  }

  async editEmail(): Promise<void> {
    const result = await Swal.fire({
      title: 'Edit Email Address',
      input: 'email',
      inputValue: this.email,
      inputPlaceholder: 'Enter new email',
      showCancelButton: true,
      confirmButtonText: 'Save'
    });

    if (!result.isConfirmed || !result.value?.trim()) return;

    try {
      await this.authService.updateProfileData(
        { email: result.value.trim() },
        this.uid
      );

      this.email = result.value.trim();
      this.cdr.detectChanges();

      Swal.fire('Saved', 'Email updated successfully.', 'success');
    } catch (error) {
      console.error('Update email error:', error);
      Swal.fire('Error', 'Failed to update email.', 'error');
    }
  }

  async changePassword(): Promise<void> {
    const { value: formValues } = await Swal.fire({
      title: 'Change Password',
      html: `
        <input id="currentPassword" class="swal2-input" type="password" placeholder="Current password">
        <input id="newPassword" class="swal2-input" type="password" placeholder="New password">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Change',
      preConfirm: () => {
        const currentPassword = (document.getElementById('currentPassword') as HTMLInputElement)?.value;
        const newPassword = (document.getElementById('newPassword') as HTMLInputElement)?.value;

        if (!currentPassword || !newPassword) {
          Swal.showValidationMessage('Please fill in both password fields.');
          return;
        }

        return { currentPassword, newPassword };
      }
    });

    if (!formValues) return;

    try {
      await this.authService.changePassword(
        formValues.currentPassword,
        formValues.newPassword
      );
      Swal.fire('Success', 'Password changed successfully.', 'success');
    } catch (error: any) {
      console.error('Change password error:', error);
      Swal.fire('Error', error?.message || 'Failed to change password.', 'error');
    }
  }

  async deactivateAccount(): Promise<void> {
    const result = await Swal.fire({
      title: 'Deactivate Account?',
      text: 'This is currently a placeholder action.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Deactivate'
    });

    if (!result.isConfirmed) return;

    Swal.fire('Done', 'Deactivate account request submitted.', 'success');
  }

  async deleteAccount(): Promise<void> {
    const result = await Swal.fire({
      title: 'Delete Account?',
      text: 'This is currently a placeholder action.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete'
    });

    if (!result.isConfirmed) return;

    Swal.fire('Notice', 'Delete account flow is not yet fully implemented.', 'info');
  }

  async logout(): Promise<void> {
    try {
      await this.authService.logout();
      this.ngZone.run(() => {
        this.router.navigate(['/login']);
      });
    } catch (error) {
      console.error('Logout error:', error);
      Swal.fire('Error', 'Failed to logout.', 'error');
    }
  }
}