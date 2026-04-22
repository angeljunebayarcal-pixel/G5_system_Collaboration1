import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  Firestore
} from 'firebase/firestore';
import { environment } from '../../environments/environment';

export interface AuditLog {
  id: string;
  action: string;
  actorId: string;
  actorName: string;
  createdAt: any;
  details?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OfficialDashboardService {
  private firestore: Firestore;

  constructor() {
    const app = getApps().length ? getApp() : initializeApp(environment.firebase);
    this.firestore = getFirestore(app);
  }

  getResidentCount(): Observable<number> {
    return new Observable<number>((observer) => {
      const q = query(
        collection(this.firestore, 'users'),
        where('role', '==', 'resident')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          observer.next(snapshot.size);
        },
        (error) => {
  const errorCode = error?.code || '';
  const errorMessage = String(error?.message || '').toLowerCase();

  const isTransientListenError =
    errorCode === 'unavailable' ||
    errorCode === 'cancelled' ||
    errorMessage.includes('webchannelconnection') ||
    errorMessage.includes("rpc 'listen' transport errored") ||
    errorMessage.includes('listen/channel') ||
    errorMessage.includes('404') ||
    errorMessage.includes('net::err_aborted');

  if (isTransientListenError) {
    console.warn('Resident count listener interrupted temporarily:', error);
    return;
  }

  observer.error(error);
}
      );

      return () => unsubscribe();
    });
  }

  async getResidentName(uid: string): Promise<string> {
    const residentSnap = await getDoc(doc(this.firestore, 'residents', uid));
    if (residentSnap.exists()) {
      const data = residentSnap.data();
      return data['fullName'] || 'Unknown Resident';
    }

    const userSnap = await getDoc(doc(this.firestore, 'users', uid));
    if (userSnap.exists()) {
      const data = userSnap.data();
      return data['fullName'] || data['email'] || 'Unknown Resident';
    }

    return 'Unknown Resident';
  }

  async createAnnouncement(
    message: string,
    officialId: string,
    officialName: string
  ): Promise<void> {
    await addDoc(collection(this.firestore, 'announcements'), {
      message,
      officialId,
      officialName,
      createdAt: new Date()
    });
  }

  async addAuditLog(
    action: string,
    actorId: string,
    actorName: string,
    details?: string
  ): Promise<void> {
    await addDoc(collection(this.firestore, 'auditLogs'), {
      action,
      actorId,
      actorName,
      details: details || '',
      createdAt: new Date()
    });
  }

  getAuditLogs(): Observable<AuditLog[]> {
    return new Observable<AuditLog[]>((observer) => {
      const unsubscribe = onSnapshot(
        collection(this.firestore, 'auditLogs'),
        (snapshot) => {
          const logs: AuditLog[] = snapshot.docs
            .map((docSnap) => ({
              id: docSnap.id,
              ...(docSnap.data() as Omit<AuditLog, 'id'>)
            }))
            .sort((a, b) => this.toMillis(b.createdAt) - this.toMillis(a.createdAt));

          observer.next(logs);
        },
        (error) => {
  const errorCode = error?.code || '';
  const errorMessage = String(error?.message || '').toLowerCase();

  const isTransientListenError =
    errorCode === 'unavailable' ||
    errorCode === 'cancelled' ||
    errorMessage.includes('webchannelconnection') ||
    errorMessage.includes("rpc 'listen' transport errored") ||
    errorMessage.includes('listen/channel') ||
    errorMessage.includes('404') ||
    errorMessage.includes('net::err_aborted');

  if (isTransientListenError) {
    console.warn('Audit logs listener interrupted temporarily:', error);
    return;
  }

  observer.error(error);
}
      );

      return () => unsubscribe();
    });
  }

  private toMillis(value: any): number {
    if (!value) return 0;
    if (value?.toDate) return value.toDate().getTime();

    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }
}