import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  private users = [
    { id: 1, email: 'official@gmail.com', password: '123', role: 'official' },
    { id: 2, email: 'ajbayarcal@gmail.com', password: '123', role: 'resident' }
  ];

  login(email: string, password: string): boolean {
    const user = this.users.find(
      u => u.email === email && u.password === password
    );

    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
      return true;
    }

    return false;
  }

  logout() {
    localStorage.removeItem('currentUser');
  }

  getCurrentUser() {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
  }

  isOfficial(): boolean {
    return this.getCurrentUser()?.role === 'official';
  }

  isResident(): boolean {
    return this.getCurrentUser()?.role === 'resident';
  }
}