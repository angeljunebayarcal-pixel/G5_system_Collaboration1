import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  constructor(private router: Router) {}

  refreshData() {
    alert('Refreshing dashboard data...');
  }

  viewAppointments() {
    this.router.navigate(['/home/bookappointment']);
  }

  viewCertificates() {
    this.router.navigate(['/home/certificaterequest']);
  }

  viewNotifications() {
    this.router.navigate(['/home/notification']);
  }

  viewAllActivity() {
    alert('Opening activity log...');
  }

  newAppointment() {
    this.router.navigate(['/home/bookappointment']);
  }

  newRequest() {
    this.router.navigate(['/home/certificaterequest']);
  }

  updateProfile() {
    this.router.navigate(['/home/profile']);
  }
}
