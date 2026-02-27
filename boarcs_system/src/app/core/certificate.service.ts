import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { NotificationService } from './notification.service';

export interface Certification {
  id: number;
  residentId: number;
  details: any;
  status: 'pending' | 'approved' | 'released' | 'rejected';
}

@Injectable({ providedIn: 'root' })
export class CertificationService {
  private storageKey = 'certifications';

  private certificationsSubject = new BehaviorSubject<Certification[]>([]);
  certifications$ = this.certificationsSubject.asObservable();

  constructor(private notificationService: NotificationService) {
    // Load certifications from localStorage on browser
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const initialCerts = this.loadCertifications();
      this.certificationsSubject.next(initialCerts);
    }
  }

  /** Load certifications from localStorage */
  private loadCertifications(): Certification[] {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  /** Save certifications to localStorage and notify subscribers */
  private saveCertifications(certifications: Certification[]) {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(certifications));
    }
    this.certificationsSubject.next(certifications);
  }

  /** Get all pending certifications */
  getPendingCertifications(): Certification[] {
    return this.loadCertifications().filter(c => c.status === 'pending');
  }

  /** Resident requests a certification */
  requestCertification(residentId: number, details: any): Certification {
    const certifications = this.loadCertifications();
    const newCert: Certification = {
      id: Date.now(),
      residentId,
      details,
      status: 'pending'
    };
    certifications.push(newCert);
    this.saveCertifications(certifications);
    return newCert;
  }

  /** Approve a certification */
  approveCertification(id: number) {
    const certifications = this.loadCertifications();
    const cert = certifications.find(c => c.id === id);
    if (cert) {
      cert.status = 'approved';

      // Notify resident
      this.notificationService.showNotification(
        'Your certification request has been approved.',
        'resident'
      );

      // Notify official
      this.notificationService.showNotification(
        'Certification successfully approved.',
        'official'
      );

      this.saveCertifications(certifications);
    }
  }

  /** Cancel / reject a certification */
  cancelCertification(id: number) {
    const certifications = this.loadCertifications();
    const cert = certifications.find(c => c.id === id);
    if (cert) {
      cert.status = 'rejected';

      // Notify resident
      this.notificationService.showNotification(
        'Your certification request has been rejected.',
        'resident'
      );

      // Notify official
      this.notificationService.showNotification(
        'Certification request rejected.',
        'official'
      );

      this.saveCertifications(certifications);
    }
  }

  /** Reschedule a certification (update date/time) */
  rescheduleCertification(
    certificationId: number,
    newDetails: { date?: string; time?: string }
  ) {
    const certifications = this.loadCertifications();
    const cert = certifications.find(c => c.id === certificationId);
    if (cert && cert.status !== 'rejected') {
      cert.details = { ...cert.details, ...newDetails };

      // If previously approved, reset to pending
      if (cert.status === 'approved') {
        cert.status = 'pending';
      }

      // Notify resident
      this.notificationService.showNotification(
        'Your certification request has been rescheduled.',
        'resident'
      );

      // Notify official
      this.notificationService.showNotification(
        'Certification request has been rescheduled.',
        'official'
      );

      this.saveCertifications(certifications);
    }
  }
}