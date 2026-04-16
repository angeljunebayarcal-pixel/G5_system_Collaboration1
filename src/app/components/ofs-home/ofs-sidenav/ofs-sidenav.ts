import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, HostListener, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-ofs-sidenav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './ofs-sidenav.html',
  styleUrl: './ofs-sidenav.scss',
})
export class OfsSidenav implements OnInit, AfterViewInit {
  isSidebarOpen = true;
  isMobileOrTablet = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.checkScreenSize();

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        setTimeout(() => {
          this.checkScreenSize();
        }, 0);
      });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.checkScreenSize();
    }, 0);
  }

  private blurActiveElement(): void {
    const active = document.activeElement as HTMLElement | null;
    if (active) {
      active.blur();
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    const wasMobileOrTablet = this.isMobileOrTablet;
    const wasSidebarOpen = this.isSidebarOpen;

    this.checkScreenSize();

    if (wasMobileOrTablet && wasSidebarOpen && this.isMobileOrTablet && !this.isSidebarOpen) {
      this.blurActiveElement();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isMobileOrTablet || !this.isSidebarOpen) return;

    const target = event.target as HTMLElement | null;
    if (!target) return;

    const clickedInsideSidebar = !!target.closest('.sidenav');
    const clickedToggleButton = !!target.closest('.menu-toggle');

    if (!clickedInsideSidebar && !clickedToggleButton) {
      this.blurActiveElement();
      this.isSidebarOpen = false;
    }
  }

  checkScreenSize(): void {
    const isNowMobileOrTablet = window.innerWidth <= 768;

    this.isMobileOrTablet = isNowMobileOrTablet;

    if (!isNowMobileOrTablet) {
      this.isSidebarOpen = true;
    } else if (this.isSidebarOpen !== false && this.isSidebarOpen !== true) {
      this.isSidebarOpen = false;
    }
  }

  toggleSidebar(): void {
    if (this.isSidebarOpen) {
      this.blurActiveElement();
    }

    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    if (this.isMobileOrTablet) {
      this.blurActiveElement();
      this.isSidebarOpen = false;
    }
  }

  handleNavClick(): void {
    if (this.isMobileOrTablet) {
      this.blurActiveElement();
      this.isSidebarOpen = false;
    }
  }
}