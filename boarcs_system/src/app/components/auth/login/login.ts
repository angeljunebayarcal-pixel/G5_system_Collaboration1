import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';

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

  constructor(private router: Router, private authService: AuthService) {}

  login() {
    const success = this.authService.login(this.email, this.password);

    if (!success) {
      alert('Invalid email or password');
      return;
    }

    // Redirect based on role
    if (this.authService.isOfficial()) {
      this.router.navigate(['/ofs-home']); // Officials dashboard
    } else if (this.authService.isResident()) {
      this.router.navigate(['/home']); // Residents dashboard
    }
  }
}
