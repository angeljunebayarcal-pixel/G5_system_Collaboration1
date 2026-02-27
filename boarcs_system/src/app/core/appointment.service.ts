import { Injectable } from '@angular/core';
import { NotificationService } from './notification.service';

export interface Appointment {
  id: number;
  residentId: number;
  details: any;
  status: 'pending' | 'approved' | 'canceled';
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private storageKey = 'appointments';

  constructor(private notificationService: NotificationService) {}

  private loadAppointments(): Appointment[] {
    if (typeof localStorage === 'undefined') return []; // SSR-safe
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  private saveAppointments(appointments: Appointment[]) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(appointments));
    }
  }

  getAppointments(): Appointment[] {
    return this.loadAppointments();
  }

  getAppointmentsByResident(residentId: number): Appointment[] {
    return this.loadAppointments().filter(a => a.residentId === residentId);
  }

  getPendingAppointments(): Appointment[] {
    return this.loadAppointments().filter(a => a.status === 'pending');
  }

  requestAppointment(residentId: number, details: any): Appointment {
    const appointments = this.loadAppointments();
    const newAppointment: Appointment = {
      id: Date.now(),
      residentId,
      details,
      status: 'pending'
    };
    appointments.push(newAppointment);
    this.saveAppointments(appointments);
    return newAppointment;
  }

  approveAppointment(appointmentId: number) {
    const appointments = this.loadAppointments();
    const app = appointments.find(a => a.id === appointmentId);
    if (app) {
      app.status = 'approved';

      // Notify resident
      this.notificationService.showNotification(
        'Your appointment has been approved.',
        'resident'
      );

      // Notify official
      this.notificationService.showNotification(
        'Appointment successfully approved.',
        'official'
      );

      this.saveAppointments(appointments);
    }
  }

  cancelAppointment(appointmentId: number) {
    const appointments = this.loadAppointments();
    const app = appointments.find(a => a.id === appointmentId);
    if (app) {
      app.status = 'canceled';

      // Notify resident
      this.notificationService.showNotification(
        'Your appointment has been declined.',
        'resident'
      );

      // Notify official
      this.notificationService.showNotification(
        'Appointment successfully declined.',
        'official'
      );

      this.saveAppointments(appointments);
    }
  }

  rescheduleAppointment(
    appointmentId: number,
    newDetails: { date?: string; time?: string }
  ) {
    const appointments = this.loadAppointments();
    const app = appointments.find(a => a.id === appointmentId);
    if (app && app.status !== 'canceled') {
      app.details = { ...app.details, ...newDetails };
      app.status = 'pending';

      // Notify resident
      this.notificationService.showNotification(
        'Your appointment has been rescheduled.',
        'resident'
      );

      // Notify official
      this.notificationService.showNotification(
        'Appointment has been rescheduled.',
        'official'
      );

      this.saveAppointments(appointments);
    }
  }
}