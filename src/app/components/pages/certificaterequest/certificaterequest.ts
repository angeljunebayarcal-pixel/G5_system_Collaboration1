import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { CertificationService } from '../../../services/certificate.service';

@Component({
  selector: 'app-certificaterequest',
  standalone: true,
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
  requestSubmitted = false;
  isSubmitting = false;

  private authService = inject(AuthService);
  private certificationService = inject(CertificationService);

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);

      reader.readAsDataURL(file);
    });
  }

  onFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0] || null;

    if (file) {
      if (file.type !== 'application/pdf') {
        alert('PDF files only allowed.');
        this.uploadedFile = null;
        this.uploadedFileName = '';
        target.value = '';
        return;
      }

      if (file.size > 900 * 1024) {
        alert('PDF file is too large. Please upload a file smaller than 900 KB.');
        this.uploadedFile = null;
        this.uploadedFileName = '';
        target.value = '';
        return;
      }

      this.uploadedFile = file;
      this.uploadedFileName = file.name;
    } else {
      this.uploadedFile = null;
      this.uploadedFileName = '';
    }
  }

  async submitRequest(form: NgForm) {
    if (this.isSubmitting) return;

    const currentUser = await this.authService.getCurrentUserAsync();

    if (!currentUser) {
      alert('Please login first.');
      return;
    }

    if (form.invalid || !this.uploadedFile) {
      form.control.markAllAsTouched();
      alert('Please complete all fields.');
      return;
    }

    this.isSubmitting = true;

    try {
      const base64File = await this.fileToBase64(this.uploadedFile);

      await this.certificationService.requestCertification(currentUser.uid, {
        type: this.type,
        purpose: this.purpose.trim(),
        date: this.date,
        time: this.time,
        fileName: this.uploadedFile.name,
        fileUrl: base64File
      });

      this.requestSubmitted = true;

      form.resetForm();
      this.uploadedFile = null;
      this.uploadedFileName = '';

      setTimeout(() => {
        this.requestSubmitted = false;
      }, 4000);
    } catch (error) {
      console.error('Certificate request failed:', error);
      alert('Failed to submit certificate request.');
    } finally {
      this.isSubmitting = false;
    }
  }
}