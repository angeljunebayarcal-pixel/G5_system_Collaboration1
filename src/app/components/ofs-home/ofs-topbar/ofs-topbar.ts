import { CommonModule } from '@angular/common';
import { Component, HostListener, NgZone, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';

// ✅ ADDED
import { NotificationService, AppNotification } from '../../../services/notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-ofs-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ofs-topbar.html',
  styleUrl: './ofs-topbar.scss',
})
export class OfsTopbar implements OnInit, OnDestroy {
  displayName = '';
  displayRole = '';
  initials = '';
  photoURL = '';
  isLoaded = false;
  menuOpen = false;

  // ✅ ADDED
  notificationCount = 0;
  private notifSub?: Subscription;
  private officialId: string | null = null;

  constructor(
    private authService: AuthService,
    private zone: NgZone,
    private router: Router,

    // ✅ ADDED
    private notifService: NotificationService
  ) {}

  async ngOnInit() {
    this.loadFastThenFresh();
    window.addEventListener('profile-updated', this.handleProfileUpdated);

    // ✅ ADDED
    await this.initNotifications();
  }

  ngOnDestroy() {
    window.removeEventListener('profile-updated', this.handleProfileUpdated);

    // ✅ ADDED
    this.notifSub?.unsubscribe();
  }

  // ✅ ADDED: initialize official notifications
  private async initNotifications() {
    const currentUser = await this.authService.getCurrentUserAsync();
    this.officialId = currentUser?.uid || null;

    if (!this.officialId) return;

    this.notifSub = this.notifService
      .loadNotifications('official', this.officialId)
      .subscribe({
        next: (data: AppNotification[]) => {
          this.zone.run(() => {
            // count unread only
            this.notificationCount = data.filter(n => !n.isRead).length;
          });
        },
        error: (err) => {
          console.error('Official notification error:', err);
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
    return resolvedUid ? `ofs_profile_cache_${resolvedUid}` : null;
  }

  private loadFromUserCacheByUid(uid: string) {
    try {
      const cacheKey = this.getProfileCacheKey(uid);
      if (!cacheKey) return;

      const raw = localStorage.getItem(cacheKey);
      if (!raw) return;

      const profile = JSON.parse(raw);

      this.zone.run(() => {
        this.displayName = profile.fullName || 'Official User';
        this.displayRole = this.mapRole(profile.role);
        this.initials = this.getInitials(this.displayName);
        this.photoURL = profile.photoURL || '';
        this.isLoaded = true;
      });
    } catch (error) {
      console.error('Official topbar cache load failed:', error);
    }
  }

  private async loadProfileFresh() {
    try {
      const profile = await this.authService.getProfileData();

      this.zone.run(() => {
        if (profile) {
          this.displayName = profile.fullName || 'Official User';
          this.displayRole = this.mapRole(profile.role);
          this.initials = this.getInitials(this.displayName);
          this.photoURL = profile.photoURL || '';

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
    } catch (error) {
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

  // ✅ ADDED (already used in HTML)
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