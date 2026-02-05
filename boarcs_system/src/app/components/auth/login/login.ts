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
  firstname = '';
  lastname = '';
  role = '';

  constructor(private router: Router) {

  }
  login() {
  if (this.firstname && 
    this.lastname && 
    this.role && 
    this.email && 
    this.password) {
    this.router.navigate(['/home']) }
}

}
  