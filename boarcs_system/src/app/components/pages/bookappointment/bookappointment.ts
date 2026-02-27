import { Component } from '@angular/core';
import { AppointmentService } from '../../../core/appointment.service';
import { AuthService } from '../../../core/auth.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  imports: [FormsModule, CommonModule],
  selector: 'app-bookappointment',
  templateUrl: './bookappointment.html',
  styleUrls: ['./bookappointment.scss'],
})
export class Bookappointment {

  // FORM FIELDS
  details = '';
  selectedOfficial = '';
  selectedDate = '';
  selectedTime = '';
  uploadedFile: File | null = null;
  uploadedFileName = '';

  // SUCCESS FRAME CONTROL
  appointmentSubmitted = false;

  constructor(
    private appointmentService: AppointmentService,
    private authService: AuthService
  ) {}

  // FILE UPLOAD HANDLER
  onFileChange(event: any) {
    const file = event.target.files[0];

    if (file) {
      if (file.type !== 'application/pdf') {
        alert('PDF files only allowed.');
        this.uploadedFile = null;
        this.uploadedFileName = '';
        return;
      }

      this.uploadedFile = file;
      this.uploadedFileName = file.name;
    } else {
      this.uploadedFile = null;
      this.uploadedFileName = '';
    }
  }

  // BOOK APPOINTMENT
  bookAppointment() {
    const residentId = this.authService.getCurrentUser()?.id;

    if (!residentId) {
      alert('Please login first');
      return;
    }

    // VALIDATION
    if (
      !this.details.trim() ||
      !this.selectedOfficial.trim() ||
      !this.selectedDate ||
      !this.selectedTime ||
      !this.uploadedFile
    ) {
      alert('Please complete all fields');
      return;
    }

    // SEND REQUEST
    this.appointmentService.requestAppointment(residentId, {
      description: this.details,
      official: this.selectedOfficial,
      date: this.selectedDate,
      time: this.selectedTime,
      fileName: this.uploadedFile.name,
    });

    // SHOW SUCCESS FRAME
    this.appointmentSubmitted = true;

    // AUTO HIDE AFTER 4 SECONDS
    setTimeout(() => {
      this.appointmentSubmitted = false;
    }, 4000);

    // RESET FORM
    this.details = '';
    this.selectedOfficial = '';
    this.selectedDate = '';
    this.selectedTime = '';
    this.uploadedFile = null;
    this.uploadedFileName = '';
  }
}