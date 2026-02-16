import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login {

  email = '';
  password = '';

  constructor(private router: Router) {}

  login() {

    // OFFICIAL ACCOUNT
    if (this.email === 'official@gmail.com' && this.password === '123') {
      this.router.navigate(['/ofs-home']); 
      return;
    }

    // RESIDENT ACCOUNT (example)
    if (this.email === 'ajbayarcal@gmail.com' && this.password === '123') {
      this.router.navigate(['/home']);  
      return;
    }

    // If wrong login
    alert('Invalid please try again');
  }
}
