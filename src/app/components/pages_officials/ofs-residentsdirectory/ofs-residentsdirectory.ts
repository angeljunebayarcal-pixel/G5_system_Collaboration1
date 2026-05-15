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

  private readonly appointmentCacheKey = 'ofs_pending_appointments_cache_v1';
  private readonly certificateCacheKey = 'ofs_pending_certificates_cache_v1';

  ngOnInit() {
    // Show cached data immediately while Firebase is still loading fresh data
    this.loadCachedRequests();

    // Make sure page has an initial rendered state immediately
    this.cdr.detectChanges();

    this.appointmentSub = this.appointmentService.getPendingAppointments().subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.pendingAppointments = this.sortLatestFirst([...(data || [])]);
          this.applyAppointmentFilter();
          this.saveCachedRequests(this.appointmentCacheKey, this.pendingAppointments);

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
          this.pendingCertificates = this.sortLatestFirst([...(data || [])]);
          this.applyCertificateFilter();
          this.saveCachedRequests(this.certificateCacheKey, this.pendingCertificates);

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

  private loadCachedRequests(): void {
    try {
      const cachedAppointments = localStorage.getItem(this.appointmentCacheKey);
      const cachedCertificates = localStorage.getItem(this.certificateCacheKey);

      if (cachedAppointments) {
        this.pendingAppointments = this.sortLatestFirst(JSON.parse(cachedAppointments) || []);
        this.applyAppointmentFilter();
      }

      if (cachedCertificates) {
        this.pendingCertificates = this.sortLatestFirst(JSON.parse(cachedCertificates) || []);
        this.applyCertificateFilter();
      }
    } catch (error) {
      console.error('Failed to load residents directory cache:', error);
      localStorage.removeItem(this.appointmentCacheKey);
      localStorage.removeItem(this.certificateCacheKey);
    }
  }

  private saveCachedRequests(key: string, data: any[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(data || []));
    } catch (error) {
      console.error('Failed to save residents directory cache:', error);
    }
  }

  private sortLatestFirst<T>(items: T[]): T[] {
    return [...items].sort((a: any, b: any) => {
      return this.getRequestTime(b) - this.getRequestTime(a);
    });
  }

  private getRequestTime(item: any): number {
    const dateTime =
      item?.details?.date && item?.details?.time
        ? `${item.details.date} ${item.details.time}`
        : item?.details?.date;

    const candidates = [
      item?.createdAt,
      item?.updatedAt,
      item?.requestedAt,
      item?.submittedAt,
      item?.bookedAt,
      item?.details?.createdAt,
      item?.details?.updatedAt,
      item?.details?.requestedAt,
      item?.details?.submittedAt,
      dateTime
    ];

    for (const value of candidates) {
      const ms = this.toMillis(value);
      if (ms > 0) return ms;
    }

    return 0;
  }

  private toMillis(value: any): number {
    if (!value) return 0;

    if (typeof value === 'number') return value;

    if (value?.toMillis) return value.toMillis();

    if (value?.toDate) return value.toDate().getTime();

    if (typeof value?.seconds === 'number') {
      return value.seconds * 1000;
    }

    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  private removeAppointmentLocal(id: string): void {
    this.pendingAppointments = this.pendingAppointments.filter((app) => app.id !== id);
    this.applyAppointmentFilter();
    this.saveCachedRequests(this.appointmentCacheKey, this.pendingAppointments);
    this.cdr.detectChanges();
  }

  private removeCertificateLocal(id: string): void {
    this.pendingCertificates = this.pendingCertificates.filter((cert) => cert.id !== id);
    this.applyCertificateFilter();
    this.saveCachedRequests(this.certificateCacheKey, this.pendingCertificates);
    this.cdr.detectChanges();
  }

  private updateAppointmentScheduleLocal(id: string, date: string, time: string): void {
    this.pendingAppointments = this.sortLatestFirst(
      this.pendingAppointments.map((app: any) => {
        if (app.id !== id) return app;

        return {
          ...app,
          details: {
            ...(app.details || {}),
            date,
            time
          }
        } as Appointment;
      })
    );

    this.applyAppointmentFilter();
    this.saveCachedRequests(this.appointmentCacheKey, this.pendingAppointments);
    this.cdr.detectChanges();
  }

  private updateCertificateScheduleLocal(id: string, date: string, time: string): void {
    this.pendingCertificates = this.sortLatestFirst(
      this.pendingCertificates.map((cert: any) => {
        if (cert.id !== id) return cert;

        return {
          ...cert,
          details: {
            ...(cert.details || {}),
            date,
            time
          }
        } as Certification;
      })
    );

    this.applyCertificateFilter();
    this.saveCachedRequests(this.certificateCacheKey, this.pendingCertificates);
    this.cdr.detectChanges();
  }

  private async notifyOfficial(message: string): Promise<void> {
    const officialId = this.authService.getCurrentUserId();

    if (!officialId) return;

    await this.notificationService.showNotification(
      message,
      'official',
      officialId
    );
  }

  private async confirmAction(
    title: string,
    text: string,
    confirmButtonText: string,
    confirmButtonColor: string
  ): Promise<boolean> {
    const result = await Swal.fire({
      title,
      text,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText: 'Cancel',
      confirmButtonColor,
      reverseButtons: true
    });

    return result.isConfirmed;
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
      this.filteredAppointments = this.sortLatestFirst([...this.pendingAppointments]);
      return;
    }

    this.filteredAppointments = this.sortLatestFirst(
      this.pendingAppointments.filter((app) => {
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
      })
    );
  }

  applyCertificateFilter(): void {
    const keyword = this.certificateSearch.trim().toLowerCase();

    if (!keyword) {
      this.filteredCertificates = this.sortLatestFirst([...this.pendingCertificates]);
      return;
    }

    this.filteredCertificates = this.sortLatestFirst(
      this.pendingCertificates.filter((cert) => {
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
      })
    );
  }

  showNotification(message: string) {
    this.notificationMessage = message;
    setTimeout(() => {
      this.notificationMessage = null;
      this.cdr.detectChanges();
    }, 3000);
  }

  async approveAppointment(id: string) {
    const confirmed = await this.confirmAction(
      'Approve Appointment?',
      'Are you sure you want to approve this appointment?',
      'Yes, approve',
      '#16a34a'
    );

    if (!confirmed) return;

    const backup = this.pendingAppointments.find((app) => app.id === id);

    try {
      this.removeAppointmentLocal(id);
      this.showNotification('Approving appointment...');

      await this.appointmentService.approveAppointment(id);

      void this.notifyOfficial('Appointment approved successfully.').catch((err) => {
        console.error('Official notification error:', err);
      });

      this.showNotification('Appointment approved.');

      await Swal.fire({
        icon: 'success',
        title: 'Approved',
        text: 'Appointment approved successfully.',
        timer: 1000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Approve appointment error:', error);

      if (backup) {
        this.pendingAppointments = this.sortLatestFirst([
          backup,
          ...this.pendingAppointments.filter((app) => app.id !== id)
        ]);
        this.applyAppointmentFilter();
        this.saveCachedRequests(this.appointmentCacheKey, this.pendingAppointments);
        this.cdr.detectChanges();
      }

      await Swal.fire({
        icon: 'error',
        title: 'Approval Failed',
        text: 'Failed to approve appointment.'
      });
    }
  }

  async cancelAppointment(id: string) {
    const confirmed = await this.confirmAction(
      'Decline Appointment?',
      'Are you sure you want to decline this appointment?',
      'Yes, decline',
      '#dc2626'
    );

    if (!confirmed) return;

    const backup = this.pendingAppointments.find((app) => app.id === id);

    try {
      this.removeAppointmentLocal(id);
      this.showNotification('Declining appointment...');

      await this.appointmentService.cancelAppointment(id);

      void this.notifyOfficial('Appointment declined successfully.').catch((err) => {
        console.error('Official notification error:', err);
      });

      this.showNotification('Appointment declined.');

      await Swal.fire({
        icon: 'success',
        title: 'Declined',
        text: 'Appointment declined successfully.',
        timer: 1000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Cancel appointment error:', error);

      if (backup) {
        this.pendingAppointments = this.sortLatestFirst([
          backup,
          ...this.pendingAppointments.filter((app) => app.id !== id)
        ]);
        this.applyAppointmentFilter();
        this.saveCachedRequests(this.appointmentCacheKey, this.pendingAppointments);
        this.cdr.detectChanges();
      }

      await Swal.fire({
        icon: 'error',
        title: 'Decline Failed',
        text: 'Failed to decline appointment.'
      });
    }
  }

  openReschedule(id: string) {
    this.zone.run(() => {
      const selected = this.pendingAppointments.find((app) => app.id === id);

      this.selectedAppointmentId = id;
      this.newDate = selected?.details?.date || '';
      this.newTime = selected?.details?.time || '';
      this.showAppointmentModal = true;

      this.cdr.detectChanges();
    });
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

    if (!this.newDate || !this.newTime) {
      await Swal.fire({
        icon: 'warning',
        title: 'Missing Schedule',
        text: 'Please select both new date and new time.'
      });
      return;
    }

    const appointmentId = this.selectedAppointmentId;
    const date = this.newDate;
    const time = this.newTime;

    const backup = this.pendingAppointments.find((app) => app.id === appointmentId);
    const oldDate = backup?.details?.date || '';
    const oldTime = backup?.details?.time || '';

    try {
      this.updateAppointmentScheduleLocal(appointmentId, date, time);
      this.closeRescheduleModal();

      const successMessage = `Appointment rescheduled to ${date} at ${time}.`;
      this.showNotification('Saving reschedule...');

      await this.appointmentService.rescheduleAppointment(appointmentId, {
        date,
        time
      });

      void this.notifyOfficial(successMessage).catch((err) => {
        console.error('Official notification error:', err);
      });

      this.showNotification(successMessage);

      await Swal.fire({
        icon: 'success',
        title: 'Rescheduled',
        text: successMessage,
        timer: 1000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Reschedule appointment error:', error);

      if (backup) {
        this.updateAppointmentScheduleLocal(appointmentId, oldDate, oldTime);
      }

      await Swal.fire({
        icon: 'error',
        title: 'Reschedule Failed',
        text: 'Failed to reschedule appointment.'
      });
    }
  }

  async approveCertificate(id: string) {
    const confirmed = await this.confirmAction(
      'Approve Certificate Request?',
      'Are you sure you want to approve this certificate request?',
      'Yes, approve',
      '#16a34a'
    );

    if (!confirmed) return;

    const backup = this.pendingCertificates.find((cert) => cert.id === id);

    try {
      this.removeCertificateLocal(id);
      this.showNotification('Approving certificate request...');

      await this.certificationService.approveCertification(id);

      void this.notifyOfficial('Certificate approved successfully.').catch((err) => {
        console.error('Official notification error:', err);
      });

      this.showNotification('Certificate approved.');

      await Swal.fire({
        icon: 'success',
        title: 'Approved',
        text: 'Certificate approved successfully.',
        timer: 1000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Approve certificate error:', error);

      if (backup) {
        this.pendingCertificates = this.sortLatestFirst([
          backup,
          ...this.pendingCertificates.filter((cert) => cert.id !== id)
        ]);
        this.applyCertificateFilter();
        this.saveCachedRequests(this.certificateCacheKey, this.pendingCertificates);
        this.cdr.detectChanges();
      }

      await Swal.fire({
        icon: 'error',
        title: 'Approval Failed',
        text: 'Failed to approve certificate.'
      });
    }
  }

  async cancelCertificate(id: string) {
    const confirmed = await this.confirmAction(
      'Decline Certificate Request?',
      'Are you sure you want to decline this certificate request?',
      'Yes, decline',
      '#dc2626'
    );

    if (!confirmed) return;

    const backup = this.pendingCertificates.find((cert) => cert.id === id);

    try {
      this.removeCertificateLocal(id);
      this.showNotification('Declining certificate request...');

      await this.certificationService.cancelCertification(id);

      void this.notifyOfficial('Certificate rejected successfully.').catch((err) => {
        console.error('Official notification error:', err);
      });

      this.showNotification('Certificate rejected.');

      await Swal.fire({
        icon: 'success',
        title: 'Rejected',
        text: 'Certificate rejected successfully.',
        timer: 1000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Cancel certificate error:', error);

      if (backup) {
        this.pendingCertificates = this.sortLatestFirst([
          backup,
          ...this.pendingCertificates.filter((cert) => cert.id !== id)
        ]);
        this.applyCertificateFilter();
        this.saveCachedRequests(this.certificateCacheKey, this.pendingCertificates);
        this.cdr.detectChanges();
      }

      await Swal.fire({
        icon: 'error',
        title: 'Rejection Failed',
        text: 'Failed to reject certificate.'
      });
    }
  }

  openCertificateReschedule(id: string) {
    this.zone.run(() => {
      const selected = this.pendingCertificates.find((cert) => cert.id === id);

      this.selectedCertificateId = id;
      this.newCertDate = selected?.details?.date || '';
      this.newCertTime = selected?.details?.time || '';
      this.showCertificateModal = true;

      this.cdr.detectChanges();
    });
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

    if (!this.newCertDate || !this.newCertTime) {
      await Swal.fire({
        icon: 'warning',
        title: 'Missing Schedule',
        text: 'Please select both new date and new time.'
      });
      return;
    }

    const certificateId = this.selectedCertificateId;
    const date = this.newCertDate;
    const time = this.newCertTime;

    const backup = this.pendingCertificates.find((cert) => cert.id === certificateId);
    const oldDate = backup?.details?.date || '';
    const oldTime = backup?.details?.time || '';

    try {
      this.updateCertificateScheduleLocal(certificateId, date, time);
      this.closeCertificateModal();

      const successMessage = `Certificate request rescheduled to ${date} at ${time}.`;
      this.showNotification('Saving reschedule...');

      await this.certificationService.rescheduleCertification(certificateId, {
        date,
        time
      });

      void this.notifyOfficial(successMessage).catch((err) => {
        console.error('Official notification error:', err);
      });

      this.showNotification(successMessage);

      await Swal.fire({
        icon: 'success',
        title: 'Rescheduled',
        text: successMessage,
        timer: 1000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Reschedule certificate error:', error);

      if (backup) {
        this.updateCertificateScheduleLocal(certificateId, oldDate, oldTime);
      }

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