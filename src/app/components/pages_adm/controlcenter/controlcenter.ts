import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-controlcenter',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './controlcenter.html',
  styleUrl: './controlcenter.scss',
})
export class Controlcenter implements OnInit {
  stats = {
    residents: 0,
    officials: 0,
    pendingOfficials: 0,
    activeRequests: 0
  };

  activities: { message: string; time: string }[] = [];
  visibleActivities: { message: string; time: string }[] = [];

  loading = true;
  refreshing = false;
  showAllActivitiesModal = false;

  constructor(
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  async ngOnInit(): Promise<void> {
    this.loading = true;
    this.cdr.detectChanges();
    await this.loadDashboard();
  }

  async loadDashboard(): Promise<void> {
    try {
      this.loading = true;
      this.cdr.detectChanges();

      const users = await this.authService.getAllUsersForDirectory();
      const pendingOfficials = await this.authService.getPendingOfficials();

      const residents = users.filter(user => user.role === 'resident').length;
      const officials = users.filter(user => user.role === 'official').length;
      const pendingCount = pendingOfficials.length;
      const activeRequests = 0;

      const recentUsers = [...users]
        .sort((a, b) => this.toMillis(b.createdAt) - this.toMillis(a.createdAt))
        .slice(0, 8);

      const allActivities = [
        ...pendingOfficials.slice(0, 5).map((official: any) => ({
          message: `${official.fullName || 'An official'} is waiting for approval.`,
          time: this.formatTimeAgo(official.createdAt)
        })),
        ...recentUsers.map(user => ({
          message: `${user.fullName} was registered as ${this.getRoleLabel(user.role)}.`,
          time: this.formatTimeAgo(user.createdAt)
        }))
      ]
        .sort((a, b) => this.activityTimeWeight(a.time) - this.activityTimeWeight(b.time))
        .slice(0, 10);

      this.ngZone.run(() => {
        this.stats = {
          residents,
          officials,
          pendingOfficials: pendingCount,
          activeRequests
        };

        this.activities = allActivities;
        this.visibleActivities = allActivities.slice(0, 3);

        this.loading = false;
        this.refreshing = false;
        this.cdr.detectChanges();
      });

    } catch (error) {
      console.error('Failed to load control center:', error);

      this.ngZone.run(() => {
        this.loading = false;
        this.refreshing = false;
        this.cdr.detectChanges();
      });

      Swal.fire('Error', 'Failed to load control center data.', 'error');
    }
  }

  async refreshDashboard(): Promise<void> {
    if (this.refreshing) return;

    this.refreshing = true;
    this.cdr.detectChanges();

    Swal.fire({
      title: 'Refreshing...',
      text: 'Updating control center data.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      await this.loadDashboard();
      Swal.close();

      await Swal.fire({
        icon: 'success',
        title: 'Updated!',
        text: 'Control center is now up to date.',
        timer: 1500,
        showConfirmButton: false
      });
    } catch {
      Swal.close();
    } finally {
      this.ngZone.run(() => {
        this.refreshing = false;
        this.cdr.detectChanges();
      });
    }
  }

  openAllActivities(): void {
    this.showAllActivitiesModal = true;
    this.cdr.detectChanges();
  }

  closeAllActivities(): void {
    this.showAllActivitiesModal = false;
    this.cdr.detectChanges();
  }

  getRoleLabel(role: string): string {
    if (role === 'resident') return 'Resident';
    if (role === 'official') return 'Official';
    if (role === 'admin') return 'Administrator';
    return role;
  }

  private toMillis(value: any): number {
    if (!value) return 0;

    if (value?.toDate) {
      return value.toDate().getTime();
    }

    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  private formatTimeAgo(value: any): string {
    const time = this.toMillis(value);
    if (!time) return 'Recently';

    const diff = Date.now() - time;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  private activityTimeWeight(label: string): number {
    if (label === 'Just now') return 0;
    if (label === 'Recently') return 999999;

    const minuteMatch = label.match(/(\d+)\sminute/);
    if (minuteMatch) return parseInt(minuteMatch[1], 10);

    const hourMatch = label.match(/(\d+)\shour/);
    if (hourMatch) return parseInt(hourMatch[1], 10) * 60;

    const dayMatch = label.match(/(\d+)\sday/);
    if (dayMatch) return parseInt(dayMatch[1], 10) * 1440;

    return 999999;
  }
}