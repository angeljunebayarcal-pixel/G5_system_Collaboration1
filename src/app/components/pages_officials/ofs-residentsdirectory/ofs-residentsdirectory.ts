import { Component, OnInit, OnDestroy, inject, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AppointmentService, Appointment } from '../../../services/appointment.service';
import { CertificationService, Certification } from '../../../services/certificate.service';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
import Swal from 'sweetalert2';

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
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
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
    try {
      await this.appointmentService.approveAppointment(id);

      const officialId = this.authService.getCurrentUserId();
      if (officialId) {
        await this.notificationService.showNotification(
          'Appointment approved successfully.',
          'official',
          officialId
        );
      }

      this.showNotification('Appointment approved.');

      await Swal.fire({
        icon: 'success',
        title: 'Approved',
        text: 'Appointment approved successfully.',
        timer: 1800,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Approve appointment error:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Approval Failed',
        text: 'Failed to approve appointment.'
      });
    }
  }

    async cancelAppointment(id: string) {
    try {
      await this.appointmentService.cancelAppointment(id);

      const officialId = this.authService.getCurrentUserId();
      if (officialId) {
        await this.notificationService.showNotification(
          'Appointment declined successfully.',
          'official',
          officialId
        );
      }

      this.showNotification('Appointment declined.');

      await Swal.fire({
        icon: 'success',
        title: 'Declined',
        text: 'Appointment declined successfully.',
        timer: 1800,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Cancel appointment error:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Decline Failed',
        text: 'Failed to decline appointment.'
      });
    }
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

    try {
      await this.appointmentService.rescheduleAppointment(this.selectedAppointmentId, {
        date: this.newDate,
        time: this.newTime
      });

      const officialId = this.authService.getCurrentUserId();
      if (officialId) {
        await this.notificationService.showNotification(
          `Appointment rescheduled to ${this.newDate} at ${this.newTime}.`,
          'official',
          officialId
        );
      }

      this.showNotification(`Appointment rescheduled to ${this.newDate} at ${this.newTime}.`);

      await Swal.fire({
        icon: 'success',
        title: 'Rescheduled',
        text: `Appointment rescheduled to ${this.newDate} at ${this.newTime}.`,
        timer: 1800,
        showConfirmButton: false
      });

      this.closeRescheduleModal();
    } catch (error) {
      console.error('Reschedule appointment error:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Reschedule Failed',
        text: 'Failed to reschedule appointment.'
      });
    }
  }

   async approveCertificate(id: string) {
    try {
      await this.certificationService.approveCertification(id);

      const officialId = this.authService.getCurrentUserId();
      if (officialId) {
        await this.notificationService.showNotification(
          'Certificate approved successfully.',
          'official',
          officialId
        );
      }

      this.showNotification('Certificate approved.');

      await Swal.fire({
        icon: 'success',
        title: 'Approved',
        text: 'Certificate approved successfully.',
        timer: 1800,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Approve certificate error:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Approval Failed',
        text: 'Failed to approve certificate.'
      });
    }
  }

    async cancelCertificate(id: string) {
    try {
      await this.certificationService.cancelCertification(id);

      const officialId = this.authService.getCurrentUserId();
      if (officialId) {
        await this.notificationService.showNotification(
          'Certificate rejected successfully.',
          'official',
          officialId
        );
      }

      this.showNotification('Certificate rejected.');

      await Swal.fire({
        icon: 'success',
        title: 'Rejected',
        text: 'Certificate rejected successfully.',
        timer: 1800,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Cancel certificate error:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Rejection Failed',
        text: 'Failed to reject certificate.'
      });
    }
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

    try {
      await this.certificationService.rescheduleCertification(this.selectedCertificateId, {
        date: this.newCertDate,
        time: this.newCertTime
      });

      const officialId = this.authService.getCurrentUserId();
      if (officialId) {
        await this.notificationService.showNotification(
          `Certificate request rescheduled to ${this.newCertDate} at ${this.newCertTime}.`,
          'official',
          officialId
        );
      }

      this.showNotification(`Certificate request rescheduled to ${this.newCertDate} at ${this.newCertTime}.`);

      await Swal.fire({
        icon: 'success',
        title: 'Rescheduled',
        text: `Certificate request rescheduled to ${this.newCertDate} at ${this.newCertTime}.`,
        timer: 1800,
        showConfirmButton: false
      });

      this.closeCertificateModal();
    } catch (error) {
      console.error('Reschedule certificate error:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Reschedule Failed',
        text: 'Failed to reschedule certificate request.'
      });
    }
  }

  getEmail(app: any): string {
    return app?.email || app?.residentEmail || '';
  }

 openPdf(base64: string): void {
  if (!base64) {
    Swal.fire('No File', 'No PDF file available.', 'info');
    return;
  }

  const pdfWindow = window.open('', '_blank');

  if (!pdfWindow) {
    Swal.fire('Popup Blocked', 'Please allow popups to view the PDF.', 'warning');
    return;
  }

  pdfWindow.document.write(`
    <html>
      <head>
        <title>PDF Preview</title>
        <style>
          html, body {
            margin: 0;
            padding: 0;
            height: 100%;
            overflow: hidden;
          }
          iframe {
            width: 100%;
            height: 100%;
            border: none;
          }
        </style>
      </head>
      <body>
        <iframe src="${base64}"></iframe>
      </body>
    </html>
  `);

  pdfWindow.document.close();
}
}