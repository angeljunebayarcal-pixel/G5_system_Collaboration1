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

// ✅ ADDED
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
  displayName = '';
  displayRole = '';
  initials = '';
  photoURL = '';
  isLoaded = false;
  menuOpen = false;

  // ✅ ADDED: notification count
  notificationCount = 0;

  // ✅ ADDED
  private notifSub?: Subscription;
  private residentId: string | null = null;

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

    // ✅ ADDED: init notification system
    await this.initNotifications();
  }

  ngOnDestroy() {
    window.removeEventListener('profile-updated', this.handleProfileUpdated);

    // ✅ ADDED
    this.notifSub?.unsubscribe();
  }

  // ✅ ADDED: initialize notification listener
  private async initNotifications() {
    const user = await this.authService.getCurrentUserAsync();
    this.residentId = user?.uid || null;

    if (!this.residentId) return;

    this.notifSub = this.notifService
      .loadNotifications('resident', this.residentId)
      .subscribe({
        next: (data: AppNotification[]) => {
          this.zone.run(() => {
            // count unread only
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
        this.photoURL = profile.photoURL || '';
        this.isLoaded = true;
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
          this.photoURL = profile.photoURL || '';

          const cacheKey = this.getProfileCacheKey(profile.uid);
          if (cacheKey) {
            localStorage.setItem(cacheKey, JSON.stringify(profile));
          }
        } else {
          this.displayName = 'Resident User';
          this.displayRole = 'Residents';
          this.initials = 'RU';
          this.photoURL = '';
        }

        this.isLoaded = true;
      });
    } catch (error) {
      console.error('Topbar load failed:', error);
      this.zone.run(() => {
        if (!this.displayName) {
          this.displayName = 'Resident User';
          this.displayRole = 'Residents';
          this.initials = 'RU';
          this.photoURL = '';
        }
        this.isLoaded = true;
      });
    }
  }

  // ✅ ALREADY ADDED BEFORE (keep this)
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