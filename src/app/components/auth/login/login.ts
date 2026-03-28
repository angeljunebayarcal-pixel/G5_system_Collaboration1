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

  // ADDED: forgot password state
  showForgotPassword = false;
  resetEmail = '';
  isSendingReset = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.showPassword = false;
    this.showRegPassword = false;
  }

  @HostListener('document:keydown.enter', ['$event'])
  handleEnterKey(event: Event) {
    if (!this.showRegister && !this.showForgotPassword) {
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
      const cred = await this.authService.login(
        this.email.trim(),
        this.password
      );

      const uid = cred.user.uid;

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

      if (role === 'official') {
        if (status === 'pending') {
          await this.authService.logout();

          Swal.fire(
            'Approval Required',
            'Your official account is still pending admin approval.',
            'warning'
          );
          return;
        }

        if (status === 'declined') {
          await this.authService.logout();

          Swal.fire(
            'Access Denied',
            'Your official registration has been declined by the admin.',
            'error'
          );
          return;
        }

        if (status === 'inactive') {
          Swal.fire({
            icon: 'info',
            title: 'Account Inactive',
            text: 'Your account is currently deactivated, but you can still access the system.'
          });
        }
      }

      await Swal.fire({
        title: 'Login Successful!',
        icon: 'success',
        timer: 800,
        showConfirmButton: false
      });

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

  async sendResetLink() {
    if (this.isSendingReset) return;

    if (!this.resetEmail.trim()) {
      Swal.fire('Missing Email', 'Please enter your email address.', 'warning');
      return;
    }

    this.isSendingReset = true;

    Swal.fire({
      title: 'Sending reset link...',
      text: 'Please wait a moment',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      await this.authService.forgotPassword(this.resetEmail.trim());

      Swal.close();

    await Swal.fire(
      'Email Sent',
      'If the email is registered, a password reset link has been sent. Please check your Inbox, Spam, or Promotions folder.',
      'success'
    );

      this.resetEmail = '';
      this.showForgotPassword = false;
    } catch (err: any) {
      Swal.close();

      let errorMessage = err?.message || 'Unable to send password reset email.';

      if (err?.code === 'auth/user-not-found') {
        errorMessage = 'No account found for that email address.';
      } else if (err?.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (err?.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      } else if (err?.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      }

      Swal.fire('Reset Failed', errorMessage, 'error');
    } finally {
      this.isSendingReset = false;
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