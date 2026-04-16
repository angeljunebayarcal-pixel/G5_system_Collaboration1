import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc,
  getDocs,
  Firestore,
  Query
} from 'firebase/firestore';
import { environment } from '../../environments/environment';

export interface AppNotification {
  id: string;
  message: string;
  role: 'resident' | 'official';
  userId?: string | null;
  timestamp: number;
  isRead: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private firestore: Firestore;

  constructor() {
    const app = getApps().length ? getApp() : initializeApp(environment.firebase);
    this.firestore = getFirestore(app);
  }

  async showNotification(
    message: string,
    role: 'resident' | 'official',
    userId?: string
  ): Promise<void> {
    await addDoc(collection(this.firestore, 'notifications'), {
      message,
      role,
      userId: userId ?? null,
      timestamp: Date.now(),
      isRead: false
    });
  }

  async broadcastToResidents(
    message: string,
    senderId?: string,
    senderName?: string
  ): Promise<void> {
    const residentsQuery = query(
      collection(this.firestore, 'users'),
      where('role', '==', 'resident')
    );

    const residentsSnapshot = await getDocs(residentsQuery);

    for (const residentDoc of residentsSnapshot.docs) {
      await addDoc(collection(this.firestore, 'notifications'), {
        message: senderName ? `${senderName}: ${message}` : message,
        role: 'resident',
        userId: residentDoc.id,
        timestamp: Date.now(),
        isRead: false,
        senderId: senderId ?? null,
        senderName: senderName ?? null
      });
    }
  }

  private buildNotificationQuery(
    role: 'resident' | 'official',
    userId?: string
  ): Query {
    const notificationsRef = collection(this.firestore, 'notifications');

    if (!userId) {
      throw new Error(`Cannot load ${role} notifications without a userId.`);
    }

    return query(
      notificationsRef,
      where('role', '==', role),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
  }

  loadNotifications(
    role: 'resident' | 'official',
    userId?: string
  ): Observable<AppNotification[]> {
    return new Observable<AppNotification[]>((observer) => {
      let notificationsQuery: Query;

      try {
        notificationsQuery = this.buildNotificationQuery(role, userId);
      } catch (error) {
        observer.error(error);
        return;
      }

      const unsubscribe = onSnapshot(
        notificationsQuery,
        (snapshot) => {
          const notifications: AppNotification[] = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<AppNotification, 'id'>)
          }));

          observer.next(notifications);
        },
        (error) => {
          console.error('Notification load error:', error);
          observer.error(error);
        }
      );

      return () => unsubscribe();
    });
  }

  async markAllAsRead(
    role: 'resident' | 'official',
    userId?: string
  ): Promise<void> {
    const notificationsQuery = this.buildNotificationQuery(role, userId);
    const snapshot = await getDocs(notificationsQuery);

    for (const notif of snapshot.docs) {
      await updateDoc(doc(this.firestore, 'notifications', notif.id), {
        isRead: true
      });
    }
  }

  async clearNotifications(
    role: 'resident' | 'official',
    userId?: string
  ): Promise<void> {
    const notificationsQuery = this.buildNotificationQuery(role, userId);
    const snapshot = await getDocs(notificationsQuery);

    for (const notif of snapshot.docs) {
      await deleteDoc(doc(this.firestore, 'notifications', notif.id));
    }
  }

  async deleteNotification(id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, 'notifications', id));
  }
}