import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { NotificationService, AppNotification } from '../../../services/notification.service';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';

interface ResidentNotification {
  id: string;
  message: string;
  time: string;
  isNew: boolean;
  isRead: boolean;
}

@Component({
  selector: 'app-resident-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.html',
  styleUrls: ['./notification.scss']
})
export class Notification implements OnInit, OnDestroy {
  notifications: ResidentNotification[] = [];
  currentPopup: ResidentNotification | null = null;

  private notifSub?: Subscription;
  private residentId: string | null = null;

  constructor(
    private notifService: NotificationService,
    private authService: AuthService,
    private zone: NgZone
  ) {}

  async ngOnInit() {
    const currentUser = await this.authService.getCurrentUserAsync();
    this.residentId = currentUser?.uid || null;

    if (!this.residentId) {
      console.error('No logged-in resident found.');
      return;
    }

    this.loadResidentNotifications();
  }

  ngOnDestroy() {
    this.notifSub?.unsubscribe();
  }

  private loadResidentNotifications() {
    if (!this.residentId) return;

    this.notifSub = this.notifService.loadNotifications('resident', this.residentId).subscribe({
      next: (stored: AppNotification[]) => {
        this.zone.run(() => {
          this.notifications = stored.map(n => ({
            id: n.id,
            message: n.message,
            time: new Date(n.timestamp).toLocaleString(),
            isNew: !n.isRead,
            isRead: n.isRead
          }));

          const firstUnread = this.notifications.find(n => !n.isRead);
          this.currentPopup = firstUnread || null;
        });
      },
      error: (err) => {
        console.error('Failed to load resident notifications:', err);
      }
    });
  }

  async clearAll() {
    if (!this.residentId) return;

    this.zone.run(() => {
      this.notifications = [];
      this.currentPopup = null;
    });

    await this.notifService.clearNotifications('resident', this.residentId);
  }

  async markAllAsRead() {
    if (!this.residentId) return;

    this.zone.run(() => {
      this.notifications = this.notifications.map(n => ({
        ...n,
        isNew: false,
        isRead: true
      }));
      this.currentPopup = null;
    });

    await this.notifService.markAllAsRead('resident', this.residentId);
  }
}