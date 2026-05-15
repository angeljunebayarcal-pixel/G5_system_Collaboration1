import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  NgZone,
  OnDestroy,
  OnInit
} from '@angular/core';
import { onAuthStateChanged, User } from 'firebase/auth';
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
  private stopAuthListener: (() => void) | null = null;

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

    const auth = this.authService.getAuthInstance();

    const instantUser = auth.currentUser;
    if (instantUser?.uid) {
      this.loadFastThenFresh(instantUser);
      this.initNotifications(instantUser.uid);
    }

    this.stopAuthListener = onAuthStateChanged(auth, (user: User | null) => {
      if (this.isDestroyed || this.isLoggingOut) return;

      this.notifSub?.unsubscribe();
      this.notifSub = undefined;

      if (!user?.uid) {
        this.zone.run(() => {
          this.officialId = null;
          this.notificationCount = 0;
          this.displayName = 'Official User';
          this.displayRole = 'Officials';
          this.initials = 'OU';
          this.photoURL = '';
          this.isLoaded = true;
        });
        return;
      }

      this.loadFastThenFresh(user);
      this.initNotifications(user.uid);
    });
  }

  ngOnDestroy() {
    this.isDestroyed = true;

    window.removeEventListener('profile-updated', this.handleProfileUpdated);
    this.notifSub?.unsubscribe();
    this.stopAuthListener?.();
    this.stopAuthListener = null;
  }

  private blurActiveElement(): void {
    const active = document.activeElement as HTMLElement | null;
    if (active) {
      active.blur();
    }
  }

  private closeMenuSafely(): void {
    this.blurActiveElement();
    this.menuOpen = false;
  }

  private initNotifications(uid: string | null) {
    if (this.isDestroyed || this.isLoggingOut) return;

    this.officialId = uid;

    this.notifSub?.unsubscribe();
    this.notifSub = undefined;

    if (!uid) {
      this.zone.run(() => {
        this.notificationCount = 0;
      });
      return;
    }

    this.notifSub = this.notifService
      .loadNotifications('official', uid)
      .subscribe({
        next: (data: AppNotification[]) => {
          if (this.isDestroyed || this.isLoggingOut) return;

          this.zone.run(() => {
            this.notificationCount = data.filter(n => !n.isRead).length;
          });
        },
        error: (err: any) => {
          if (this.isLoggingOut || this.isDestroyed) return;

          const errorCode = err?.code || '';
          const errorMessage = String(err?.message || '').toLowerCase();

          if (
            errorCode === 'permission-denied' ||
            errorMessage.includes('missing or insufficient permissions')
          ) {
            this.zone.run(() => {
              this.notificationCount = 0;
            });
            return;
          }

          console.error('Official notification error:', err);
        }
      });
  }

  private handleProfileUpdated = () => {
    if (this.isDestroyed || this.isLoggingOut) return;

    const uid = this.authService.getCurrentUserId() || this.officialId;
    if (uid) {
      this.loadFromUserCacheByUid(uid);
      void this.loadProfileFresh(uid);
    }
  };

  private loadFastThenFresh(user: User) {
    if (this.isDestroyed || this.isLoggingOut || !user?.uid) return;

    this.officialId = user.uid;

    const hasCache = this.loadFromUserCacheByUid(user.uid);

    if (!hasCache) {
      this.applyAuthUserInstant(user);
    }

    void this.loadProfileFresh(user.uid);
  }

  private applyAuthUserInstant(user: User) {
    if (this.isDestroyed || this.isLoggingOut) return;

    this.zone.run(() => {
      const name = user.displayName || this.displayName || 'Official User';

      this.displayName = name;
      this.displayRole = 'Officials';
      this.initials = this.getInitials(name);

      if (user.photoURL) {
        this.photoURL = user.photoURL;
      }

      this.isLoaded = true;
    });
  }

  private getProfileCacheKey(uid?: string): string | null {
    const resolvedUid = uid || this.officialId || this.authService.getCurrentUserId();
    return resolvedUid ? `ofs_profile_cache_${resolvedUid}` : null;
  }

  private loadFromUserCacheByUid(uid: string): boolean {
    try {
      const cacheKey = this.getProfileCacheKey(uid);
      if (!cacheKey) return false;

      const raw = localStorage.getItem(cacheKey);
      if (!raw) return false;

      const profile = JSON.parse(raw);

      if (this.isDestroyed || this.isLoggingOut) return false;

      this.zone.run(() => {
        this.displayName = profile.fullName || 'Official User';
        this.displayRole = this.mapRole(profile.role || 'official');
        this.initials = this.getInitials(this.displayName);
        this.photoURL = profile.photoURL || '';
        this.isLoaded = true;
      });

      return true;
    } catch (error) {
      const cacheKey = this.getProfileCacheKey(uid);
      if (cacheKey) {
        localStorage.removeItem(cacheKey);
      }

      if (!this.isLoggingOut && !this.isDestroyed) {
        console.error('Official topbar cache load failed:', error);
      }

      return false;
    }
  }

  private async loadProfileFresh(uid: string) {
    if (this.isDestroyed || this.isLoggingOut || !uid) return;

    try {
      const profile = await this.authService.getProfileData(uid);

      if (this.isDestroyed || this.isLoggingOut) return;

      if (!profile) {
        this.zone.run(() => {
          this.isLoaded = true;
        });
        return;
      }

      const normalizedProfile = {
        fullName: profile.fullName || 'Official User',
        address: profile.address || '',
        contact: profile.contact || '',
        email: profile.email || '',
        username: profile.username || '',
        dob: profile.dob || '',
        gender: profile.gender || '',
        photoURL: profile.photoURL || '',
        role: 'official'
      };

      const cacheKey = this.getProfileCacheKey(uid);
      if (cacheKey) {
        localStorage.setItem(cacheKey, JSON.stringify(normalizedProfile));
      }

      this.zone.run(() => {
        this.displayName = normalizedProfile.fullName;
        this.displayRole = this.mapRole(normalizedProfile.role);
        this.initials = this.getInitials(this.displayName);
        this.photoURL = normalizedProfile.photoURL;
        this.isLoaded = true;
      });
    } catch (error: any) {
      if (this.isDestroyed || this.isLoggingOut) return;

      const errorCode = error?.code || '';
      const errorMessage = String(error?.message || '').toLowerCase();

      if (
        errorCode === 'permission-denied' ||
        errorMessage.includes('missing or insufficient permissions')
      ) {
        return;
      }

      console.error('Official topbar load failed:', error);

      this.zone.run(() => {
        this.isLoaded = true;
      });
    }
  }

  goToNotifications(event: Event) {
    event.stopPropagation();
    this.closeMenuSafely();
    this.router.navigate(['/ofs-home/ofs-notification']);
  }

  toggleMenu(event: Event) {
    event.stopPropagation();

    if (this.menuOpen) {
      this.closeMenuSafely();
      return;
    }

    this.menuOpen = true;
  }

  goToSettings(event: Event) {
    event.stopPropagation();
    this.closeMenuSafely();
    this.router.navigate(['/ofs-home/ofs-settings']);
  }

  async logout(event: Event) {
    event.stopPropagation();
    this.closeMenuSafely();
    this.isLoggingOut = true;

    this.notifSub?.unsubscribe();
    this.officialId = null;

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
    if (this.menuOpen) {
      this.closeMenuSafely();
    }
  }

  private mapRole(role: string): string {
    const normalizedRole = String(role || '').toLowerCase();

    if (normalizedRole === 'resident') return 'Residents';
    if (normalizedRole === 'official') return 'Officials';
    if (normalizedRole === 'admin') return 'Administrator';

    return 'Officials';
  }

  private getInitials(name: string): string {
    const initials = String(name || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('');

    return initials || 'OU';
  }
}