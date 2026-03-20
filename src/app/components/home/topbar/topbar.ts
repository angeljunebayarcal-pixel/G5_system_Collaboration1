import { CommonModule } from '@angular/common';
import { Component, NgZone, OnInit } from '@angular/core';
import { Router } from '@angular/router'; // ✅ ADDED
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class Topbar implements OnInit {
  displayName = '';
  displayRole = '';
  initials = '';
  isLoaded = false;

  constructor(
    private authService: AuthService,
    private zone: NgZone,
    private router: Router // ✅ ADDED
  ) {}

  async ngOnInit() {
    try {
      const profile = await this.authService.getProfileData();

      this.zone.run(() => {
        if (profile) {
          this.displayName = profile.fullName || 'Resident User';
          this.displayRole = 'Residents';
          this.initials = this.getInitials(this.displayName);
        } else {
          this.displayName = 'Resident User';
          this.displayRole = 'Residents';
          this.initials = 'RU';
        }

        this.isLoaded = true;
      });
    } catch (error) {
      console.error('Topbar load failed:', error);
      this.zone.run(() => {
        this.displayName = 'Resident User';
        this.displayRole = 'Residents';
        this.initials = 'RU';
        this.isLoaded = true;
      });
    }
  }

  
  goToSettings(event: Event) {
    event.stopPropagation(); 
    this.router.navigate(['/home/settings']);
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