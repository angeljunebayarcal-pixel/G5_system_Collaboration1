import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ofs-settings',
  imports: [],
  templateUrl: './ofs-settings.html',
  styleUrl: './ofs-settings.scss',
})
export class OfsSettings {
   constructor(private router: Router) {}

  logout() {
    this.router.navigate(['/login']); 
  }
}
