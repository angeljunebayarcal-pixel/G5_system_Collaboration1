import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import Swal from 'sweetalert2'; // ✅ ADD THIS

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
      // ❌ ERROR POPUP
      Swal.fire({
        title: 'Login Failed',
        text: 'Invalid email or password',
        icon: 'error',
        confirmButtonColor: '#d33'
      });
      return;
    }

    // ✅ SUCCESS POPUP
    Swal.fire({
      title: 'Login Successful!',
      text: 'Welcome to the system 🎉',
      icon: 'success',
      timer: 1500,
      showConfirmButton: false
    }).then(() => {

      // Redirect based on role
      if (this.authService.isOfficial()) {
        this.router.navigate(['/ofs-home']);
      } else if (this.authService.isResident()) {
        this.router.navigate(['/home']);
      }

    });
  }
}