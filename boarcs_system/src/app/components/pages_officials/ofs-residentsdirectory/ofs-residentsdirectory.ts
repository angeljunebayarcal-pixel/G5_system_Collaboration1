import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Appointment, AppointmentService } from '../../../core/appointment.service';
import { Certification, CertificationService } from '../../../core/certificate.service';

@Component({
  selector: 'app-ofs-residentsdirectory',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './ofs-residentsdirectory.html',
  styleUrls: ['./ofs-residentsdirectory.scss'],
})
export class OfsResidentsdirectory implements OnInit {
  pendingAppointments: Appointment[] = [];
  pendingCertificates: Certification[] = [];
  
  // Notification popup
  notificationMessage: string | null = null;

  // Appointment modal
  showAppointmentModal = false;
  selectedAppointmentId: number | null = null;
  newDate = '';
  newTime = '';

  // Certificate modal
  showCertificateModal = false;
  selectedCertificateId: number | null = null;
  newCertDate = '';
  newCertTime = '';

  constructor(
    private appointmentService: AppointmentService,
    private certificationService: CertificationService
  ) {}

  ngOnInit() {
    this.loadPending();
  }

  loadPending() {
    this.pendingAppointments = this.appointmentService.getPendingAppointments();
    this.pendingCertificates = this.certificationService.getPendingCertifications();
  }

  // --- Notification Activity ---
  showNotification(message: string) {
    this.notificationMessage = message;
    setTimeout(() => {
      this.notificationMessage = null;
    }, 3000); // auto-hide after 3 seconds
  }

  // --- Appointment Actions ---
  approveAppointment(id: number) {
    this.appointmentService.approveAppointment(id);
    this.showNotification('Appointment successfully approved.');
    this.loadPending();
  }

  cancelAppointment(id: number) {
    this.appointmentService.cancelAppointment(id);
    this.showNotification('Appointment successfully declined.');
    this.loadPending();
  }

  openReschedule(id: number) {
    this.selectedAppointmentId = id;
    this.showAppointmentModal = true;
  }

  closeRescheduleModal() {
    this.showAppointmentModal = false;
    this.selectedAppointmentId = null;
    this.newDate = '';
    this.newTime = '';
  }

  saveReschedule() {
    if (!this.newDate || !this.newTime || this.selectedAppointmentId === null) {
      alert('Please select date and time.');
      return;
    }
    this.appointmentService.rescheduleAppointment(this.selectedAppointmentId, {
      date: this.newDate,
      time: this.newTime
    });
    this.showNotification('Appointment successfully rescheduled.');
    this.closeRescheduleModal();
    this.loadPending();
  }

  // --- Certificate Actions ---
  approveCertificate(id: number) {
    this.certificationService.approveCertification(id);
    this.showNotification('Certificate successfully approved.');
    this.loadPending();
  }

  cancelCertificate(id: number) {
    this.certificationService.cancelCertification(id);
    this.showNotification('Certificate successfully rejected.');
    this.loadPending();
  }

  openCertificateReschedule(id: number) {
    this.selectedCertificateId = id;
    this.showCertificateModal = true;
  }

  closeCertificateModal() {
    this.showCertificateModal = false;
    this.selectedCertificateId = null;
    this.newCertDate = '';
    this.newCertTime = '';
  }

  saveCertificateReschedule() {
    if (!this.newCertDate || !this.newCertTime || this.selectedCertificateId === null) {
      alert('Please select date and time.');
      return;
    }
    this.certificationService.rescheduleCertification(this.selectedCertificateId, {
      date: this.newCertDate,
      time: this.newCertTime
    });
    this.showNotification('Certificate successfully rescheduled.');
    this.closeCertificateModal();
    this.loadPending();
  }
}