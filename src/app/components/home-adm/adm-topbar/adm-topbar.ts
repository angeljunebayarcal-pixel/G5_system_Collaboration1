import { CommonModule } from '@angular/common';
import { Component, NgZone, OnInit } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-adm-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './adm-topbar.html',
  styleUrl: './adm-topbar.scss',
})
export class AdmTopbar implements OnInit {
  displayName = '';
  displayRole = '';
  initials = '';
  isLoaded = false;

  constructor(
    private authService: AuthService,
    private zone: NgZone,
    private router: Router
  ) {}

  async ngOnInit() {
    try {
      const profile = await this.authService.getProfileData();

      this.zone.run(() => {
        if (profile) {
          this.displayName = profile.fullName || 'Admin User';
          this.displayRole = 'Administrator';
          this.initials = this.getInitials(this.displayName);
        } else {
          this.displayName = 'Admin User';
          this.displayRole = 'Administrator';
          this.initials = 'AU';
        }

        this.isLoaded = true;
      });
    } catch (error) {
      console.error('Admin topbar load failed:', error);
      this.zone.run(() => {
        this.displayName = 'Admin User';
        this.displayRole = 'Administrator';
        this.initials = 'AU';
        this.isLoaded = true;
      });
    }
  }

  goToSettings(event: Event) {
    event.stopPropagation();
    this.router.navigate(['/home-adm/adm-settings']);
  }

  private getInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('');
  }
}