import { CommonModule } from '@angular/common';
import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import {
  NotificationService,
  AppNotification
} from '../../../services/notification.service';

interface OfficialNotification {
  id: string;
  message: string;
  time: string;
  isNew: boolean;
  isRead: boolean;
}

@Component({
  selector: 'app-ofs-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ofs-notification.html',
  styleUrls: ['./ofs-notification.scss'],
})
export class OfsNotification implements OnInit, OnDestroy {
  notifications: OfficialNotification[] = [];
  currentPopup: OfficialNotification | null = null;

  private notifSub?: Subscription;
  private officialId: string | null = null;

  constructor(
    private notifService: NotificationService,
    private authService: AuthService,
    private zone: NgZone
  ) {}

  async ngOnInit(): Promise<void> {
    const currentUser = await this.authService.getCurrentUserAsync();
    this.officialId = currentUser?.uid || null;

    if (!this.officialId) {
      this.zone.run(() => {
        this.notifications = [];
        this.currentPopup = null;
      });
      return;
    }

    this.loadNotifications(this.officialId);
  }

  ngOnDestroy(): void {
    this.notifSub?.unsubscribe();
  }

  private loadNotifications(userId: string): void {
    this.notifSub?.unsubscribe();

    this.notifSub = this.notifService.loadNotifications('official', userId).subscribe({
      next: (stored: AppNotification[]) => {
        this.zone.run(() => {
          this.notifications = stored.map((n) => ({
            id: n.id,
            message: n.message,
            time: new Date(n.timestamp).toLocaleString(),
            isNew: !n.isRead,
            isRead: n.isRead
          }));

          const firstUnread = this.notifications.find((n) => !n.isRead);
          this.currentPopup = firstUnread || null;
        });
      },
      error: (err) => {
        console.error('Failed to load official notifications:', err);

        this.zone.run(() => {
          this.notifications = [];
          this.currentPopup = null;
        });
      }
    });
  }

  async clearAll(): Promise<void> {
    if (!this.officialId) return;

    this.zone.run(() => {
      this.notifications = [];
      this.currentPopup = null;
    });

    await this.notifService.clearNotifications('official', this.officialId);
  }

  async markAllAsRead(): Promise<void> {
    if (!this.officialId) return;

    this.zone.run(() => {
      this.notifications = this.notifications.map((n) => ({
        ...n,
        isNew: false,
        isRead: true
      }));
      this.currentPopup = null;
    });

    await this.notifService.markAllAsRead('official', this.officialId);
  }
}