import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ofs-settings',
  imports: [],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings {
   constructor(private router: Router) {}

  logout() {
    this.router.navigate(['/login']); 
  }
}
