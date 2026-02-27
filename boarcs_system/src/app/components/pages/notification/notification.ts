import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, AppNotification } from '../../../core/notification.service';

interface ResidentNotification {
  message: string;
  time: string;
  isNew: boolean;
}

@Component({
  selector: 'app-resident-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.html',
  styleUrls: ['./notification.scss']
})
export class Notification implements OnInit {

  notifications: ResidentNotification[] = [];
  currentPopup: ResidentNotification | null = null;

  constructor(private notifService: NotificationService) {}

  ngOnInit() {
    // Load all persistent notifications for this role
    const stored = this.notifService.loadNotifications('resident');
    this.notifications = stored.map(n => ({
      message: n.message,
      time: new Date(n.timestamp).toLocaleString(),
      isNew: false
    }));

    // Subscribe to popup notifications
    this.notifService.notification$.subscribe((n: AppNotification | null) => {
      if (n && n.role === 'resident') {
        this.currentPopup = {
          message: n.message,
          time: new Date(n.timestamp).toLocaleString(),
          isNew: true
        };
        // Add to the notification list
        this.notifications.unshift(this.currentPopup);

        // Remove "new" highlight after 3s
        setTimeout(() => {
          if (this.notifications.length > 0) this.notifications[0].isNew = false;
          this.currentPopup = null;
        }, 3000);
      }
    });
  }
  clearAll() {
  this.notifications = [];
  this.notifService.clearNotifications('official'); 
  }
}