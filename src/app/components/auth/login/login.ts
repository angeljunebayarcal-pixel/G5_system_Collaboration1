import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AuthService } from '../../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class Login implements OnInit {
  email = '';
  password = '';

  showPassword = false;
  showRegister = false;
  showRegPassword = false;

  regEmail = '';
  regPassword = '';
  regFullName = '';

  uploadedOfficialFile: File | null = null;
  uploadedOfficialFileName = '';

  isLoggingIn = false;
  isRegistering = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.showPassword = false;
    this.showRegPassword = false;
  }

  // ✅ ENTER KEY LOGIN
  @HostListener('document:keydown.enter', ['$event'])
handleEnterKey(event: Event) {
  if (!this.showRegister) {
    event.preventDefault();
    this.login();
  }
}

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleRegPassword() {
    this.showRegPassword = !this.showRegPassword;
  }

  async login() {
    if (this.isLoggingIn) return;

    if (!this.email.trim() || !this.password.trim()) {
      Swal.fire('Missing Fields', 'Please enter email and password', 'warning');
      return;
    }

    this.isLoggingIn = true;

    Swal.fire({
      title: 'Signing in...',
      text: 'Please wait a moment',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      // ❌ REMOVED logout() → this was slowing things down

      const cred = await this.authService.login(
        this.email.trim(),
        this.password
      );

      const uid = cred.user.uid;

      // ⚡ PARALLEL FETCH (already optimized)
      const [role, status] = await Promise.all([
        this.authService.getUserRole(uid),
        this.authService.getUserStatus(uid)
      ]);

      Swal.close();

      if (!role) {
        await this.authService.logout();
        Swal.fire('Login Failed', 'No valid role found', 'error');
        return;
      }

      if (role === 'official' && status !== 'active') {
        await this.authService.logout();

        if (status === 'pending') {
          Swal.fire(
            'Approval Required',
            'Your official account is still pending admin approval.',
            'warning'
          );
        } else if (status === 'declined') {
          Swal.fire(
            'Access Denied',
            'Your official registration has been declined by the admin.',
            'error'
          );
        } else {
          Swal.fire(
            'Access Denied',
            'Your official account is not yet allowed to login.',
            'error'
          );
        }

        return;
      }

      await Swal.fire({
        title: 'Login Successful!',
        icon: 'success',
        timer: 800, // ⚡ slightly faster
        showConfirmButton: false
      });

      // ⚡ faster redirect (no reload flicker)
      if (role === 'admin') {
        this.router.navigate(['/home-adm/controlcenter']);
      } else if (role === 'official') {
        this.router.navigate(['/ofs-home/ofs-dashboard']);
      } else {
        this.router.navigate(['/home/dashboard']);
      }

    } catch (err: any) {
      Swal.close();

      Swal.fire(
        'Login Failed',
        err?.message || 'Invalid email or password',
        'error'
      );
    } finally {
      this.isLoggingIn = false;
      this.showPassword = false;
      this.showRegPassword = false;
    }
  }

  async registerOfficial() {
    if (this.isRegistering) return;

    if (!this.regFullName || !this.regEmail || !this.regPassword || !this.uploadedOfficialFile) {
      Swal.fire(
        'Missing Fields',
        'Please complete all fields and upload your ID.',
        'warning'
      );
      return;
    }

    this.isRegistering = true;

    Swal.fire({
      title: 'Submitting registration...',
      text: 'Please wait a moment',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const base64 = await this.convertFileToBase64(this.uploadedOfficialFile);

      await this.authService.createOfficialAccount(
        this.regEmail.trim(),
        this.regPassword,
        this.regFullName,
        this.uploadedOfficialFileName,
        base64
      );

      await this.authService.logout();

      Swal.close();

      Swal.fire(
        'Registration Submitted',
        'Official account registered successfully. Please wait for admin approval before logging in.',
        'success'
      );

      this.regFullName = '';
      this.regEmail = '';
      this.regPassword = '';
      this.uploadedOfficialFile = null;
      this.uploadedOfficialFileName = '';
      this.showRegister = false;
    } catch (err: any) {
      Swal.close();

      Swal.fire(
        'Registration Failed',
        err?.message || 'Error creating account',
        'error'
      );
    } finally {
      this.isRegistering = false;
    }
  }

  onOfficialFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0] || null;

    if (!file) return;

    if (file.type !== 'application/pdf') {
      Swal.fire('Invalid File', 'Only PDF files allowed', 'warning');
      target.value = '';
      return;
    }

    if (file.size > 900 * 1024) {
      Swal.fire('File Too Large', 'PDF must be under 900KB', 'warning');
      target.value = '';
      return;
    }

    this.uploadedOfficialFile = file;
    this.uploadedOfficialFileName = file.name;
  }

  convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }
}