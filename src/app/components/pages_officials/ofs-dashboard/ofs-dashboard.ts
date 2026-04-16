import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID
} from '@angular/core';
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

type OfficialDashboardCache = {
  pendingCertsCount: number;
  todaysAppointmentsCount: number;
  registeredResidentsCount: number;
  approvedAppointmentsToday: number;
  recentApplications: RecentApplicationItem[];
  allApplications: RecentApplicationItem[];
  auditLogs: AuditLog[];
  officialId: string;
  officialName: string;
  residentNames: Record<string, string>;
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
  private residentNameCache = new Map<string, string>();

  officialId = '';
  officialName = 'Official User';

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private router: Router,
    private authService: AuthService,
    private appointmentService: AppointmentService,
    private certificationService: CertificationService,
    private officialDashboardService: OfficialDashboardService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    this.loadDashboardCacheImmediate();

    const auth = this.authService.getAuthInstance();
    const currentUser = auth.currentUser;

    if (currentUser) {
      this.officialId = currentUser.uid;
    } else {
      const asyncUser = await this.authService.getCurrentUserAsync();

      if (!asyncUser) {
        this.resetDashboard();
        this.clearSubscriptions();
        this.router.navigate(['/login']);
        return;
      }

      this.officialId = asyncUser.uid;
    }

    this.clearSubscriptions();
    this.loadDashboardData();

    this.loadOfficialProfileSilently();
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.clearSubscriptions();
  }

  private get cacheKey(): string {
    return this.officialId
      ? `official_dashboard_cache_${this.officialId}`
      : 'official_dashboard_cache';
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

  private loadDashboardCacheImmediate(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const possibleKeys = [
      'official_dashboard_cache',
      ...Object.keys(localStorage).filter((key) => key.startsWith('official_dashboard_cache_'))
    ];

    for (const key of possibleKeys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      try {
        const cache: OfficialDashboardCache = JSON.parse(raw);

        this.pendingCertsCount = cache.pendingCertsCount || 0;
        this.todaysAppointmentsCount = cache.todaysAppointmentsCount || 0;
        this.registeredResidentsCount = cache.registeredResidentsCount || 0;
        this.approvedAppointmentsToday = cache.approvedAppointmentsToday || 0;
        this.recentApplications = cache.recentApplications || [];
        this.allApplications = cache.allApplications || [];
        this.auditLogs = cache.auditLogs || [];
        this.officialId = cache.officialId || this.officialId;
        this.officialName = cache.officialName || this.officialName;

        this.residentNameCache.clear();
        if (cache.residentNames) {
          Object.entries(cache.residentNames).forEach(([id, name]) => {
            this.residentNameCache.set(id, name);
          });
        }

        this.cdr.detectChanges();
        return;
      } catch {
        localStorage.removeItem(key);
      }
    }
  }

  private saveDashboardCache(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const residentNames: Record<string, string> = {};
    this.residentNameCache.forEach((value, key) => {
      residentNames[key] = value;
    });

    const cache: OfficialDashboardCache = {
      pendingCertsCount: this.pendingCertsCount,
      todaysAppointmentsCount: this.todaysAppointmentsCount,
      registeredResidentsCount: this.registeredResidentsCount,
      approvedAppointmentsToday: this.approvedAppointmentsToday,
      recentApplications: this.recentApplications,
      allApplications: this.allApplications,
      auditLogs: this.auditLogs,
      officialId: this.officialId,
      officialName: this.officialName,
      residentNames
    };

    localStorage.setItem(this.cacheKey, JSON.stringify(cache));
  }

  private async loadOfficialProfileSilently(): Promise<void> {
    try {
      const auth = this.authService.getAuthInstance();
      const currentUser = auth.currentUser ?? (await this.authService.getCurrentUserAsync());

      if (!currentUser?.uid) {
        return;
      }

      this.officialId = currentUser.uid;

      try {
        const profile = await this.authService.getProfileData(currentUser.uid);

        this.officialName =
          profile?.fullName?.trim() ||
          currentUser.displayName?.trim() ||
          this.officialName ||
          'Official User';
      } catch (profileError: any) {
        const errorCode = profileError?.code || '';
        const errorMessage = String(profileError?.message || '').toLowerCase();

        if (
          errorCode === 'permission-denied' ||
          errorMessage.includes('missing or insufficient permissions')
        ) {
          this.officialName =
            currentUser.displayName?.trim() ||
            this.officialName ||
            'Official User';

          this.saveDashboardCache();
          this.cdr.detectChanges();
          return;
        }

        throw profileError;
      }

      this.saveDashboardCache();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Official profile load error:', error);
    }
  }

  private loadDashboardData(): void {
    const certsSub = this.certificationService.getAllCertifications().subscribe({
      next: async (certs) => {
        this.latestCertifications = certs;
        this.pendingCertsCount = certs.filter((c) => c.status === 'pending').length;

        await this.buildApplications();
        this.saveDashboardCache();
        this.cdr.detectChanges();
      },
      error: (error) => console.error('Certifications dashboard error:', error)
    });

    const appointmentsSub = this.appointmentService.getAllAppointments().subscribe({
      next: async (appointments) => {
        this.latestAppointments = appointments;

        const today = this.getTodayDateString();

        this.todaysAppointmentsCount = appointments.filter((a) => {
          return a.details?.date === today;
        }).length;

        this.approvedAppointmentsToday = appointments.filter((a) => {
          return a.details?.date === today && a.status === 'approved';
        }).length;

        await this.buildApplications();
        this.saveDashboardCache();
        this.cdr.detectChanges();
      },
      error: (error) => console.error('Appointments dashboard error:', error)
    });

    const residentsSub = this.officialDashboardService.getResidentCount().subscribe({
      next: (count) => {
        this.registeredResidentsCount = count;
        this.saveDashboardCache();
        this.cdr.detectChanges();
      },
      error: (error) => console.error('Resident count error:', error)
    });

    const auditSub = this.officialDashboardService.getAuditLogs().subscribe({
      next: (logs) => {
        this.auditLogs = logs.slice(0, 20);
        this.saveDashboardCache();
        this.cdr.detectChanges();
      },
      error: (error) => console.error('Audit logs error:', error)
    });

    this.subs.push(certsSub, appointmentsSub, residentsSub, auditSub);
  }

  private async getSafeResidentName(residentId: string): Promise<string> {
    if (!residentId) return 'Unknown Resident';

    const cached = this.residentNameCache.get(residentId);
    if (cached) return cached;

    try {
      const name = await this.officialDashboardService.getResidentName(residentId);
      const safeName = name || 'Unknown Resident';
      this.residentNameCache.set(residentId, safeName);
      return safeName;
    } catch (error) {
      console.error('Resident name fetch error:', error);
      const fallback = 'Unknown Resident';
      this.residentNameCache.set(residentId, fallback);
      return fallback;
    }
  }

  private async buildApplications(): Promise<void> {
    const uniqueResidentIds = Array.from(
      new Set([
        ...this.latestAppointments.map((a) => a.residentId),
        ...this.latestCertifications.map((c) => c.residentId)
      ].filter(Boolean))
    );

    const uncachedIds = uniqueResidentIds.filter((id) => !this.residentNameCache.has(id));

    if (uncachedIds.length) {
      await Promise.all(
        uncachedIds.map(async (residentId) => {
          await this.getSafeResidentName(residentId);
        })
      );
    }

    const appointmentItems: RecentApplicationItem[] = this.latestAppointments.map((a) => ({
      id: a.id,
      residentId: a.residentId,
      residentName: this.residentNameCache.get(a.residentId) || 'Unknown Resident',
      document: 'Appointment',
      status: (a.status || '').toUpperCase(),
      type: 'appointment',
      createdAt: a.createdAt,
      createdAtMs: this.toMillis(a.createdAt)
    }));

    const certificationItems: RecentApplicationItem[] = this.latestCertifications.map((c) => ({
      id: c.id,
      residentId: c.residentId,
      residentName: this.residentNameCache.get(c.residentId) || 'Unknown Resident',
      document: c.details?.type || 'Certificate',
      status: (c.status || '').toUpperCase(),
      type: 'certificate',
      createdAt: c.createdAt,
      createdAtMs: this.toMillis(c.createdAt)
    }));

    this.allApplications = [...appointmentItems, ...certificationItems].sort(
      (a, b) => b.createdAtMs - a.createdAtMs
    );

    this.recentApplications = this.allApplications.slice(0, 3);
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

  trackByApplicationId(index: number, item: RecentApplicationItem): string {
    return `${item.type}-${item.id}`;
  }

  async refreshData(): Promise<void> {
    this.clearSubscriptions();
    this.loadDashboardData();
    this.cdr.detectChanges();

    await this.officialDashboardService.addAuditLog(
      'Refreshed official dashboard',
      this.officialId,
      this.officialName
    );

    Swal.fire({
      icon: 'success',
      title: 'Updated',
      text: 'Dashboard data refreshed.',
      timer: 1200,
      showConfirmButton: false
    });
  }

  viewAllRequests(): void {
    this.showAllRequestsModal = true;
    this.cdr.detectChanges();
  }

  closeAllRequests(): void {
    this.showAllRequestsModal = false;
    this.cdr.detectChanges();
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

      this.allApplications = this.allApplications.filter(
        (app) => !(app.id === item.id && app.type === item.type)
      );
      this.recentApplications = this.allApplications.slice(0, 3);

      this.saveDashboardCache();
      this.cdr.detectChanges();

      await Swal.fire({
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
    this.cdr.detectChanges();
  }

  closeAuditLogs(): void {
    this.showAuditLogsModal = false;
    this.cdr.detectChanges();
  }
}