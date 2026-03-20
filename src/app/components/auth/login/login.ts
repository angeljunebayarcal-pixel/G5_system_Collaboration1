import { Component } from '@angular/core';
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
export class Login {

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

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  async login() {

    if (!this.email.trim() || !this.password.trim()) {
      Swal.fire('Missing Fields','Please enter email and password','warning');
      return;
    }

    try {

      const cred = await this.authService.login(
        this.email.trim(),
        this.password
      );

      const uid = cred.user.uid;
      const role = await this.authService.getUserRole(uid);

      if (!role) {
        Swal.fire('Login Failed','No valid role found','error');
        return;
      }

      await Swal.fire({
        title:'Login Successful!',
        icon:'success',
        timer:1500,
        showConfirmButton:false
      });

      if (role === 'official') {
  this.router.navigate(['/ofs-home/ofs-dashboard']);
} else {
  this.router.navigate(['/home/dashboard']);
}
    } catch(err:any){

      Swal.fire(
        'Login Failed',
        err?.message || 'Invalid email or password',
        'error'
      );

    }

  }

  async registerOfficial(){

    if(!this.regFullName || !this.regEmail || !this.regPassword || !this.uploadedOfficialFile){

      Swal.fire(
        'Missing Fields',
        'Please complete all fields and upload your ID.',
        'warning'
      );

      return;
    }

    try{

      const base64 = await this.convertFileToBase64(this.uploadedOfficialFile);

      await this.authService.createOfficialAccount(
        this.regEmail.trim(),
        this.regPassword,
        this.regFullName,
        this.uploadedOfficialFileName,
        base64
      );

      Swal.fire(
        'Success',
        'Official account registered successfully.',
        'success'
      );

      this.regFullName='';
      this.regEmail='';
      this.regPassword='';
      this.uploadedOfficialFile=null;
      this.uploadedOfficialFileName='';
      this.showRegister=false;

    }catch(err:any){

      Swal.fire(
        'Registration Failed',
        err?.message || 'Error creating account',
        'error'
      );

    }

  }

  onOfficialFileChange(event:Event){

    const target = event.target as HTMLInputElement;
    const file = target.files?.[0] || null;

    if(!file) return;

    if(file.type !== 'application/pdf'){
      Swal.fire('Invalid File','Only PDF files allowed','warning');
      target.value='';
      return;
    }

    if(file.size > 900 * 1024){
      Swal.fire('File Too Large','PDF must be under 900KB','warning');
      target.value='';
      return;
    }

    this.uploadedOfficialFile=file;
    this.uploadedOfficialFileName=file.name;

  }

  convertFileToBase64(file:File):Promise<string>{

    return new Promise((resolve,reject)=>{

      const reader = new FileReader();

      reader.readAsDataURL(file);

      reader.onload = () => resolve(reader.result as string);

      reader.onerror = error => reject(error);

    });

  }

}