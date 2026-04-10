import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  NgZone,
  OnDestroy,
  OnInit
} from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService } from '../../../services/auth.service';
import {
  NotificationService,
  AppNotification
} from '../../../services/notification.service';

@Component({
  selector: 'app-ofs-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ofs-topbar.html',
  styleUrl: './ofs-topbar.scss',
})
export class OfsTopbar implements OnInit, OnDestroy {
  displayName = 'Official User';
  displayRole = 'Officials';
  initials = 'OU';
  photoURL = '';
  isLoaded = true;
  menuOpen = false;

  notificationCount = 0;

  private notifSub?: Subscription;
  private officialId: string | null = null;
  private isDestroyed = false;
  private isLoggingOut = false;
  private refreshTimer: any = null;

  constructor(
    private authService: AuthService,
    private zone: NgZone,
    private router: Router,
    private notifService: NotificationService
  ) {}

  async ngOnInit() {
    this.isDestroyed = false;
    this.isLoggingOut = false;

    window.addEventListener('profile-updated', this.handleProfileUpdated);

    this.loadFastThenFresh();
    this.initNotifications();
  }

  ngOnDestroy() {
    this.isDestroyed = true;

    window.removeEventListener('profile-updated', this.handleProfileUpdated);
    this.notifSub?.unsubscribe();

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private async initNotifications() {
    if (this.isDestroyed || this.isLoggingOut) return;

    const currentUser = await this.authService.getCurrentUserAsync();

    if (this.isDestroyed || this.isLoggingOut) return;

    this.officialId = currentUser?.uid || null;

    if (!this.officialId) return;

    this.notifSub = this.notifService
      .loadNotifications('official', this.officialId)
      .subscribe({
        next: (data: AppNotification[]) => {
          if (this.isDestroyed || this.isLoggingOut) return;

          this.zone.run(() => {
            this.notificationCount = data.filter(n => !n.isRead).length;
          });
        },
        error: (err) => {
          if (this.isLoggingOut || this.isDestroyed) return;
          console.error('Official notification error:', err);
        }
      });
  }

  private handleProfileUpdated = () => {
    if (this.isDestroyed || this.isLoggingOut) return;
    this.loadFastThenFresh();
  };

  private async loadFastThenFresh() {
    if (this.isDestroyed || this.isLoggingOut) return;

    const currentUid = this.authService.getCurrentUserId();

    if (currentUid) {
      this.loadFromUserCacheByUid(currentUid);

      const authUser = await this.authService.getCurrentUserAsync();

      if (this.isDestroyed || this.isLoggingOut) return;

      if (authUser) {
        this.zone.run(() => {
          if (authUser.displayName && (!this.displayName || this.displayName === 'Official User')) {
            this.displayName = authUser.displayName;
            this.initials = this.getInitials(this.displayName);
          }

          if (authUser.photoURL && !this.photoURL) {
            this.photoURL = authUser.photoURL;
          }
        });
      }

      this.scheduleFreshProfileLoad();
      return;
    }

    const user = await this.authService.getCurrentUserAsync();

    if (this.isDestroyed || this.isLoggingOut) return;
    if (!user?.uid) return;

    this.loadFromUserCacheByUid(user.uid);

    this.zone.run(() => {
      if (user.displayName && (!this.displayName || this.displayName === 'Official User')) {
        this.displayName = user.displayName;
        this.initials = this.getInitials(this.displayName);
      }

      if (user.photoURL && !this.photoURL) {
        this.photoURL = user.photoURL;
      }
    });

    this.scheduleFreshProfileLoad();
  }

  private scheduleFreshProfileLoad() {
    if (this.isDestroyed || this.isLoggingOut) return;

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;

      if (this.isDestroyed || this.isLoggingOut) return;

      this.loadProfileFresh();
    }, 0);
  }

  private getProfileCacheKey(uid?: string): string | null {
    const resolvedUid = uid || this.authService.getCurrentUserId();
    return resolvedUid ? `ofs_profile_cache_${resolvedUid}` : null;
  }

  private loadFromUserCacheByUid(uid: string) {
    try {
      const cacheKey = this.getProfileCacheKey(uid);
      if (!cacheKey) return;

      const raw = localStorage.getItem(cacheKey);
      if (!raw) return;

      const profile = JSON.parse(raw);

      if (this.isDestroyed || this.isLoggingOut) return;

      this.zone.run(() => {
        this.displayName = profile.fullName || 'Official User';
        this.displayRole = this.mapRole(profile.role);
        this.initials = this.getInitials(this.displayName);
        this.photoURL = profile.photoURL || '';
        this.isLoaded = true;
      });
    } catch (error) {
      if (!this.isLoggingOut && !this.isDestroyed) {
        console.error('Official topbar cache load failed:', error);
      }
    }
  }

  private async loadProfileFresh() {
    if (this.isDestroyed || this.isLoggingOut) return;

    try {
      const currentUid = this.authService.getCurrentUserId();
      if (!currentUid) return;

      const profile = await this.authService.getProfileData();

      if (this.isDestroyed || this.isLoggingOut) return;

      this.zone.run(() => {
        if (profile) {
          this.displayName = profile.fullName || 'Official User';
          this.displayRole = this.mapRole(profile.role);
          this.initials = this.getInitials(this.displayName);
          this.photoURL = profile.photoURL || this.photoURL || '';

          const cacheKey = this.getProfileCacheKey(profile.uid);
          if (cacheKey) {
            localStorage.setItem(cacheKey, JSON.stringify(profile));
          }
        } else {
          this.displayName = 'Official User';
          this.displayRole = 'Officials';
          this.initials = 'OU';
          this.photoURL = '';
        }

        this.isLoaded = true;
      });
    } catch (error: any) {
      if (this.isDestroyed || this.isLoggingOut) return;

      const errorCode = error?.code || '';
      const errorMessage = String(error?.message || '');

      if (
        errorCode === 'permission-denied' ||
        errorMessage.toLowerCase().includes('missing or insufficient permissions')
      ) {
        return;
      }

      console.error('Official topbar load failed:', error);

      this.zone.run(() => {
        if (!this.displayName) {
          this.displayName = 'Official User';
          this.displayRole = 'Officials';
          this.initials = 'OU';
          this.photoURL = '';
        }

        this.isLoaded = true;
      });
    }
  }

  goToNotifications(event: Event) {
    event.stopPropagation();
    this.menuOpen = false;
    this.router.navigate(['/ofs-home/ofs-notification']);
  }

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.menuOpen = !this.menuOpen;
  }

  goToSettings(event: Event) {
    event.stopPropagation();
    this.menuOpen = false;
    this.router.navigate(['/ofs-home/ofs-settings']);
  }

  async logout(event: Event) {
    event.stopPropagation();
    this.menuOpen = false;
    this.isLoggingOut = true;

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    this.notifSub?.unsubscribe();
    this.officialId = null;

    const uid = this.authService.getCurrentUserId();
    if (uid) {
      localStorage.removeItem(`ofs_profile_cache_${uid}`);
    }

    this.displayName = 'Official User';
    this.displayRole = 'Officials';
    this.initials = 'OU';
    this.photoURL = '';
    this.isLoaded = true;
    this.notificationCount = 0;

    try {
      await this.authService.logout();
    } catch (error) {
      console.error('Official logout failed:', error);
    } finally {
      this.router.navigate(['/login']);
    }
  }

  @HostListener('document:click')
  closeMenuOnOutsideClick() {
    this.menuOpen = false;
  }

  private mapRole(role: string): string {
    if (role === 'resident') return 'Residents';
    if (role === 'official') return 'Officials';
    if (role === 'admin') return 'Administrator';
    return 'Officials';
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