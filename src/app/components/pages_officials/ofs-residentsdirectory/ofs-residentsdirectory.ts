import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  NgZone,
  ChangeDetectorRef
} from '@angular/core';
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

  filteredAppointments: Appointment[] = [];
  filteredCertificates: Certification[] = [];

  notificationMessage: string | null = null;
  appointmentSearch = '';
  certificateSearch = '';

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
  private cdr = inject(ChangeDetectorRef);

  private appointmentSub?: Subscription;
  private certificateSub?: Subscription;

  ngOnInit() {
    // Make sure page has an initial rendered state immediately
    this.filteredAppointments = [];
    this.filteredCertificates = [];
    this.cdr.detectChanges();

    this.appointmentSub = this.appointmentService.getPendingAppointments().subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.pendingAppointments = [...data];
          this.applyAppointmentFilter();

          // Force immediate repaint so content appears without needing any click
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Appointments read error:', err);
      }
    });

    this.certificateSub = this.certificationService.getPendingCertifications().subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.pendingCertificates = [...data];
          this.applyCertificateFilter();

          // Force immediate repaint so content appears without needing any click
          this.cdr.detectChanges();
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

  onAppointmentSearchChange(value: string): void {
    this.appointmentSearch = value || '';
    this.applyAppointmentFilter();
    this.cdr.detectChanges();
  }

  onCertificateSearchChange(value: string): void {
    this.certificateSearch = value || '';
    this.applyCertificateFilter();
    this.cdr.detectChanges();
  }

  applyAppointmentFilter(): void {
    const keyword = this.appointmentSearch.trim().toLowerCase();

    if (!keyword) {
      this.filteredAppointments = [...this.pendingAppointments];
      return;
    }

    this.filteredAppointments = this.pendingAppointments.filter((app) => {
      const residentId = String(app.residentId || '').toLowerCase();
      const email = String(this.getEmail(app) || '').toLowerCase();
      const date = String(app.details?.date || '').toLowerCase();
      const time = String(app.details?.time || '').toLowerCase();
      const purpose = String(app.details?.description || '').toLowerCase();
      const fileName = String(app.details?.fileName || '').toLowerCase();

      return (
        residentId.includes(keyword) ||
        email.includes(keyword) ||
        date.includes(keyword) ||
        time.includes(keyword) ||
        purpose.includes(keyword) ||
        fileName.includes(keyword)
      );
    });
  }

  applyCertificateFilter(): void {
    const keyword = this.certificateSearch.trim().toLowerCase();

    if (!keyword) {
      this.filteredCertificates = [...this.pendingCertificates];
      return;
    }

    this.filteredCertificates = this.pendingCertificates.filter((cert) => {
      const residentId = String(cert.residentId || '').toLowerCase();
      const email = String(this.getEmail(cert) || '').toLowerCase();
      const certificateType = String(cert.details?.type || '').toLowerCase();
      const date = String(cert.details?.date || '').toLowerCase();
      const time = String(cert.details?.time || '').toLowerCase();
      const purpose = String(cert.details?.purpose || '').toLowerCase();
      const fileName = String(cert.details?.fileName || '').toLowerCase();

      return (
        residentId.includes(keyword) ||
        email.includes(keyword) ||
        certificateType.includes(keyword) ||
        date.includes(keyword) ||
        time.includes(keyword) ||
        purpose.includes(keyword) ||
        fileName.includes(keyword)
      );
    });
  }

  showNotification(message: string) {
    this.notificationMessage = message;
    setTimeout(() => {
      this.notificationMessage = null;
      this.cdr.detectChanges();
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
      this.cdr.detectChanges();

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
      this.cdr.detectChanges();

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
    this.cdr.detectChanges();
  }

  closeRescheduleModal() {
    this.showAppointmentModal = false;
    this.selectedAppointmentId = null;
    this.newDate = '';
    this.newTime = '';
    this.cdr.detectChanges();
  }

  async saveReschedule() {
    if (!this.selectedAppointmentId) return;

    try {
      await this.appointmentService.rescheduleAppointment(this.selectedAppointmentId, {
        date: this.newDate,
        time: this.newTime
      });

      const successMessage = `Appointment rescheduled to ${this.newDate} at ${this.newTime}.`;

      const officialId = this.authService.getCurrentUserId();
      if (officialId) {
        await this.notificationService.showNotification(
          successMessage,
          'official',
          officialId
        );
      }

      this.showNotification(successMessage);

      // Close modal first so it disappears immediately after save
      this.closeRescheduleModal();

      await Swal.fire({
        icon: 'success',
        title: 'Rescheduled',
        text: successMessage,
        timer: 1800,
        showConfirmButton: false
      });
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
      this.cdr.detectChanges();

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
      this.cdr.detectChanges();

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
    this.cdr.detectChanges();
  }

  closeCertificateModal() {
    this.showCertificateModal = false;
    this.selectedCertificateId = null;
    this.newCertDate = '';
    this.newCertTime = '';
    this.cdr.detectChanges();
  }

  async saveCertificateReschedule() {
    if (!this.selectedCertificateId) return;

    try {
      await this.certificationService.rescheduleCertification(this.selectedCertificateId, {
        date: this.newCertDate,
        time: this.newCertTime
      });

      const successMessage = `Certificate request rescheduled to ${this.newCertDate} at ${this.newCertTime}.`;

      const officialId = this.authService.getCurrentUserId();
      if (officialId) {
        await this.notificationService.showNotification(
          successMessage,
          'official',
          officialId
        );
      }

      this.showNotification(successMessage);

      // Close modal first so it disappears immediately after save
      this.closeCertificateModal();

      await Swal.fire({
        icon: 'success',
        title: 'Rescheduled',
        text: successMessage,
        timer: 1800,
        showConfirmButton: false
      });
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