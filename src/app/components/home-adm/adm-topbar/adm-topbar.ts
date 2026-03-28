import { CommonModule } from '@angular/common';
import { Component, HostListener, NgZone, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-adm-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './adm-topbar.html',
  styleUrl: './adm-topbar.scss',
})
export class AdmTopbar implements OnInit, OnDestroy {
  displayName = '';
  displayRole = '';
  initials = '';
  photoURL = '';
  isLoaded = false;
  menuOpen = false;

  // ADDED: notification count for pending official registrations
  notificationCount = 0;

  // ADDED: auto refresh timer
  private notificationInterval: any;

  constructor(
    private authService: AuthService,
    private zone: NgZone,
    private router: Router
  ) {}

  async ngOnInit() {
    this.loadFastThenFresh();
    window.addEventListener('profile-updated', this.handleProfileUpdated);

    // ADDED: initial load + auto refresh for pending approvals
    await this.loadPendingApprovalCount();
    this.startNotificationAutoRefresh();
  }

  ngOnDestroy() {
    window.removeEventListener('profile-updated', this.handleProfileUpdated);

    // ADDED: clear timer
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
    }
  }

  private handleProfileUpdated = () => {
    this.loadFastThenFresh();
  };

  private async loadFastThenFresh() {
    const currentUid = this.authService.getCurrentUserId();

    if (currentUid) {
      this.loadFromUserCacheByUid(currentUid);
    } else {
      this.authService.getCurrentUserAsync().then((user) => {
        if (user?.uid && !this.isLoaded) {
          this.loadFromUserCacheByUid(user.uid);
        }
      });
    }

    await this.loadProfileFresh();
  }

  private getProfileCacheKey(uid?: string): string | null {
    const resolvedUid = uid || this.authService.getCurrentUserId();
    return resolvedUid ? `adm_profile_cache_${resolvedUid}` : null;
  }

  private loadFromUserCacheByUid(uid: string) {
    try {
      const cacheKey = this.getProfileCacheKey(uid);
      if (!cacheKey) return;

      const raw = localStorage.getItem(cacheKey);
      if (!raw) return;

      const profile = JSON.parse(raw);

      this.zone.run(() => {
        this.displayName = profile.fullName || 'Admin User';
        this.displayRole = this.mapRole(profile.role);
        this.initials = this.getInitials(this.displayName);
        this.photoURL = profile.photoURL || '';
        this.isLoaded = true;
      });
    } catch (error) {
      console.error('Admin topbar cache load failed:', error);
    }
  }

  private async loadProfileFresh() {
    try {
      const profile = await this.authService.getProfileData();

      this.zone.run(() => {
        if (profile) {
          this.displayName = profile.fullName || 'Admin User';
          this.displayRole = this.mapRole(profile.role);
          this.initials = this.getInitials(this.displayName);
          this.photoURL = profile.photoURL || '';

          const cacheKey = this.getProfileCacheKey(profile.uid);
          if (cacheKey) {
            localStorage.setItem(cacheKey, JSON.stringify(profile));
          }
        } else {
          this.displayName = 'Admin User';
          this.displayRole = 'Administrator';
          this.initials = 'AU';
          this.photoURL = '';
        }

        this.isLoaded = true;
      });
    } catch (error) {
      console.error('Admin topbar load failed:', error);
      this.zone.run(() => {
        if (!this.displayName) {
          this.displayName = 'Admin User';
          this.displayRole = 'Administrator';
          this.initials = 'AU';
          this.photoURL = '';
        }
        this.isLoaded = true;
      });
    }
  }

  // ADDED: load pending official registrations count
  private async loadPendingApprovalCount() {
    try {
      const pendingOfficials = await this.authService.getPendingOfficials();

      this.zone.run(() => {
        this.notificationCount = pendingOfficials.length;
      });
    } catch (error) {
      console.error('Failed to load pending approvals count:', error);
    }
  }

  // ADDED: auto refresh so bell updates when officials register
  private startNotificationAutoRefresh() {
    this.notificationInterval = setInterval(() => {
      this.loadPendingApprovalCount();
    }, 10000);
  }

  // ADDED: navigate to approval queue
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
    await this.authService.logout();
    this.router.navigate(['/login']);
  }

  @HostListener('document:click')
  closeMenuOnOutsideClick() {
    this.menuOpen = false;
  }

  private mapRole(role: string): string {
    if (role === 'resident') return 'Residents';
    if (role === 'official') return 'Officials';
    if (role === 'admin') return 'Administrator';
    return 'Administrator';
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