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

export interface AppointmentDetails {
  description: string;
  official: string;
  date: string;
  time: string;
  fileName: string;
  fileUrl: string;
}

export interface Appointment {
  id: string;
  residentId: string;
  email: string;
  details: AppointmentDetails;
  status: 'pending' | 'approved' | 'canceled';
  createdAt: any;
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private firestore: Firestore;

  constructor(private notificationService: NotificationService) {
    const app = getApps().length ? getApp() : initializeApp(environment.firebase);
    this.firestore = getFirestore(app);
  }

  async requestAppointment(
    residentId: string,
    residentEmail: string,
    details: AppointmentDetails
  ): Promise<void> {
    await addDoc(collection(this.firestore, 'appointments'), {
      residentId,
      details,
      email: residentEmail,
      status: 'pending',
      createdAt: new Date()
    });

    await this.notificationService.showNotification(
      `New appointment request received for ${details.date} at ${details.time}.`,
      'official'
    );
  }

  getPendingAppointments(): Observable<Appointment[]> {
    return new Observable<Appointment[]>((observer) => {
      const q = query(
        collection(this.firestore, 'appointments'),
        where('status', '==', 'pending')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data: Appointment[] = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Appointment, 'id'>)
          }));
          observer.next(data);
        },
        (error) => observer.error(error)
      );

      return () => unsubscribe();
    });
  }

  getResidentAppointments(residentId: string): Observable<Appointment[]> {
    return new Observable<Appointment[]>((observer) => {
      const q = query(
        collection(this.firestore, 'appointments'),
        where('residentId', '==', residentId),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data: Appointment[] = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Appointment, 'id'>)
          }));
          observer.next(data);
        },
        (error) => observer.error(error)
      );

      return () => unsubscribe();
    });
  }

  getAllAppointments(): Observable<Appointment[]> {
    return new Observable<Appointment[]>((observer) => {
      const unsubscribe = onSnapshot(
        collection(this.firestore, 'appointments'),
        (snapshot) => {
          const data: Appointment[] = snapshot.docs
            .map((docSnap) => ({
              id: docSnap.id,
              ...(docSnap.data() as Omit<Appointment, 'id'>)
            }))
            .sort((a, b) => this.toMillis(b.createdAt) - this.toMillis(a.createdAt));

          observer.next(data);
        },
        (error) => observer.error(error)
      );

      return () => unsubscribe();
    });
  }

  async approveAppointment(id: string): Promise<void> {
    const ref = doc(this.firestore, 'appointments', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const current = snap.data() as Omit<Appointment, 'id'>;

    await updateDoc(ref, {
      status: 'approved'
    });

    await this.notificationService.showNotification(
      `Your appointment has been approved for ${current.details.date} at ${current.details.time}.`,
      'resident',
      current.residentId
    );

    await this.notificationService.showNotification(
      'Appointment approved successfully.',
      'official'
    );
  }

  async cancelAppointment(id: string): Promise<void> {
    const ref = doc(this.firestore, 'appointments', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const current = snap.data() as Omit<Appointment, 'id'>;

    await updateDoc(ref, {
      status: 'canceled'
    });

    await this.notificationService.showNotification(
      `Your appointment request for ${current.details.date} at ${current.details.time} has been declined.`,
      'resident',
      current.residentId
    );

    await this.notificationService.showNotification(
      'Appointment declined successfully.',
      'official'
    );
  }

  async rescheduleAppointment(
    id: string,
    newDetails: { date?: string; time?: string }
  ): Promise<void> {
    const ref = doc(this.firestore, 'appointments', id);
    const snap = await getDoc(ref);

    if (!snap.exists()) return;

    const current = snap.data() as Omit<Appointment, 'id'>;

    const updatedDetails = {
      ...(current.details || {}),
      ...newDetails
    };

    await updateDoc(ref, {
      details: updatedDetails,
      status: 'pending'
    });

    await this.notificationService.showNotification(
      `Your appointment has been rescheduled to ${updatedDetails.date || 'no date'} at ${updatedDetails.time || 'no time'}.`,
      'resident',
      current.residentId
    );

    await this.notificationService.showNotification(
      `Appointment rescheduled to ${updatedDetails.date || 'no date'} at ${updatedDetails.time || 'no time'}.`,
      'official'
    );
  }

  async deleteAppointment(id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, 'appointments', id));
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