import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AppNotification {
  message: string;
  role: 'resident' | 'official';
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private storageKey = 'app_notifications';

  private notificationSubject = new BehaviorSubject<AppNotification | null>(null);
  notification$ = this.notificationSubject.asObservable();

  constructor() {}

  /** Show popup AND save persistently */
  showNotification(message: string, role: 'resident' | 'official') {
    const notif: AppNotification = { message, role, timestamp: Date.now() };

    // Show popup
    this.notificationSubject.next(notif);
    setTimeout(() => this.notificationSubject.next(null), 3000);

    // Save persistently
    this.addPersistentNotification(notif);
  }

  private addPersistentNotification(notif: AppNotification) {
    const notifs = this.loadAllNotifications();
    notifs.unshift(notif);
    localStorage.setItem(this.storageKey, JSON.stringify(notifs));
  }

  loadNotifications(role: 'resident' | 'official'): AppNotification[] {
    return this.loadAllNotifications().filter(n => n.role === role);
  }

  clearNotifications(role: 'resident' | 'official') {
    const remaining = this.loadAllNotifications().filter(n => n.role !== role);
    localStorage.setItem(this.storageKey, JSON.stringify(remaining));
  }

  private loadAllNotifications(): AppNotification[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }
}