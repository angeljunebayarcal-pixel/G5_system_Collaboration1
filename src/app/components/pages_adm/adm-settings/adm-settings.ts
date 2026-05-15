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
  loading = true;
  savingToggle = false;

  fullName = '';
  email = '';
  roleLabel = 'Administrator';
  uid = '';

  settings: UserSettingsData = {
    emailNotifications: true,
    smsNotifications: false,
    showContactInfo: false,
    activityStatus: true
  };

  constructor(
    private authService: AuthService,
    private settingsService: SettingsService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private ngZone: NgZone
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      const currentUser = await this.authService.getCurrentUserAsync();

      if (!currentUser) {
        this.loading = false;
        return;
      }

      this.uid = currentUser.uid;
      this.email = currentUser.email || '';

      this.loading = false;
      this.cdr.detectChanges();

      const [profileResult, settingsResult] = await Promise.allSettled([
        this.authService.getProfileData(currentUser.uid),
        this.settingsService.getSettings(currentUser.uid)
      ]);

      if (profileResult.status === 'fulfilled') {
        const profile = profileResult.value;

        this.fullName = profile?.fullName || '';
        this.email = profile?.email || currentUser.email || '';

        if (profile?.role === 'official') {
          this.roleLabel = 'Official';
        } else if (profile?.role === 'admin') {
          this.roleLabel = 'Administrator';
        } else {
          this.roleLabel = 'Resident';
        }
      }

      if (settingsResult.status === 'fulfilled' && settingsResult.value) {
        this.settings = {
          emailNotifications: true,
          smsNotifications: false,
          showContactInfo: settingsResult.value.showContactInfo ?? false,
          activityStatus: settingsResult.value.activityStatus ?? true
        };
      }

      await this.ensureSettingsExist();

      this.authService.updateOwnStatus(
        this.uid,
        this.settings.activityStatus ? 'active' : 'inactive'
      ).catch((err) => console.error('Status update failed:', err));

      this.cdr.detectChanges();

} catch (error: any) {
  const errorCode = error?.code || '';
  const errorMessage = String(error?.message || '').toLowerCase();

  this.loading = false;
  this.cdr.detectChanges();

  if (
    errorCode === 'permission-denied' ||
    errorMessage.includes('missing or insufficient permissions')
  ) {
    console.warn('Settings permission denied. Using default settings until Firestore rules are updated.');
    return;
  }

  console.error('Failed to load settings:', error);
  Swal.fire('Error', 'Failed to load settings.', 'error');
}
  }

  private async ensureSettingsExist(): Promise<void> {
    if (!this.uid) return;

    await this.settingsService.updateSettings(this.uid, {
      showContactInfo: this.settings.showContactInfo,
      activityStatus: this.settings.activityStatus
    });
  }

async saveToggle(field: keyof UserSettingsData): Promise<void> {
  if (this.savingToggle) return;

  if (!this.uid) {
    Swal.fire('Error', 'User account is not ready yet. Please try again.', 'error');
    return;
  }

  if (field === 'emailNotifications' || field === 'smsNotifications') {
    return;
  }

  const previousValue = this.settings[field];
  const currentValue = this.settings[field];

  try {
    this.savingToggle = true;
    this.cdr.detectChanges();

    Swal.fire({
      title: 'Saving...',
      text: 'Updating your setting...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const saveTasks: Promise<any>[] = [
      this.settingsService.updateSettings(this.uid, {
        [field]: currentValue
      })
    ];

    if (field === 'activityStatus') {
      saveTasks.push(
        this.authService.updateOwnStatus(
          this.uid,
          this.settings.activityStatus ? 'active' : 'inactive'
        )
      );
    }

    await Promise.all(saveTasks);

    this.cdr.detectChanges();

    Swal.fire({
      icon: 'success',
      title: 'Setting updated',
      text: 'Your setting has been saved successfully.',
      showConfirmButton: false,
      timer: 1000,
      timerProgressBar: true,
      customClass: {
        popup: 'settings-center-swal-popup'
      }
    });

  } catch (error) {
    console.error('Failed to save toggle:', error);

    if (field === 'showContactInfo') {
      this.settings.showContactInfo = Boolean(previousValue);
    }

    if (field === 'activityStatus') {
      this.settings.activityStatus = Boolean(previousValue);
    }

    this.cdr.detectChanges();

    Swal.fire('Error', 'Failed to save setting.', 'error');

  } finally {
    this.savingToggle = false;
    this.cdr.detectChanges();
  }
}

  private updateAdminProfileCache(): void {
    if (!this.uid) return;

    const cacheKey = `adm_profile_cache_${this.uid}`;
    const existingCache = JSON.parse(localStorage.getItem(cacheKey) || '{}');

    localStorage.setItem(cacheKey, JSON.stringify({
      ...existingCache,
      fullName: this.fullName,
      email: this.email,
      role: existingCache.role || 'admin'
    }));

    window.dispatchEvent(new Event('profile-updated'));
  }

  async editFullName(): Promise<void> {
    const result = await Swal.fire({
      title: 'Edit Full Name',
      input: 'text',
      inputValue: this.fullName,
      inputPlaceholder: 'Enter full name',
      showCancelButton: true,
      confirmButtonText: 'Save',
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return 'Full name is required.';
        }

        return null;
      }
    });

    if (!result.isConfirmed || !result.value?.trim()) return;

    try {
      this.fullName = result.value.trim();

      await this.authService.updateProfileData({
        fullName: this.fullName,
        email: this.email
      });

      this.updateAdminProfileCache();
      this.cdr.detectChanges();

      Swal.fire('Success', 'Full name updated successfully.', 'success');
    } catch (error) {
      console.error('Failed to update full name:', error);
      Swal.fire('Error', 'Failed to update full name.', 'error');
    }
  }

  async changePassword(): Promise<void> {
    await Swal.fire({
      title: 'Change Password',
      html: `
        <div style="width:100%; display:flex; flex-direction:column; gap:10px; margin:0; padding:0;">
          <input id="currentPassword"
                 class="swal2-input"
                 type="password"
                 placeholder="Current password"
                 aria-label="Current password"
                 style="width:100%; margin:0; box-sizing:border-box;">

          <input id="newPassword"
                 class="swal2-input"
                 type="password"
                 placeholder="New password"
                 aria-label="New password"
                 style="width:100%; margin:0; box-sizing:border-box;">

          <input id="confirmPassword"
                 class="swal2-input"
                 type="password"
                 placeholder="Confirm new password"
                 aria-label="Confirm new password"
                 style="width:100%; margin:0; box-sizing:border-box;">
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Change',
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      preConfirm: async () => {
        const currentPassword = (document.getElementById('currentPassword') as HTMLInputElement)?.value.trim();
        const newPassword = (document.getElementById('newPassword') as HTMLInputElement)?.value.trim();
        const confirmPassword = (document.getElementById('confirmPassword') as HTMLInputElement)?.value.trim();

        if (!currentPassword || !newPassword || !confirmPassword) {
          Swal.showValidationMessage('Please fill in all password fields.');
          return false;
        }

        if (newPassword.length < 6) {
          Swal.showValidationMessage('New password must be at least 6 characters.');
          return false;
        }

        if (newPassword !== confirmPassword) {
          Swal.showValidationMessage('New password and confirm password do not match.');
          return false;
        }

        if (currentPassword === newPassword) {
          Swal.showValidationMessage('New password must be different from your current password.');
          return false;
        }

        try {
          await this.authService.changePassword(currentPassword, newPassword);
          return true;
        } catch (error: any) {
          Swal.showValidationMessage(error?.message || 'Failed to change password.');
          return false;
        }
      }
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire('Success', 'Password changed successfully.', 'success');
      }
    });
  }

  async deactivateAccount(): Promise<void> {
    const result = await Swal.fire({
      title: 'Deactivate Account?',
      text: 'Your account will become inactive.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Deactivate'
    });

    if (!result.isConfirmed) return;

    try {
      await this.settingsService.updateSettings(this.uid, {
        activityStatus: false
      });

      this.settings.activityStatus = false;

      await this.authService.deactivateCurrentUserAccount(this.uid);

      Swal.fire('Success', 'Account deactivated successfully.', 'success');
    } catch (error) {
      console.error('Deactivate account error:', error);
      Swal.fire('Error', 'Failed to deactivate account.', 'error');
    }
  }

  async deleteAccount(): Promise<void> {
    const result = await Swal.fire({
      title: 'Delete Account',
      input: 'password',
      inputLabel: 'Enter your current password to continue',
      inputPlaceholder: 'Current password',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#d33'
    });

    if (!result.isConfirmed || !result.value) return;

    try {
      await this.authService.deleteOwnAccount(result.value);
      Swal.fire('Deleted', 'Your account has been deleted.', 'success');
    } catch (error: any) {
      console.error('Delete account error:', error);
      Swal.fire(
        'Error',
        error?.message || 'Failed to delete account.',
        'error'
      );
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.uid && !this.settings.activityStatus) {
        await this.authService.updateOwnStatus(this.uid, 'inactive');
      }

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