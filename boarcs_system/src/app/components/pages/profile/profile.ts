import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss'],
})
export class Profile {

  activeTab: string = 'personal';

  personal = {
    fullname: 'John Cruz',
    address: 'Zone 4 Katipunan',
    contact: '+63786988992',
    email: 'johncruz@gmail.com',
    role: 'Resident'
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
