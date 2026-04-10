import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  NgZone,
  OnDestroy,
  OnInit
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-adm-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './adm-topbar.html',
  styleUrl: './adm-topbar.scss',
})
export class AdmTopbar implements OnInit, OnDestroy {
  displayName = 'Admin User';
  displayRole = 'Administrator';
  initials = 'AU';
  photoURL = '';
  isLoaded = true;
  menuOpen = false;

  notificationCount = 0;
  private notificationInterval: any;

  constructor(
    private authService: AuthService,
    private zone: NgZone,
    private router: Router
  ) {}

  async ngOnInit() {
    window.addEventListener('profile-updated', this.handleProfileUpdated);

    this.loadFastThenFresh();
    this.loadPendingApprovalCount();
    this.startNotificationAutoRefresh();
  }

  ngOnDestroy() {
    window.removeEventListener('profile-updated', this.handleProfileUpdated);

    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
    }
  }

  private handleProfileUpdated = () => {
    this.loadFastThenFresh();
  };

  private async loadFastThenFresh() {
    const uid = this.authService.getCurrentUserId();

    if (uid) {
      this.loadFromCache(uid);

      const authUser = await this.authService.getCurrentUserAsync();
      if (authUser) {
        this.zone.run(() => {
          if (authUser.displayName && (!this.displayName || this.displayName === 'Admin User')) {
            this.displayName = authUser.displayName;
            this.initials = this.getInitials(this.displayName);
          }

          if (authUser.photoURL && !this.photoURL) {
            this.photoURL = authUser.photoURL;
          }
        });
      }

      setTimeout(() => {
        this.loadProfileFresh();
      }, 0);

      return;
    }

    const user = await this.authService.getCurrentUserAsync();

    if (!user?.uid) {
      return;
    }

    this.loadFromCache(user.uid);

    this.zone.run(() => {
      if (user.displayName && (!this.displayName || this.displayName === 'Admin User')) {
        this.displayName = user.displayName;
        this.initials = this.getInitials(this.displayName);
      }

      if (user.photoURL && !this.photoURL) {
        this.photoURL = user.photoURL;
      }
    });

    setTimeout(() => {
      this.loadProfileFresh();
    }, 0);
  }

  private getCacheKey(uid: string) {
    return `adm_profile_cache_${uid}`;
  }

  private loadFromCache(uid: string) {
    try {
      const raw = localStorage.getItem(this.getCacheKey(uid));
      if (!raw) return;

      const profile = JSON.parse(raw);

      this.zone.run(() => {
        this.displayName = profile.fullName || 'Admin User';
        this.displayRole = this.mapRole(profile.role);
        this.initials = this.getInitials(this.displayName);
        this.photoURL = profile.photoURL || '';
        this.isLoaded = true;
      });
    } catch {}
  }

  private async loadProfileFresh() {
    try {
      const profile = await this.authService.getProfileData();

      this.zone.run(() => {
        if (profile) {
          this.displayName = profile.fullName || 'Admin User';
          this.displayRole = this.mapRole(profile.role);
          this.initials = this.getInitials(this.displayName);
          this.photoURL = profile.photoURL || this.photoURL || '';

          localStorage.setItem(
            this.getCacheKey(profile.uid),
            JSON.stringify(profile)
          );
        }

        this.isLoaded = true;
      });
    } catch {
      this.zone.run(() => {
        this.isLoaded = true;
      });
    }
  }

  private async loadPendingApprovalCount() {
    try {
      const data = await this.authService.getPendingOfficials();

      this.zone.run(() => {
        this.notificationCount = data.length;
      });
    } catch (err) {
      console.error(err);
    }
  }

  private startNotificationAutoRefresh() {
    this.notificationInterval = setInterval(() => {
      this.loadPendingApprovalCount();
    }, 10000);
  }

  goToApprovalQueue(event: Event) {
    event.stopPropagation();
    this.menuOpen = false;
    this.router.navigate(['/home-adm/approvalqueue']);
  }

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.menuOpen = !this.menuOpen;
  }

  goToSettings(event: Event) {
    event.stopPropagation();
    this.menuOpen = false;
    this.router.navigate(['/home-adm/adm-settings']);
  }

  async logout(event: Event) {
    event.stopPropagation();
    this.menuOpen = false;

    const uid = this.authService.getCurrentUserId();
    if (uid) {
      localStorage.removeItem(this.getCacheKey(uid));
    }

    this.displayName = 'Admin User';
    this.displayRole = 'Administrator';
    this.initials = 'AU';
    this.photoURL = '';
    this.isLoaded = true;
    this.notificationCount = 0;

    await this.authService.logout();
    this.router.navigate(['/login']);
  }

  @HostListener('document:click')
  closeMenu() {
    this.menuOpen = false;
  }

  private mapRole(role: string): string {
    if (role === 'admin') return 'Administrator';
    if (role === 'official') return 'Officials';
    return 'Administrator';
  }

  private getInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0].toUpperCase())
      .join('');
  }
}