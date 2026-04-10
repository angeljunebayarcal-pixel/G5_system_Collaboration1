import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  NgZone,
  OnInit,
  OnDestroy
} from '@angular/core';
import { Router } from '@angular/router';
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

  constructor(
    private authService: AuthService,
    private zone: NgZone,
    private router: Router,
    private notifService: NotificationService
  ) {}

  async ngOnInit() {
    window.addEventListener('profile-updated', this.handleProfileUpdated);

    this.loadFastThenFresh();
    this.initNotifications();
  }

  ngOnDestroy() {
    window.removeEventListener('profile-updated', this.handleProfileUpdated);
    this.notifSub?.unsubscribe();
  }

  private async initNotifications() {
    const user = await this.authService.getCurrentUserAsync();
    this.residentId = user?.uid || null;

    if (!this.residentId) return;

    this.notifSub = this.notifService
      .loadNotifications('resident', this.residentId)
      .subscribe({
        next: (data: AppNotification[]) => {
          this.zone.run(() => {
            this.notificationCount = data.filter(n => !n.isRead).length;
          });
        },
        error: (err) => {
          console.error('Topbar notification error:', err);
        }
      });
  }

  private handleProfileUpdated = () => {
    this.loadFastThenFresh();
  };

  private async loadFastThenFresh() {
    const currentUid = this.authService.getCurrentUserId();

    if (currentUid) {
      this.loadFromUserCacheByUid(currentUid);

      const authUser = await this.authService.getCurrentUserAsync();
      if (authUser?.displayName && !this.displayName) {
        this.displayName = authUser.displayName;
        this.initials = this.getInitials(this.displayName);
      }

      if (authUser?.photoURL) {
        this.setPhotoImmediately(authUser.photoURL);
      }

      setTimeout(() => {
        this.loadProfileFresh();
      }, 0);

      return;
    }

    const user = await this.authService.getCurrentUserAsync();
    if (!user?.uid) return;

    this.loadFromUserCacheByUid(user.uid);

    if (user.displayName && !this.displayName) {
      this.displayName = user.displayName;
      this.initials = this.getInitials(this.displayName);
    }

    if (user.photoURL) {
      this.setPhotoImmediately(user.photoURL);
    }

    setTimeout(() => {
      this.loadProfileFresh();
    }, 0);
  }

  private getProfileCacheKey(uid?: string): string | null {
    const resolvedUid = uid || this.authService.getCurrentUserId();
    return resolvedUid ? `profile_cache_${resolvedUid}` : null;
  }

  private loadFromUserCacheByUid(uid: string) {
    try {
      const cacheKey = this.getProfileCacheKey(uid);
      if (!cacheKey) return;

      const raw = localStorage.getItem(cacheKey);
      if (!raw) return;

      const profile = JSON.parse(raw);

      this.zone.run(() => {
        this.displayName = profile.fullName || 'Resident User';
        this.displayRole = this.mapRole(profile.role);
        this.initials = this.getInitials(this.displayName);

        if (profile.photoURL) {
          this.photoURL = profile.photoURL;
          this.photoReady = true;
        }
      });
    } catch (error) {
      console.error('Topbar cache load failed:', error);
    }
  }

  private async loadProfileFresh() {
    try {
      const profile = await this.authService.getProfileData();

      this.zone.run(() => {
        if (profile) {
          this.displayName = profile.fullName || 'Resident User';
          this.displayRole = this.mapRole(profile.role);
          this.initials = this.getInitials(this.displayName);

          const cacheKey = this.getProfileCacheKey(profile.uid);
          if (cacheKey) {
            localStorage.setItem(cacheKey, JSON.stringify(profile));
          }

          if (profile.photoURL) {
            this.photoURL = profile.photoURL;
            this.photoReady = true;
          } else {
            this.photoURL = '';
            this.photoReady = false;
          }
        } else {
          this.displayName = 'Resident User';
          this.displayRole = 'Residents';
          this.initials = 'RU';
          this.photoURL = '';
          this.photoReady = false;
        }

        this.isLoaded = true;
      });
    } catch (error) {
      console.error('Topbar load failed:', error);
      this.zone.run(() => {
        this.isLoaded = true;
      });
    }
  }

  private setPhotoImmediately(url: string) {
    if (!url) return;

    this.zone.run(() => {
      this.photoURL = url;
      this.photoReady = true;
    });
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

    const uid = this.authService.getCurrentUserId();
    const cacheKey = this.getProfileCacheKey(uid || undefined);

    if (cacheKey) {
      localStorage.removeItem(cacheKey);
    }

    this.displayName = 'Resident User';
    this.displayRole = 'Residents';
    this.initials = 'RU';
    this.photoURL = '';
    this.photoReady = false;
    this.isLoaded = true;
    this.notificationCount = 0;

    this.notifSub?.unsubscribe();
    this.residentId = null;

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
    return 'Residents';
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