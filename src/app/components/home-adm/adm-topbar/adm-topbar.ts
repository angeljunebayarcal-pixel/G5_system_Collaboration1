import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  NgZone,
  OnDestroy,
  OnInit
} from '@angular/core';
import { Router } from '@angular/router';
import { onAuthStateChanged, User } from 'firebase/auth';
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

  private notificationInterval: any = null;
  private adminId: string | null = null;
  private isDestroyed = false;
  private isLoggingOut = false;
  private stopAuthListener: (() => void) | null = null;

  constructor(
    private authService: AuthService,
    private zone: NgZone,
    private router: Router
  ) {}

  async ngOnInit() {
    this.isDestroyed = false;
    this.isLoggingOut = false;

    window.addEventListener('profile-updated', this.handleProfileUpdated);

    const auth = this.authService.getAuthInstance();

    const instantUser = auth.currentUser;
    if (instantUser?.uid) {
      this.loadFastThenFresh(instantUser);
    }

    this.stopAuthListener = onAuthStateChanged(auth, (user: User | null) => {
      if (this.isDestroyed || this.isLoggingOut) return;

      if (!user?.uid) {
        this.zone.run(() => {
          this.adminId = null;
          this.notificationCount = 0;
          this.displayName = 'Admin User';
          this.displayRole = 'Administrator';
          this.initials = 'AU';
          this.photoURL = '';
          this.isLoaded = true;
        });
        return;
      }

      this.loadFastThenFresh(user);
    });

    setTimeout(() => {
      if (this.isDestroyed || this.isLoggingOut) return;
      this.loadPendingApprovalCount();
      this.startNotificationAutoRefresh();
    }, 0);
  }

  ngOnDestroy() {
    this.isDestroyed = true;

    window.removeEventListener('profile-updated', this.handleProfileUpdated);
    this.stopAuthListener?.();
    this.stopAuthListener = null;

    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
      this.notificationInterval = null;
    }
  }

  private handleProfileUpdated = () => {
    if (this.isDestroyed || this.isLoggingOut) return;

    const uid = this.authService.getCurrentUserId() || this.adminId;
    if (uid) {
      this.loadFromCache(uid);
      void this.loadProfileFresh(uid);
    }
  };

  private loadFastThenFresh(user: User) {
    if (this.isDestroyed || this.isLoggingOut || !user?.uid) return;

    this.adminId = user.uid;

    const hasCache = this.loadFromCache(user.uid);

    if (!hasCache) {
      this.applyAuthUserInstant(user);
    }

    void this.loadProfileFresh(user.uid);
  }

  private applyAuthUserInstant(user: User) {
    if (this.isDestroyed || this.isLoggingOut) return;

    this.zone.run(() => {
      const name = user.displayName || this.displayName || 'Admin User';

      this.displayName = name;
      this.displayRole = 'Administrator';
      this.initials = this.getInitials(name);

      if (user.photoURL) {
        this.photoURL = user.photoURL;
      }

      this.isLoaded = true;
    });
  }

  private getCacheKey(uid: string) {
    return `adm_profile_cache_${uid}`;
  }

  private loadFromCache(uid: string): boolean {
    try {
      const raw = localStorage.getItem(this.getCacheKey(uid));
      if (!raw) return false;

      const profile = JSON.parse(raw);

      if (this.isDestroyed || this.isLoggingOut) return false;

      this.zone.run(() => {
        this.displayName = profile.fullName || 'Admin User';
        this.displayRole = this.mapRole(profile.role || 'admin');
        this.initials = this.getInitials(this.displayName);
        this.photoURL = profile.photoURL || '';
        this.isLoaded = true;
      });

      return true;
    } catch (error) {
      localStorage.removeItem(this.getCacheKey(uid));

      if (!this.isDestroyed && !this.isLoggingOut) {
        console.error('Admin topbar cache load failed:', error);
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
        fullName: profile.fullName || 'Admin User',
        address: profile.address || '',
        contact: profile.contact || '',
        email: profile.email || '',
        username: profile.username || '',
        dob: profile.dob || '',
        gender: profile.gender || '',
        photoURL: profile.photoURL || '',
        role: 'admin'
      };

      localStorage.setItem(
        this.getCacheKey(uid),
        JSON.stringify(normalizedProfile)
      );

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
        this.zone.run(() => {
          this.isLoaded = true;
        });
        return;
      }

      console.error('Admin topbar load failed:', error);

      this.zone.run(() => {
        this.isLoaded = true;
      });
    }
  }

  private async loadPendingApprovalCount() {
    if (this.isDestroyed || this.isLoggingOut) return;

    try {
      const data = await this.authService.getPendingOfficials();

      if (this.isDestroyed || this.isLoggingOut) return;

      this.zone.run(() => {
        this.notificationCount = data.length;
      });
    } catch (err) {
      if (!this.isDestroyed && !this.isLoggingOut) {
        console.error(err);
      }
    }
  }

  private startNotificationAutoRefresh() {
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
    }

    this.notificationInterval = setInterval(() => {
      if (this.isDestroyed || this.isLoggingOut) return;
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
    this.isLoggingOut = true;

    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
      this.notificationInterval = null;
    }

    this.displayName = 'Admin User';
    this.displayRole = 'Administrator';
    this.initials = 'AU';
    this.photoURL = '';
    this.isLoaded = true;
    this.notificationCount = 0;
    this.adminId = null;

    try {
      await this.authService.logout();
    } catch (error) {
      console.error('Admin logout failed:', error);
    } finally {
      this.router.navigate(['/login']);
    }
  }

  @HostListener('document:click')
  closeMenu() {
    this.menuOpen = false;
  }

  private mapRole(role: string): string {
    const normalizedRole = String(role || '').toLowerCase();

    if (normalizedRole === 'admin') return 'Administrator';
    if (normalizedRole === 'official') return 'Officials';
    if (normalizedRole === 'resident') return 'Residents';

    return 'Administrator';
  }

  private getInitials(name: string): string {
    const initials = String(name || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0].toUpperCase())
      .join('');

    return initials || 'AU';
  }
}