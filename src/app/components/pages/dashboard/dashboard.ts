import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { onAuthStateChanged, type Unsubscribe } from 'firebase/auth';

import { Appointment, AppointmentService } from '../../../services/appointment.service';
import { AppNotification, NotificationService } from '../../../services/notification.service';
import { AuthService } from '../../../services/auth.service';
import { Certification, CertificationService } from '../../../services/certificate.service';
import Swal from 'sweetalert2';

type ActivityItem = {
  id: string;
  type: 'appointment' | 'certificate' | 'notification';
  title: string;
  time: string;
  sortTime: number;
};

type DashboardCache = {
  residentId: string;
  activeAppointmentsCount: number;
  pendingCertificatesCount: number;
  newNotificationsCount: number;
  recentActivities: ActivityItem[];
  allActivities: ActivityItem[];
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class Dashboard implements OnInit, OnDestroy {
  residentId = '';

  activeAppointmentsCount = 0;
  pendingCertificatesCount = 0;
  newNotificationsCount = 0;

  appointments: Appointment[] = [];
  certifications: Certification[] = [];
  notifications: AppNotification[] = [];
  recentActivities: ActivityItem[] = [];
  allActivities: ActivityItem[] = [];

  showAllActivitiesModal = false;
  showAppointmentsModal = false;
  showCertificatesModal = false;

  private subscriptions: Subscription[] = [];
  private authUnsubscribe: Unsubscribe | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private router: Router,
    private authService: AuthService,
    private appointmentService: AppointmentService,
    private certificationService: CertificationService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.loadLatestDashboardCacheImmediate();

    const auth = this.authService.getAuthInstance();

    this.authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        this.resetDashboard();
        this.clearSubscriptions();
        this.router.navigate(['/login']);
        return;
      }

      this.residentId = user.uid;

      this.loadDashboardCacheForCurrentResident();
      this.clearSubscriptions();

      try {
        const role = await this.authService.getUserRole(user.uid);

        if (role !== 'resident') {
          this.resetDashboard();
          this.clearSubscriptions();
          this.router.navigate(['/login']);
          return;
        }

        this.loadDashboardData();
        this.cdr.detectChanges();
      } catch (error: any) {
        const errorCode = error?.code || '';
        const errorMessage = String(error?.message || '').toLowerCase();

        if (
          errorCode === 'permission-denied' ||
          errorMessage.includes('missing or insufficient permissions')
        ) {
          this.resetDashboard();
          this.clearSubscriptions();
          this.router.navigate(['/login']);
          return;
        }

        console.error('Role check error:', error);
        this.resetDashboard();
        this.clearSubscriptions();
        this.router.navigate(['/login']);
      }
    });
  }

  ngOnDestroy(): void {
    this.clearSubscriptions();

    if (this.authUnsubscribe) {
      this.authUnsubscribe();
      this.authUnsubscribe = null;
    }
  }

  private get cacheKey(): string {
    return this.residentId ? `resident_dashboard_cache_${this.residentId}` : 'resident_dashboard_cache';
  }

  private clearSubscriptions(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions = [];
  }

  private resetDashboard(): void {
    this.activeAppointmentsCount = 0;
    this.pendingCertificatesCount = 0;
    this.newNotificationsCount = 0;
    this.appointments = [];
    this.certifications = [];
    this.notifications = [];
    this.recentActivities = [];
    this.allActivities = [];
  }

  private loadLatestDashboardCacheImmediate(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const possibleKeys = [
      'resident_dashboard_cache',
      ...Object.keys(localStorage).filter((key) => key.startsWith('resident_dashboard_cache_'))
    ];

    for (const key of possibleKeys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      try {
        const cache: DashboardCache = JSON.parse(raw);

        this.residentId = cache.residentId || this.residentId;
        this.activeAppointmentsCount = cache.activeAppointmentsCount || 0;
        this.pendingCertificatesCount = cache.pendingCertificatesCount || 0;
        this.newNotificationsCount = cache.newNotificationsCount || 0;
        this.recentActivities = cache.recentActivities || [];
        this.allActivities = cache.allActivities || [];

        this.cdr.detectChanges();
        return;
      } catch {
        localStorage.removeItem(key);
      }
    }
  }

  private loadDashboardCacheForCurrentResident(): void {
    if (!isPlatformBrowser(this.platformId) || !this.residentId) return;

    const raw = localStorage.getItem(this.cacheKey);
    if (!raw) return;

    try {
      const cache: DashboardCache = JSON.parse(raw);

      this.activeAppointmentsCount = cache.activeAppointmentsCount || 0;
      this.pendingCertificatesCount = cache.pendingCertificatesCount || 0;
      this.newNotificationsCount = cache.newNotificationsCount || 0;
      this.recentActivities = cache.recentActivities || [];
      this.allActivities = cache.allActivities || [];

      this.cdr.detectChanges();
    } catch {
      localStorage.removeItem(this.cacheKey);
    }
  }

  private saveDashboardCache(): void {
    if (!isPlatformBrowser(this.platformId) || !this.residentId) return;

    const cache: DashboardCache = {
      residentId: this.residentId,
      activeAppointmentsCount: this.activeAppointmentsCount,
      pendingCertificatesCount: this.pendingCertificatesCount,
      newNotificationsCount: this.newNotificationsCount,
      recentActivities: this.recentActivities,
      allActivities: this.allActivities
    };

    localStorage.setItem(this.cacheKey, JSON.stringify(cache));
  }

  private loadDashboardData(): void {
    if (this.subscriptions.length > 0) return;

    const appointmentsSub = this.appointmentService
      .getResidentAppointments(this.residentId)
      .subscribe({
        next: (data) => {
          this.appointments = data;
          this.activeAppointmentsCount = data.filter(
            (item) => item.status === 'pending' || item.status === 'approved'
          ).length;
          this.buildActivities();
          this.saveDashboardCache();
          this.cdr.detectChanges();
        },
        error: (error) => console.error('Appointments load error:', error)
      });

    const certificationsSub = this.certificationService
      .getResidentCertifications(this.residentId)
      .subscribe({
        next: (data) => {
          this.certifications = data;
          this.pendingCertificatesCount = data.filter(
            (item) => item.status === 'pending' || item.status === 'approved'
          ).length;
          this.buildActivities();
          this.saveDashboardCache();
          this.cdr.detectChanges();
        },
        error: (error) => console.error('Certifications load error:', error)
      });

    const notificationsSub = this.notificationService
      .loadNotifications('resident', this.residentId)
      .subscribe({
        next: (data) => {
          this.notifications = data;
          this.newNotificationsCount = data.filter((item) => !item.isRead).length;
          this.buildActivities();
          this.saveDashboardCache();
          this.cdr.detectChanges();
        },
        error: (error) => console.error('Notifications load error:', error)
      });

    this.subscriptions.push(appointmentsSub, certificationsSub, notificationsSub);
  }

  private buildActivities(): void {
    const appointmentActivities: ActivityItem[] = this.appointments.map((a) => ({
      id: a.id,
      type: 'appointment',
      title:
        a.status === 'approved'
          ? 'Appointment Approved'
          : a.status === 'canceled'
          ? 'Appointment Declined'
          : 'Appointment Submitted',
      time: this.formatDate(a.createdAt, `${a.details?.date || ''} ${a.details?.time ? 'at ' + a.details.time : ''}`.trim()),
      sortTime: this.getSortTime(a.createdAt)
    }));

    const certificationActivities: ActivityItem[] = this.certifications.map((c) => ({
      id: c.id,
      type: 'certificate',
      title:
        c.status === 'approved'
          ? `${c.details?.type || 'Certificate'} Approved`
          : c.status === 'released'
          ? `${c.details?.type || 'Certificate'} Released`
          : c.status === 'rejected'
          ? `${c.details?.type || 'Certificate'} Rejected`
          : `${c.details?.type || 'Certificate'} Request Submitted`,
      time: this.formatDate(c.createdAt, `${c.details?.date || ''} ${c.details?.time ? 'at ' + c.details.time : ''}`.trim()),
      sortTime: this.getSortTime(c.createdAt)
    }));

    const notificationActivities: ActivityItem[] = this.notifications.map((n) => ({
      id: n.id,
      type: 'notification',
      title: n.message,
      time: new Date(n.timestamp).toLocaleString(),
      sortTime: n.timestamp
    }));

    this.allActivities = [
      ...appointmentActivities,
      ...certificationActivities,
      ...notificationActivities
    ].sort((a, b) => b.sortTime - a.sortTime);

    this.recentActivities = this.allActivities.slice(0, 2);
  }

  private formatDate(createdAt: any, fallback: string): string {
    if (!createdAt) return fallback || 'Recently';

    if (createdAt?.toDate) {
      return createdAt.toDate().toLocaleString();
    }

    const parsed = new Date(createdAt);
    return isNaN(parsed.getTime()) ? (fallback || 'Recently') : parsed.toLocaleString();
  }

  private getSortTime(createdAt: any): number {
    if (!createdAt) return 0;

    if (createdAt?.toDate) {
      return createdAt.toDate().getTime();
    }

    const parsed = new Date(createdAt);
    return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  trackByActivityId(index: number, activity: ActivityItem): string {
    return `${activity.type}-${activity.id}`;
  }

  async deleteActivity(activity: ActivityItem): Promise<void> {
    const result = await Swal.fire({
      title: 'Delete Activity?',
      text: 'This activity will be permanently removed.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    try {
      if (activity.type === 'appointment') {
        await this.appointmentService.deleteAppointment(activity.id);
      } else if (activity.type === 'certificate') {
        await this.certificationService.deleteCertification(activity.id);
      } else {
        await this.notificationService.deleteNotification(activity.id);
      }

      await Swal.fire({
        icon: 'success',
        title: 'Deleted',
        text: 'Activity has been deleted.',
        timer: 1800,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Delete activity error:', error);

      Swal.fire({
        icon: 'error',
        title: 'Delete Failed',
        text: 'Failed to delete activity.'
      });
    }
  }

  async refreshData(): Promise<void> {
    this.clearSubscriptions();

    setTimeout(() => {
      this.loadDashboardData();
      this.cdr.detectChanges();
    }, 200);

    Swal.fire({
      icon: 'success',
      title: 'Updated',
      text: 'Dashboard data refreshed.',
      timer: 1200,
      showConfirmButton: false
    });
  }

  viewAppointments(): void {
    this.showAppointmentsModal = true;
    this.cdr.detectChanges();
  }

  closeAppointmentsModal(): void {
    this.showAppointmentsModal = false;
    this.cdr.detectChanges();
  }

  viewCertificates(): void {
    this.showCertificatesModal = true;
    this.cdr.detectChanges();
  }

  closeCertificatesModal(): void {
    this.showCertificatesModal = false;
    this.cdr.detectChanges();
  }

  viewNotifications(): void {
    this.router.navigate(['/home/notification']);
  }

  viewAllActivity(): void {
    this.showAllActivitiesModal = true;
    this.cdr.detectChanges();
  }

  closeAllActivity(): void {
    this.showAllActivitiesModal = false;
    this.cdr.detectChanges();
  }

  newAppointment(): void {
    this.router.navigate(['/home/bookappointment']);
  }

  newRequest(): void {
    this.router.navigate(['/home/certificaterequest']);
  }

  updateProfile(): void {
    this.router.navigate(['/home/profile']);
  }
}