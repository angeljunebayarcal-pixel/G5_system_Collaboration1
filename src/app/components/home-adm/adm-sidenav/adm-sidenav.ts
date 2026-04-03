import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  HostListener,
  OnInit,
} from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-adm-sidenav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './adm-sidenav.html',
  styleUrl: './adm-sidenav.scss',
})
export class AdmSidenav implements OnInit, AfterViewInit {
  isSidebarOpen = true;
  isMobileOrTablet = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.checkScreenSize();

    // Re-check after every route change
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        setTimeout(() => {
          this.checkScreenSize();
        }, 0);
      });
  }

  ngAfterViewInit(): void {
    // Re-check once view is fully rendered
    setTimeout(() => {
      this.checkScreenSize();
    }, 0);
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkScreenSize();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isMobileOrTablet || !this.isSidebarOpen) return;

    const target = event.target as HTMLElement | null;
    if (!target) return;

    const clickedInsideSidebar = !!target.closest('.sidenav');
    const clickedToggleButton = !!target.closest('.menu-toggle');

    if (!clickedInsideSidebar && !clickedToggleButton) {
      this.isSidebarOpen = false;
    }
  }

  checkScreenSize(): void {
    this.isMobileOrTablet = window.innerWidth <= 768;
    this.isSidebarOpen = !this.isMobileOrTablet;
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    if (this.isMobileOrTablet) {
      this.isSidebarOpen = false;
    }
  }

  handleNavClick(): void {
    if (this.isMobileOrTablet) {
      this.isSidebarOpen = false;
    }
  }
}