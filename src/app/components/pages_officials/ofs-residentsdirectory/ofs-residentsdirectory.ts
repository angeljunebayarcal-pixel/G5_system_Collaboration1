import { Component, OnInit, OnDestroy, inject, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AppointmentService, Appointment } from '../../../services/appointment.service';
import { CertificationService, Certification } from '../../../services/certificate.service';

@Component({
  selector: 'app-ofs-residentsdirectory',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './ofs-residentsdirectory.html',
  styleUrls: ['./ofs-residentsdirectory.scss']
})
export class OfsResidentsdirectory implements OnInit, OnDestroy {
  pendingAppointments: Appointment[] = [];
  pendingCertificates: Certification[] = [];
  notificationMessage: string | null = null;

  showAppointmentModal = false;
  selectedAppointmentId: string | null = null;
  newDate = '';
  newTime = '';

  showCertificateModal = false;
  selectedCertificateId: string | null = null;
  newCertDate = '';
  newCertTime = '';

  private appointmentService = inject(AppointmentService);
  private certificationService = inject(CertificationService);
  private zone = inject(NgZone);

  private appointmentSub?: Subscription;
  private certificateSub?: Subscription;

  ngOnInit() {
    this.appointmentSub = this.appointmentService.getPendingAppointments().subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.pendingAppointments = data;
        });
      },
      error: (err) => {
        console.error('Appointments read error:', err);
      }
    });

    this.certificateSub = this.certificationService.getPendingCertifications().subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.pendingCertificates = data;
        });
      },
      error: (err) => {
        console.error('Certifications read error:', err);
      }
    });
  }

  ngOnDestroy() {
    this.appointmentSub?.unsubscribe();
    this.certificateSub?.unsubscribe();
  }

  showNotification(message: string) {
    this.notificationMessage = message;
    setTimeout(() => {
      this.notificationMessage = null;
    }, 3000);
  }

  async approveAppointment(id: string) {
    await this.appointmentService.approveAppointment(id);
    this.showNotification('Appointment approved.');
  }

  async cancelAppointment(id: string) {
    await this.appointmentService.cancelAppointment(id);
    this.showNotification('Appointment declined.');
  }

  openReschedule(id: string) {
    this.selectedAppointmentId = id;
    this.showAppointmentModal = true;
  }

  closeRescheduleModal() {
    this.showAppointmentModal = false;
    this.selectedAppointmentId = null;
    this.newDate = '';
    this.newTime = '';
  }

  async saveReschedule() {
    if (!this.selectedAppointmentId) return;

    await this.appointmentService.rescheduleAppointment(this.selectedAppointmentId, {
      date: this.newDate,
      time: this.newTime
    });

    this.showNotification(`Appointment rescheduled to ${this.newDate} at ${this.newTime}.`);
    this.closeRescheduleModal();
  }

  async approveCertificate(id: string) {
    await this.certificationService.approveCertification(id);
    this.showNotification('Certificate approved.');
  }

  async cancelCertificate(id: string) {
    await this.certificationService.cancelCertification(id);
    this.showNotification('Certificate rejected.');
  }

  openCertificateReschedule(id: string) {
    this.selectedCertificateId = id;
    this.showCertificateModal = true;
  }

  closeCertificateModal() {
    this.showCertificateModal = false;
    this.selectedCertificateId = null;
    this.newCertDate = '';
    this.newCertTime = '';
  }

  async saveCertificateReschedule() {
    if (!this.selectedCertificateId) return;

    await this.certificationService.rescheduleCertification(this.selectedCertificateId, {
      date: this.newCertDate,
      time: this.newCertTime
    });

    this.showNotification(`Certificate request rescheduled to ${this.newCertDate} at ${this.newCertTime}.`);
    this.closeCertificateModal();
  }
}