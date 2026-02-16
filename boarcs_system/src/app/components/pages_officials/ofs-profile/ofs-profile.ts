import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ofs-profile',
  imports: [CommonModule,FormsModule],
  templateUrl: './ofs-profile.html',
  styleUrl: './ofs-profile.scss',
})
export class OfsProfile {

   activeTab: string = 'personal';

  personal = {
    fullname: 'Hon. Peter Santos',
    address: 'Zone 4 Katipunan',
    contact: '+63548347377',
    email: 'official@gmail.com',
    role: 'Officials'
  };

  account = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  setTab(tab: string) {
    this.activeTab = tab;
  }

  savePersonal() {
    console.log(this.personal);
  }

  saveAccount() {
    if (this.account.newPassword !== this.account.confirmPassword) {
      alert('Password not match');
      return;
    }

    alert('Password Updated');
  }

}

