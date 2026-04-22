import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { AuthService } from '../../../services/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-approvalqueue',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './approvalqueue.html',
  styleUrl: './approvalqueue.scss',
})
export class Approvalqueue implements OnInit {
  loading = true;
  pendingOfficials: any[] = [];
  officialSearch = '';

  constructor(
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  async ngOnInit(): Promise<void> {
    this.loading = true;
    this.cdr.detectChanges();
    

    setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.cdr.detectChanges();
      }
    }, 8000);

    await this.loadPendingOfficials();
  }

  get filteredPendingOfficials(): any[] {
  const keyword = this.officialSearch.trim().toLowerCase();

  if (!keyword) {
    return this.pendingOfficials;
  }

  return this.pendingOfficials.filter((official) => {
    const fullName = (official.fullName || '').toLowerCase();
    const email = (official.email || '').toLowerCase();
    const role = 'official';
    const status = (official.status || '').toLowerCase();
    const fileName = (official.validIdFileName || '').toLowerCase();

    return (
      fullName.includes(keyword) ||
      email.includes(keyword) ||
      role.includes(keyword) ||
      status.includes(keyword) ||
      fileName.includes(keyword)
    );
  });
}

  async loadPendingOfficials(): Promise<void> {
    try {
      this.loading = true;
      this.cdr.detectChanges();

      const officials = await this.authService.getPendingOfficials();

      this.ngZone.run(() => {
        this.pendingOfficials = officials || [];
        this.loading = false;
        this.cdr.detectChanges();
      });
    } catch (error) {
      console.error('Failed to load pending officials:', error);

      this.ngZone.run(() => {
        this.loading = false;
        this.pendingOfficials = [];
        this.cdr.detectChanges();
      });

      Swal.fire('Error', 'Failed to load approval queue.', 'error');
    }
  }

  viewPdf(base64: string): void {
    if (!base64) {
      Swal.fire('No File', 'No PDF was uploaded by this official.', 'info');
      return;
    }

    const pdfWindow = window.open('', '_blank');
    if (pdfWindow) {
      pdfWindow.document.write(`
        <html>
          <head>
            <title>Official PDF Preview</title>
            <style>
              html, body {
                margin: 0;
                padding: 0;
                height: 100%;
                overflow: hidden;
              }
              iframe {
                width: 100%;
                height: 100%;
                border: none;
              }
            </style>
          </head>
          <body>
            <iframe src="${base64}"></iframe>
          </body>
        </html>
      `);
      pdfWindow.document.close();
    }
  }

  async approveOfficial(uid: string, fullName: string): Promise<void> {
    const result = await Swal.fire({
      title: 'Approve Official?',
      text: `Are you sure you want to approve ${fullName}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Approve',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
      await this.authService.updateUserStatus(uid, 'active');

      await Swal.fire(
        'Approved',
        `${fullName} has been approved successfully.`,
        'success'
      );

      await this.loadPendingOfficials();
    } catch (error) {
      console.error('Approval failed:', error);
      Swal.fire('Error', 'Failed to approve official.', 'error');
    }
  }

  async declineOfficial(uid: string, fullName: string): Promise<void> {
    const result = await Swal.fire({
      title: 'Decline Official?',
      text: `Are you sure you want to decline ${fullName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Decline',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
      await this.authService.updateUserStatus(uid, 'declined');

      await Swal.fire(
        'Declined',
        `${fullName} has been declined.`,
        'success'
      );

      await this.loadPendingOfficials();
    } catch (error) {
      console.error('Decline failed:', error);
      Swal.fire('Error', 'Failed to decline official.', 'error');
    }
  }
}