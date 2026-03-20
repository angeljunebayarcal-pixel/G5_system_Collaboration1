import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

import { Appointment, AppointmentService } from '../../../services/appointment.service';
import { Certification, CertificationService } from '../../../services/certificate.service';
import { AuthService } from '../../../services/auth.service';
import {
  AuditLog,
  OfficialDashboardService
} from '../../../services/ofs-dashboard.service';
import { NotificationService } from '../../../services/notification.service';

type RecentApplicationItem = {
  id: string;
  residentId: string;
  residentName: string;
  document: string;
  status: string;
  type: 'appointment' | 'certificate';
  createdAt: any;
  createdAtMs: number;
};

@Component({
  selector: 'app-ofs-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ofs-dashboard.html',
  styleUrls: ['./ofs-dashboard.scss'],
})
export class OfsDashboard implements OnInit, OnDestroy {
  pendingCertsCount = 0;
  todaysAppointmentsCount = 0;
  registeredResidentsCount = 0;
  approvedAppointmentsToday = 0;

  recentApplications: RecentApplicationItem[] = [];
  allApplications: RecentApplicationItem[] = [];
  auditLogs: AuditLog[] = [];

  showAllRequestsModal = false;
  showAuditLogsModal = false;

  private subs: Subscription[] = [];
  private latestAppointments: Appointment[] = [];
  private latestCertifications: Certification[] = [];

  officialId = '';
  officialName = 'Official User';

  constructor(
    private router: Router,
    private authService: AuthService,
    private appointmentService: AppointmentService,
    private certificationService: CertificationService,
    private officialDashboardService: OfficialDashboardService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    const user = await this.authService.getCurrentUserAsync();

    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    this.officialId = user.uid;

    const profile = await this.authService.getProfileData(user.uid);
    this.officialName = profile?.fullName || 'Official User';

    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.clearSubscriptions();
  }

  private clearSubscriptions(): void {
    this.subs.forEach((sub) => sub.unsubscribe());
    this.subs = [];
  }

  private resetDashboard(): void {
    this.pendingCertsCount = 0;
    this.todaysAppointmentsCount = 0;
    this.registeredResidentsCount = 0;
    this.approvedAppointmentsToday = 0;

    this.recentApplications = [];
    this.allApplications = [];
    this.auditLogs = [];

    this.latestAppointments = [];
    this.latestCertifications = [];
  }

  private loadDashboardData(): void {
    const certsSub = this.certificationService.getAllCertifications().subscribe({
      next: async (certs) => {
        this.pendingCertsCount = certs.filter((c) => c.status === 'pending').length;
        await this.buildApplications(undefined, certs);
        this.cdr.detectChanges();
      },
      error: (error) => console.error('Certifications dashboard error:', error)
    });

    const appointmentsSub = this.appointmentService.getAllAppointments().subscribe({
      next: async (appointments) => {
        const today = this.getTodayDateString();

        this.todaysAppointmentsCount = appointments.filter((a) => {
          return a.details?.date === today;
        }).length;

        this.approvedAppointmentsToday = appointments.filter((a) => {
          return a.details?.date === today && a.status === 'approved';
        }).length;

        await this.buildApplications(appointments, undefined);
        this.cdr.detectChanges();
      },
      error: (error) => console.error('Appointments dashboard error:', error)
    });

    const residentsSub = this.officialDashboardService.getResidentCount().subscribe({
      next: (count) => {
        this.registeredResidentsCount = count;
        this.cdr.detectChanges();
      },
      error: (error) => console.error('Resident count error:', error)
    });

    const auditSub = this.officialDashboardService.getAuditLogs().subscribe({
      next: (logs) => {
        this.auditLogs = logs.slice(0, 20);
        this.cdr.detectChanges();
      },
      error: (error) => console.error('Audit logs error:', error)
    });

    this.subs.push(certsSub, appointmentsSub, residentsSub, auditSub);
  }

  private async getSafeResidentName(residentId: string): Promise<string> {
    try {
      const name = await this.officialDashboardService.getResidentName(residentId);
      return name || 'Unknown Resident';
    } catch (error) {
      console.error('Resident name fetch error:', error);
      return 'Unknown Resident';
    }
  }

  private async buildApplications(
    appointments?: Appointment[],
    certifications?: Certification[]
  ): Promise<void> {
    if (appointments) this.latestAppointments = appointments;
    if (certifications) this.latestCertifications = certifications;

    const appointmentItems: RecentApplicationItem[] = await Promise.all(
      this.latestAppointments.map(async (a) => ({
        id: a.id,
        residentId: a.residentId,
        residentName: await this.getSafeResidentName(a.residentId),
        document: 'Appointment',
        status: a.status.toUpperCase(),
        type: 'appointment',
        createdAt: a.createdAt,
        createdAtMs: this.toMillis(a.createdAt)
      }))
    );

    const certificationItems: RecentApplicationItem[] = await Promise.all(
      this.latestCertifications.map(async (c) => ({
        id: c.id,
        residentId: c.residentId,
        residentName: await this.getSafeResidentName(c.residentId),
        document: c.details.type,
        status: c.status.toUpperCase(),
        type: 'certificate',
        createdAt: c.createdAt,
        createdAtMs: this.toMillis(c.createdAt)
      }))
    );

    this.allApplications = [...appointmentItems, ...certificationItems]
      .sort((a, b) => b.createdAtMs - a.createdAtMs);

    this.recentApplications = this.allApplications.slice(0, 4);
  }

  private toMillis(value: any): number {
    if (!value) return 0;
    if (value?.toDate) return value.toDate().getTime();

    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  private getTodayDateString(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  async refreshData(): Promise<void> {
    this.clearSubscriptions();
    this.resetDashboard();
    this.loadDashboardData();

    await this.officialDashboardService.addAuditLog(
      'Refreshed official dashboard',
      this.officialId,
      this.officialName
    );

    this.cdr.detectChanges();

    Swal.fire('Updated', 'Dashboard data refreshed.', 'success');
  }

  viewAllRequests(): void {
    this.showAllRequestsModal = true;
  }

  closeAllRequests(): void {
    this.showAllRequestsModal = false;
  }

  async reviewRequest(item: RecentApplicationItem): Promise<void> {
    await this.officialDashboardService.addAuditLog(
      'Reviewed request',
      this.officialId,
      this.officialName,
      `${item.residentName} - ${item.document} (${item.status})`
    );

    Swal.fire({
      title: 'Request Details',
      html: `
        <p><strong>Resident:</strong> ${item.residentName}</p>
        <p><strong>Document:</strong> ${item.document}</p>
        <p><strong>Status:</strong> ${item.status}</p>
        <p><strong>Type:</strong> ${item.type}</p>
      `,
      icon: 'info'
    });
  }

  async deleteRequest(item: RecentApplicationItem): Promise<void> {
    const result = await Swal.fire({
      title: 'Delete Request?',
      text: `This will remove ${item.document} for ${item.residentName}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    try {
      if (item.type === 'appointment') {
        await this.appointmentService.deleteAppointment(item.id);
      } else {
        await this.certificationService.deleteCertification(item.id);
      }

      await this.officialDashboardService.addAuditLog(
        'Deleted request',
        this.officialId,
        this.officialName,
        `${item.residentName} - ${item.document}`
      );

      this.allApplications = this.allApplications.filter((app) => app.id !== item.id);
      this.recentApplications = this.allApplications.slice(0, 4);

      Swal.fire({
        icon: 'success',
        title: 'Deleted',
        text: 'Request deleted successfully.',
        timer: 1800,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Delete request error:', error);
      Swal.fire('Error', 'Failed to delete request.', 'error');
    }
  }

  async announce(): Promise<void> {
    const result = await Swal.fire({
      title: 'Broadcast Announcement',
      input: 'textarea',
      inputPlaceholder: 'Enter announcement message...',
      showCancelButton: true,
      confirmButtonText: 'Send'
    });

    if (!result.isConfirmed || !result.value?.trim()) return;

    const message = result.value.trim();

    try {
      await this.officialDashboardService.createAnnouncement(
        message,
        this.officialId,
        this.officialName
      );

      // Send notification to residents
      await this.notificationService.broadcastToResidents(
        message,
        this.officialId,
        this.officialName
      );

      await this.officialDashboardService.addAuditLog(
        'Created announcement',
        this.officialId,
        this.officialName,
        message
      );

      Swal.fire('Sent', 'Announcement sent to resident notifications.', 'success');
    } catch (error) {
      console.error('Announcement error:', error);
      Swal.fire('Error', 'Failed to create announcement.', 'error');
    }
  }

  manageResidents(): void {
    this.router.navigate(['/ofs-home/ofs-residentsdirectory']);
  }

  async systemLogs(): Promise<void> {
    await this.officialDashboardService.addAuditLog(
      'Viewed audit logs',
      this.officialId,
      this.officialName
    );

    this.showAuditLogsModal = true;
  }

  closeAuditLogs(): void {
    this.showAuditLogsModal = false;
  }
}