import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  query,
  where,
  onSnapshot,
  Firestore,
  orderBy,
  deleteDoc
} from 'firebase/firestore';

import { NotificationService } from './notification.service';
import { environment } from '../../environments/environment';

export interface Certification {
  id: string;
  residentId: string;
  email: string;
  details: {
    type: string;
    purpose: string;
    date: string;
    time: string;
    fileName: string;
    fileUrl: string;
  };
  status: 'pending' | 'approved' | 'released' | 'rejected';
  createdAt: any;
}

@Injectable({
  providedIn: 'root'
})
export class CertificationService {
  private firestore: Firestore;

  constructor(private notificationService: NotificationService) {
    const app = getApps().length ? getApp() : initializeApp(environment.firebase);
    this.firestore = getFirestore(app);
  }

  async requestCertification(
    residentId: string,
    residentEmail: string,
    details: {
      type: string;
      purpose: string;
      date: string;
      time: string;
      fileName: string;
      fileUrl: string;
    }
  ): Promise<void> {
    await addDoc(collection(this.firestore, 'certifications'), {
      residentId,
      email: residentEmail,
      details,
      status: 'pending',
      createdAt: new Date()
    });

    await this.notificationService.showNotification(
      `New certificate request received: ${details.type}.`,
      'official'
    );
  }

  getPendingCertifications(): Observable<Certification[]> {
    return new Observable<Certification[]>((observer) => {
      const q = query(
        collection(this.firestore, 'certifications'),
        where('status', '==', 'pending')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data: Certification[] = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Certification, 'id'>)
          }));
          observer.next(data);
        },
        (error) => observer.error(error)
      );

      return () => unsubscribe();
    });
  }

  getResidentCertifications(residentId: string): Observable<Certification[]> {
    return new Observable<Certification[]>((observer) => {
      const q = query(
        collection(this.firestore, 'certifications'),
        where('residentId', '==', residentId),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data: Certification[] = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Certification, 'id'>)
          }));
          observer.next(data);
        },
        (error) => observer.error(error)
      );

      return () => unsubscribe();
    });
  }

  getAllCertifications(): Observable<Certification[]> {
    return new Observable<Certification[]>((observer) => {
      const unsubscribe = onSnapshot(
        collection(this.firestore, 'certifications'),
        (snapshot) => {
          const data: Certification[] = snapshot.docs
            .map((docSnap) => ({
              id: docSnap.id,
              ...(docSnap.data() as Omit<Certification, 'id'>)
            }))
            .sort((a, b) => this.toMillis(b.createdAt) - this.toMillis(a.createdAt));

          observer.next(data);
        },
        (error) => observer.error(error)
      );

      return () => unsubscribe();
    });
  }

  async approveCertification(id: string): Promise<void> {
    const ref = doc(this.firestore, 'certifications', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const current = snap.data() as Omit<Certification, 'id'>;

    await updateDoc(ref, {
      status: 'approved'
    });

    await this.notificationService.showNotification(
      `Your ${current.details.type} request has been approved for ${current.details.date} at ${current.details.time}.`,
      'resident',
      current.residentId
    );

    await this.notificationService.showNotification(
      'Certificate request approved successfully.',
      'official'
    );
  }

  async cancelCertification(id: string): Promise<void> {
    const ref = doc(this.firestore, 'certifications', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const current = snap.data() as Omit<Certification, 'id'>;

    await updateDoc(ref, {
      status: 'rejected'
    });

    await this.notificationService.showNotification(
      `Your ${current.details.type} request has been rejected.`,
      'resident',
      current.residentId
    );

    await this.notificationService.showNotification(
      'Certificate request rejected successfully.',
      'official'
    );
  }

  async rescheduleCertification(
    id: string,
    newDetails: { date?: string; time?: string }
  ): Promise<void> {
    const ref = doc(this.firestore, 'certifications', id);
    const snap = await getDoc(ref);

    if (!snap.exists()) return;

    const current = snap.data() as Omit<Certification, 'id'>;

    const updatedDetails = {
      ...(current.details || {}),
      ...newDetails
    };

    await updateDoc(ref, {
      details: updatedDetails,
      status: 'pending'
    });

    await this.notificationService.showNotification(
      `Your ${updatedDetails.type || 'certificate'} request has been rescheduled to ${updatedDetails.date || 'no date'} at ${updatedDetails.time || 'no time'}.`,
      'resident',
      current.residentId
    );

    await this.notificationService.showNotification(
      `Certificate request rescheduled to ${updatedDetails.date || 'no date'} at ${updatedDetails.time || 'no time'}.`,
      'official'
    );
  }

  async deleteCertification(id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, 'certifications', id));
  }

  private toMillis(value: any): number {
    if (!value) return 0;

    if (value?.toDate) {
      return value.toDate().getTime();
    }

    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }
}