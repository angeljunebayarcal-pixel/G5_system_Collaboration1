import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { NotificationService, AppNotification } from '../../../core/notification.service';

interface OfficialNotification {
  message: string;
  time: string;
  isNew: boolean;
}

@Component({
  selector: 'app-ofs-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ofs-notification.html',
  styleUrls: ['./ofs-notification.scss'],
})
export class OfsNotification implements OnInit {
  notifications: OfficialNotification[] = [];
  currentPopup: OfficialNotification | null = null;

  constructor(private notifService: NotificationService) {}

  ngOnInit() {
    this.loadNotifications();

    // Subscribe to popups from NotificationService
    this.notifService.notification$.subscribe((n: AppNotification | null) => {
      if (n && n.role === 'official') {
        const notif: OfficialNotification = {
          message: n.message,
          time: new Date(n.timestamp).toLocaleString(),
          isNew: true,
        };

        this.currentPopup = notif;
        this.addNotification(n.message, n.timestamp);
      }
    });
  }

  /** Load persistent notifications for officials */
  loadNotifications() {
    const stored = this.notifService.loadNotifications('official');
    this.notifications = stored.map(n => ({
      message: n.message,
      time: new Date(n.timestamp).toLocaleString(),
      isNew: false
    }));
  }

  /** Add a notification to the list and mark as new temporarily */
  addNotification(message: string, timestamp?: number) {
    const time = timestamp ? new Date(timestamp).toLocaleString() : new Date().toLocaleString();

    this.notifications.unshift({
      message,
      time,
      isNew: true
    });

    // Remove "new" highlight after 3 seconds
    setTimeout(() => {
      if (this.notifications.length > 0) {
        this.notifications[0].isNew = false;
        this.currentPopup = null; 
      }
    }, 3000);
  }
  clearAll() {
  this.notifications = [];
  this.notifService.clearNotifications('official'); 
}
}