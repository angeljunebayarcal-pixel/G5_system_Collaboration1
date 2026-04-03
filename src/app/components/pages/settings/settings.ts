import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { AuthService } from '../../../services/auth.service';
import { SettingsService, UserSettingsData } from '../../../services/settings.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss'
})
export class Settings implements OnInit {
  loading = true;

  fullName = '';
  email = '';
  roleLabel = 'Resident';
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
      this.settings = settingsResult.value;
    }

    this.authService.updateOwnStatus(
      this.uid,
      this.settings.activityStatus ? 'active' : 'inactive'
    ).catch((err) => console.error('Status update failed:', err));

    this.cdr.detectChanges();

  } catch (error) {
    console.error('Failed to load settings:', error);
    this.loading = false;
    this.cdr.detectChanges();
    Swal.fire('Error', 'Failed to load settings.', 'error');
  }
}

  async saveToggle(field: keyof UserSettingsData): Promise<void> {
    try {
      if (!this.uid) return;

      await this.settingsService.updateSettings(this.uid, {
        [field]: this.settings[field]
      });

      if (field === 'activityStatus') {
        await this.authService.updateOwnStatus(
          this.uid,
          this.settings.activityStatus ? 'active' : 'inactive'
        );
      }

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Setting updated',
        showConfirmButton: false,
        timer: 1500
      });
    } catch (error) {
      console.error('Failed to save toggle:', error);
      Swal.fire('Error', 'Failed to save setting.', 'error');
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
      this.fullName = result.value.trim();

      await this.authService.updateProfileData({
        fullName: this.fullName,
        email: this.email
      });

      this.cdr.detectChanges();
      Swal.fire('Success', 'Full name updated successfully.', 'success');
    } catch (error) {
      console.error('Failed to update full name:', error);
      Swal.fire('Error', 'Failed to update full name.', 'error');
    }
  }

  async editEmail(): Promise<void> {
    const result = await Swal.fire({
      title: 'Edit Email Address',
      input: 'email',
      inputValue: this.email,
      inputPlaceholder: 'Enter email address',
      showCancelButton: true,
      confirmButtonText: 'Save'
    });

    if (!result.isConfirmed || !result.value?.trim()) return;

    try {
      this.email = result.value.trim();

      await this.authService.updateProfileData({
        fullName: this.fullName,
        email: this.email
      });

      this.cdr.detectChanges();
      Swal.fire('Success', 'Email updated successfully.', 'success');
    } catch (error: any) {
      console.error('Failed to update email:', error);
      Swal.fire(
        'Error',
        error?.message || 'Failed to update email.',
        'error'
      );
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