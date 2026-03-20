import { Component, inject } from '@angular/core';
import { AppointmentService } from '../../../services/appointment.service';
import { AuthService } from '../../../services/auth.service';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-bookappointment',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './bookappointment.html',
  styleUrls: ['./bookappointment.scss'],
})
export class Bookappointment {
  details = '';
  selectedOfficial = '';
  selectedDate = '';
  selectedTime = '';
  uploadedFile: File | null = null;
  uploadedFileName = '';
  appointmentSubmitted = false;
  isSubmitting = false;

  private appointmentService = inject(AppointmentService);
  private authService = inject(AuthService);

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
        Swal.fire({
          icon: 'error',
          title: 'Invalid File',
          text: 'PDF files only allowed.'
        });
        this.uploadedFile = null;
        this.uploadedFileName = '';
        target.value = '';
        return;
      }

      if (file.size > 900 * 1024) {
        Swal.fire({
          icon: 'warning',
          title: 'File Too Large',
          text: 'Please upload a file smaller than 900 KB.'
        });
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

  async bookAppointment(form: NgForm) {
    if (this.isSubmitting) return;

    const currentUser = await this.authService.getCurrentUserAsync();

    if (!currentUser) {
      Swal.fire({
        icon: 'info',
        title: 'Not Logged In',
        text: 'Please login first.'
      });
      return;
    }

    if (form.invalid || !this.uploadedFile) {
      form.control.markAllAsTouched();
      Swal.fire({
        icon: 'warning',
        title: 'Incomplete Form',
        text: 'Please complete all fields.'
      });
      return;
    }

    this.isSubmitting = true;

    try {
      const base64File = await this.fileToBase64(this.uploadedFile);

      await this.appointmentService.requestAppointment(
        currentUser.uid,
        currentUser.email || '',
        {
          description: this.details.trim(),
          official: this.selectedOfficial.trim(),
          date: this.selectedDate,
          time: this.selectedTime,
          fileName: this.uploadedFile.name,
          fileUrl: base64File
        }
      );

      this.appointmentSubmitted = true;

      form.resetForm();
      this.uploadedFile = null;
      this.uploadedFileName = '';

      setTimeout(() => {
        this.appointmentSubmitted = false;
      }, 4000);

    } catch (error) {
      console.error('Appointment request failed:', error);

      Swal.fire({
        icon: 'error',
        title: 'Submission Failed',
        text: 'Failed to submit appointment request.'
      });

    } finally {
      this.isSubmitting = false;
    }
  }
}