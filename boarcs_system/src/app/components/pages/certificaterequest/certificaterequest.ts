import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth.service';
import { CertificationService } from '../../../core/certificate.service';

@Component({
  selector: 'app-certificaterequest',
  imports: [FormsModule, CommonModule],
  templateUrl: './certificaterequest.html',
  styleUrls: ['./certificaterequest.scss'],
})
export class Certificaterequest {

  type = '';
  purpose = '';
  date = '';
  time = '';
  uploadedFile: File | null = null;
  uploadedFileName = '';

  // ✅ Success frame flag
  requestSubmitted = false;

  constructor(
    private authService: AuthService,
    private certificationService: CertificationService
  ) {}

  // Handle file change
  onFileChange(event: Event) {
    const target = event.target as HTMLInputElement;

    if (target.files && target.files.length > 0) {
      this.uploadedFile = target.files[0];

      if (this.uploadedFile.type !== 'application/pdf') {
        alert('PDF files only allowed.');
        this.uploadedFile = null;
        this.uploadedFileName = '';
        return;
      }

      this.uploadedFileName = this.uploadedFile.name;
    }
  }

  // Submit request
  submitRequest() {
    const residentId = this.authService.getCurrentUser()?.id;

    if (!residentId) {
      alert('Please login first');
      return;
    }

    if (!this.type || !this.purpose || !this.date || !this.time || !this.uploadedFile) {
      alert('Please complete all fields.');
      return;
    }

    // Send request to service
    this.certificationService.requestCertification(residentId, {
      type: this.type,
      purpose: this.purpose,
      date: this.date,
      time: this.time,
      fileName: this.uploadedFile.name
    });

    // ✅ Show success frame
    this.requestSubmitted = true;

    // Optional: hide frame after 4 seconds
    setTimeout(() => {
      this.requestSubmitted = false;
    }, 4000);

    // Reset form fields
    this.type = '';
    this.purpose = '';
    this.date = '';
    this.time = '';
    this.uploadedFile = null;
    this.uploadedFileName = '';
  }
}