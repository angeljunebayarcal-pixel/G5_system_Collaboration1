import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  NgZone,
  OnInit,
  OnDestroy
} from '@angular/core';
import { Router } from '@angular/router';
import { onAuthStateChanged, User } from 'firebase/auth';
import { AuthService } from '../../../services/auth.service';
import { NotificationService, AppNotification } from '../../../services/notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class Topbar implements OnInit, OnDestroy {
  displayName = 'Resident User';
  displayRole = 'Residents';
  initials = 'RU';
  photoURL = '';
  isLoaded = true;
  photoReady = false;
  menuOpen = false;
  notificationCount = 0;

  private notifSub?: Subscription;
  private residentId: string | null = null;
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
          this.residentId = null;
          this.notificationCount = 0;
          this.displayName = 'Resident User';
          this.displayRole = 'Residents';
          this.initials = 'RU';
          this.photoURL = '';
          this.photoReady = false;
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

  private initNotifications(uid: string | null) {
    if (this.isDestroyed || this.isLoggingOut) return;

    this.residentId = uid;

    this.notifSub?.unsubscribe();
    this.notifSub = undefined;

    if (!uid) {
      this.zone.run(() => {
        this.notificationCount = 0;
      });
      return;
    }

    this.notifSub = this.notifService
      .loadNotifications('resident', uid)
      .subscribe({
        next: (data: AppNotification[]) => {
          if (this.isDestroyed || this.isLoggingOut) return;

          this.zone.run(() => {
            this.notificationCount = data.filter(n => !n.isRead).length;
          });
        },
        error: (err: any) => {
          if (this.isDestroyed || this.isLoggingOut) return;

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

          console.error('Topbar notification error:', err);
        }
      });
  }

  private handleProfileUpdated = () => {
    if (this.isDestroyed || this.isLoggingOut) return;

    const uid = this.authService.getCurrentUserId() || this.residentId;
    if (uid) {
      this.loadFromUserCacheByUid(uid);
      void this.loadProfileFresh(uid);
    }
  };

  private loadFastThenFresh(user: User) {
    if (this.isDestroyed || this.isLoggingOut || !user?.uid) return;

    this.residentId = user.uid;

    const hasCache = this.loadFromUserCacheByUid(user.uid);

    if (!hasCache) {
      this.applyAuthUserInstant(user);
    }

    void this.loadProfileFresh(user.uid);
  }

  private applyAuthUserInstant(user: User) {
    if (this.isDestroyed || this.isLoggingOut) return;

    this.zone.run(() => {
      const name = user.displayName || this.displayName || 'Resident User';

      this.displayName = name;
      this.displayRole = 'Residents';
      this.initials = this.getInitials(name);

      if (user.photoURL) {
        this.photoURL = user.photoURL;
        this.photoReady = true;
      }

      this.isLoaded = true;
    });
  }

  private getProfileCacheKey(uid?: string): string | null {
    const resolvedUid = uid || this.residentId || this.authService.getCurrentUserId();
    return resolvedUid ? `profile_cache_${resolvedUid}` : null;
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
        this.displayName = profile.fullName || 'Resident User';
        this.displayRole = this.mapRole(profile.role || 'resident');
        this.initials = this.getInitials(this.displayName);
        this.photoURL = profile.photoURL || '';
        this.photoReady = !!profile.photoURL;
        this.isLoaded = true;
      });

      return true;
    } catch (error) {
      const cacheKey = this.getProfileCacheKey(uid);
      if (cacheKey) {
        localStorage.removeItem(cacheKey);
      }

      if (!this.isLoggingOut && !this.isDestroyed) {
        console.error('Topbar cache load failed:', error);
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
        fullName: profile.fullName || 'Resident User',
        address: profile.address || '',
        contact: profile.contact || '',
        email: profile.email || '',
        username: profile.username || '',
        dob: profile.dob || '',
        gender: profile.gender || '',
        photoURL: profile.photoURL || '',
        emergencyContact: profile.emergencyContact || 'Barangay Admin Office',
        emergencyPhone: profile.emergencyPhone || '09123456789',
        role: 'resident'
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
        this.photoReady = !!normalizedProfile.photoURL;
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
        this.zone.run(() => {
          this.isLoaded = true;
        });
        return;
      }

      console.error('Topbar load failed:', error);

      this.zone.run(() => {
        this.isLoaded = true;
      });
    }
  }

  onProfileImageError() {
    this.photoURL = '';
    this.photoReady = false;
  }

  goToNotifications(event: Event) {
    event.stopPropagation();
    this.menuOpen = false;
    this.router.navigate(['/home/notification']);
  }

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.menuOpen = !this.menuOpen;
  }

  goToSettings(event: Event) {
    event.stopPropagation();
    this.menuOpen = false;
    this.router.navigate(['/home/settings']);
  }

  async logout(event: Event) {
    event.stopPropagation();
    this.menuOpen = false;
    this.isLoggingOut = true;

    this.displayName = 'Resident User';
    this.displayRole = 'Residents';
    this.initials = 'RU';
    this.photoURL = '';
    this.photoReady = false;
    this.isLoaded = true;
    this.notificationCount = 0;

    this.notifSub?.unsubscribe();
    this.residentId = null;

    try {
      await this.authService.logout();
    } catch (error) {
      console.error('Resident logout failed:', error);
    } finally {
      this.router.navigate(['/login']);
    }
  }

  @HostListener('document:click')
  closeMenuOnOutsideClick() {
    this.menuOpen = false;
  }

  private mapRole(role: string): string {
    const normalizedRole = String(role || '').toLowerCase();

    if (normalizedRole === 'resident') return 'Residents';
    if (normalizedRole === 'official') return 'Officials';
    if (normalizedRole === 'admin') return 'Administrator';

    return 'Residents';
  }

  private getInitials(name: string): string {
    const initials = String(name || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('');

    return initials || 'RU';
  }
}