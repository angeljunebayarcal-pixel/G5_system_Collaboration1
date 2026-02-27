import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ofs-dashboard',
  imports: [],
  templateUrl: './ofs-dashboard.html',
  styleUrl: './ofs-dashboard.scss',
})
export class OfsDashboard {
  constructor(private router: Router) {}

  refreshData() {
    alert('Refreshing dashboard data...');
  }

  exportReport() {
    alert('Generating monthly report PDF...');
  }

  refreshStats() {
    alert('Syncing with central database...');
  }

  viewAllRequests() {
    alert('Redirecting to full request list...');
  }

  reviewRequest(residentName: string) {
    alert('Reviewing application for: ' + residentName);
  }

  announce() {
    const msg = prompt('Enter announcement message:');
    if (msg) alert('Announcement sent: ' + msg);
  }

  manageResidents() {
    this.router.navigate(['/ofs-home/ofs-residentsdirectory']);
  }

  systemLogs() {
    alert('Accessing system audit logs...');
  }
  
}
