import { CommonModule } from '@angular/common';
import { Component, NgZone, OnInit } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';


@Component({
  selector: 'app-ofs-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ofs-topbar.html',
  styleUrl: './ofs-topbar.scss',
})
export class OfsTopbar implements OnInit {
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
          this.displayName = profile.fullName || 'Official User';
          this.displayRole = 'Officials';
          this.initials = this.getInitials(this.displayName);
        } else {
          this.displayName = 'Official User';
          this.displayRole = 'Officials';
          this.initials = 'OU';
        }

        this.isLoaded = true;
      });
    } catch (error) {
      console.error('Official topbar load failed:', error);
      this.zone.run(() => {
        this.displayName = 'Official User';
        this.displayRole = 'Officials';
        this.initials = 'OU';
        this.isLoaded = true;
      });
    }
  }

   goToSettings(event: Event) {
    event.stopPropagation(); 
    this.router.navigate(['/ofs-home/ofs-settings']);
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