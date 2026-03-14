import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { CreateProfileService } from '../../../services/createprofile.service';

@Component({
  selector: 'app-ofs-create-residents-profile',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './ofs-create-residents-profile.html',
  styleUrls: ['./ofs-create-residents-profile.scss']
})
export class OfsCreateResidentsProfile {
  fullName = '';
  dob = '';
  gender = '';
  address = '';
  contact = '';
  email = '';
  username = '';
  password = '';
  confirmPassword = '';
  isSubmitting = false;

  private createProfileService = inject(CreateProfileService);

  async createResident() {
    if (
      !this.fullName.trim() ||
      !this.dob ||
      !this.gender ||
      !this.address.trim() ||
      !this.contact.trim() ||
      !this.email.trim() ||
      !this.username.trim() ||
      !this.password ||
      !this.confirmPassword
    ) {
      Swal.fire('Error', 'Please complete all fields', 'error');
      return;
    }

    if (this.password !== this.confirmPassword) {
      Swal.fire('Error', 'Passwords do not match', 'error');
      return;
    }

    if (this.password.length < 6) {
      Swal.fire('Error', 'Password must be at least 6 characters', 'error');
      return;
    }

    this.isSubmitting = true;

    try {
      await this.createProfileService.createResidentProfile(
        {
          fullName: this.fullName.trim(),
          dob: this.dob,
          gender: this.gender,
          address: this.address.trim(),
          contact: this.contact.trim(),
          email: this.email.trim(),
          username: this.username.trim()
        },
        this.password
      );

      Swal.fire('Success', 'Resident account created successfully!', 'success');
      this.resetForm();
    } catch (err: any) {
      console.error('Create resident failed:', err);
      Swal.fire('Error', err?.message || 'Failed to create resident account', 'error');
    } finally {
      this.isSubmitting = false;
    }
  }

  private resetForm() {
    this.fullName = '';
    this.dob = '';
    this.gender = '';
    this.address = '';
    this.contact = '';
    this.email = '';
    this.username = '';
    this.password = '';
    this.confirmPassword = '';
  }
}
