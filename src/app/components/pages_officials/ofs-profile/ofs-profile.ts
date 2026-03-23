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
  loading = true;
  saving = false;
  uploadingImage = false;

  personal = {
    fullname: '',
    address: '',
    contact: '',
    email: '',
    role: 'Official',
    username: '',
    dob: '',
    gender: '',
    photoURL: ''
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

  get initials(): string {
    const name = this.personal.fullname?.trim() || 'User';
    const parts = name.split(' ').filter(Boolean);

    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  private getProfileCacheKey(): string | null {
    const uid = this.authService.getCurrentUserId();
    return uid ? `ofs_profile_cache_${uid}` : null;
  }

  async loadProfile() {
    try {
      this.loading = true;

      const cacheKey = this.getProfileCacheKey();
      if (cacheKey) {
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
          const profile = JSON.parse(cached);
          this.applyProfile(profile);
          this.loading = false;
          this.cdr.detectChanges();
        }
      }

      const profile = await this.authService.getProfileData();

      if (profile) {
        this.applyProfile(profile);

        const freshCacheKey = this.getProfileCacheKey();
        if (freshCacheKey) {
          localStorage.setItem(freshCacheKey, JSON.stringify(profile));
        }
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

  private applyProfile(profile: any) {
    this.personal.fullname = profile.fullName || '';
    this.personal.address = profile.address || '';
    this.personal.contact = profile.contact || '';
    this.personal.email = profile.email || '';
    this.personal.role =
      profile.role === 'admin'
        ? 'Admin'
        : profile.role === 'official'
        ? 'Official'
        : 'Resident';

    this.personal.username = profile.username || '';
    this.personal.dob = profile.dob || '';
    this.personal.gender = profile.gender || '';
    this.personal.photoURL = profile.photoURL || '';
  }

  async onProfileImageChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0] || null;

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire('Invalid File', 'Please upload an image file only.', 'warning');
      target.value = '';
      return;
    }

    if (file.size > 900 * 1024) {
      Swal.fire('File Too Large', 'Profile image must be 900KB or below.', 'warning');
      target.value = '';
      return;
    }

    try {
      this.uploadingImage = true;

      Swal.fire({
        title: 'Processing image...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const compressedFile = await this.compressImage(file, 160, 0.45);
      const base64 = await this.convertToBase64(compressedFile);

      this.personal.photoURL = base64;

      await this.authService.saveProfileImageBase64(base64);

      const cacheKey = this.getProfileCacheKey();
      if (cacheKey) {
        const cached = JSON.parse(localStorage.getItem(cacheKey) || '{}');
        cached.photoURL = base64;
        localStorage.setItem(cacheKey, JSON.stringify(cached));
      }

      window.dispatchEvent(new Event('profile-updated'));

      Swal.close();
      Swal.fire({
        title: 'Saved',
        icon: 'success',
        timer: 1000,
        showConfirmButton: false
      });

    } catch (err: any) {
      Swal.close();
      Swal.fire('Error', err?.message || 'Failed to save profile image.', 'error');
    } finally {
      this.uploadingImage = false;
      target.value = '';
      this.cdr.detectChanges();
    }
  }

  async savePersonal() {
    if (this.saving || this.uploadingImage) return;

    if (!this.personal.fullname.trim() || !this.personal.email.trim()) {
      Swal.fire('Missing Fields', 'Full name and email are required.', 'warning');
      return;
    }

    try {
      this.saving = true;

      Swal.fire({
        title: 'Saving...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      await this.authService.updateProfileData({
        fullName: this.personal.fullname,
        address: this.personal.address,
        contact: this.personal.contact,
        email: this.personal.email,
        username: this.personal.username,
        dob: this.personal.dob,
        gender: this.personal.gender
      });

      const cacheKey = this.getProfileCacheKey();
      if (cacheKey) {
        localStorage.setItem(cacheKey, JSON.stringify({
          fullName: this.personal.fullname,
          address: this.personal.address,
          contact: this.personal.contact,
          email: this.personal.email,
          username: this.personal.username,
          dob: this.personal.dob,
          gender: this.personal.gender,
          photoURL: this.personal.photoURL,
          role: this.personal.role.toLowerCase()
        }));
      }

      window.dispatchEvent(new Event('profile-updated'));

      Swal.close();
      Swal.fire({
        title: 'Saved',
        icon: 'success',
        timer: 1000,
        showConfirmButton: false
      });

    } catch (err: any) {
      Swal.close();
      Swal.fire('Error', err?.message || 'Failed to update profile', 'error');
    } finally {
      this.saving = false;
      this.cdr.detectChanges();
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
      Swal.fire({
        title: 'Updating...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      await this.authService.changePassword(
        this.account.currentPassword,
        this.account.newPassword
      );

      Swal.close();
      Swal.fire('Success', 'Password updated.', 'success');

      this.account = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      };

      this.cdr.detectChanges();
    } catch (err: any) {
      Swal.close();
      Swal.fire('Error', err?.message || 'Failed to update password', 'error');
    }
  }

  private compressImage(file: File, maxWidth = 160, quality = 0.45): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const img = new Image();

        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('Canvas error');

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(blob => {
            if (!blob) return reject('Compression failed');
            resolve(new File([blob], 'profile.jpg', { type: 'image/jpeg' }));
          }, 'image/jpeg', quality);
        };

        img.src = reader.result as string;
      };

      reader.readAsDataURL(file);
    });
  }

  private convertToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}