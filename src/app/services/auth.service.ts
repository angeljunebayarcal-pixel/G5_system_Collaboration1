import { Injectable } from '@angular/core';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  User,
  Auth,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Firestore
} from 'firebase/firestore';
import { environment } from '../../environments/environment';



export interface UserProfileData {
  uid: string;
  fullName: string;
  address: string;
  contact: string;
  email: string;
  role: 'resident' | 'official';
  username?: string;
  dob?: string;
  gender?: string;
  validIdFileName?: string;
  validIdFileUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth;
  private fs: Firestore;

  constructor() {
    const app = getApps().length ? getApp() : initializeApp(environment
      .firebase);
    this.auth = getAuth(app);
    this.fs = getFirestore(app);
  }

  async waitForAuthReady(): Promise<User | null> {
    if (this.auth.currentUser) return this.auth.currentUser;

    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(this.auth, (user) => {
        unsubscribe();
        resolve(user);
      });
    });
  }

  async login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  async logout() {
    return signOut(this.auth);
  }

  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }
  getAuthInstance(): Auth {
  return this.auth;
}

  async getCurrentUserAsync(): Promise<User | null> {
    return this.waitForAuthReady();
  }

  async createResidentAccount(email: string, password: string): Promise<string> {
    const cred = await createUserWithEmailAndPassword(this.auth, email, password);
    const uid = cred.user.uid;

    await setDoc(doc(this.fs, 'users', uid), {
      email,
      role: 'resident',
      createdAt: new Date()
    });

    return uid;
  }

  async createOfficialAccount(
    email: string,
    password: string,
    fullName?: string,
    validIdFileName?: string,
    validIdFileUrl?: string
  ): Promise<string> {
    const cred = await createUserWithEmailAndPassword(this.auth, email, password);
    const uid = cred.user.uid;

    const resolvedFullName = fullName?.trim() || email.split('@')[0];

    await setDoc(doc(this.fs, 'users', uid), {
      email,
      role: 'official',
      fullName: resolvedFullName,
      address: '',
      contact: '',
      createdAt: new Date()
    });

    await setDoc(doc(this.fs, 'officials', uid), {
      fullName: resolvedFullName,
      address: '',
      contact: '',
      email,
      role: 'official',
      validIdFileName: validIdFileName || '',
      validIdFileUrl: validIdFileUrl || '',
      createdAt: new Date()
    });

    return uid;
  }

  async getUserRole(uid?: string): Promise<'resident' | 'official' | null> {
    const userId = uid || (await this.getCurrentUserAsync())?.uid;
    if (!userId) return null;

    const snap = await getDoc(doc(this.fs, 'users', userId));
    if (!snap.exists()) return null;

    const data = snap.data();
    return (data?.['role'] as 'resident' | 'official' | null) ?? null;
  }

  async isOfficial(uid?: string): Promise<boolean> {
    return (await this.getUserRole(uid)) === 'official';
  }

  async isResident(uid?: string): Promise<boolean> {
    return (await this.getUserRole(uid)) === 'resident';
  }

  async getProfileData(uid?: string): Promise<UserProfileData | null> {
    const currentUser = await this.getCurrentUserAsync();
    const userId = uid || currentUser?.uid;

    if (!userId) return null;

    const role = await this.getUserRole(userId);
    if (!role) return null;

    if (role === 'resident') {
      const residentSnap = await getDoc(doc(this.fs, 'residents', userId));
      const userSnap = await getDoc(doc(this.fs, 'users', userId));

      if (!residentSnap.exists()) return null;

      const resident = residentSnap.data();
      const user = userSnap.exists() ? userSnap.data() : {};

      return {
        uid: userId,
        fullName: resident['fullName'] || '',
        address: resident['address'] || '',
        contact: resident['contact'] || '',
        email: resident['email'] || user['email'] || currentUser?.email || '',
        role: 'resident',
        username: resident['username'] || '',
        dob: resident['dob'] || '',
        gender: resident['gender'] || ''
      };
    }

    const officialSnap = await getDoc(doc(this.fs, 'officials', userId));
    const userSnap = await getDoc(doc(this.fs, 'users', userId));

    if (!userSnap.exists()) return null;

    const user = userSnap.data();
    const official = officialSnap.exists() ? officialSnap.data() : {};

    return {
      uid: userId,
      fullName:
        official['fullName'] ||
        user['fullName'] ||
        (user['email'] ? String(user['email']).split('@')[0] : 'Official User'),
      address: official['address'] || user['address'] || '',
      contact: official['contact'] || user['contact'] || '',
      email: official['email'] || user['email'] || currentUser?.email || '',
      role: 'official',
      validIdFileName: official['validIdFileName'] || '',
      validIdFileUrl: official['validIdFileUrl'] || ''
    };
  }

  async updateProfileData(
    profile: Partial<UserProfileData>,
    uid?: string
  ): Promise<void> {
    const currentUser = await this.getCurrentUserAsync();
    const userId = uid || currentUser?.uid;
    if (!userId) throw new Error('No user found');

    const role = await this.getUserRole(userId);
    if (!role) throw new Error('No role found');

    if (role === 'resident') {
      await updateDoc(doc(this.fs, 'residents', userId), {
        fullName: profile.fullName ?? '',
        address: profile.address ?? '',
        contact: profile.contact ?? '',
        email: profile.email ?? '',
        username: profile.username ?? '',
        dob: profile.dob ?? '',
        gender: profile.gender ?? ''
      });

      await updateDoc(doc(this.fs, 'users', userId), {
        email: profile.email ?? ''
      });

      return;
    }

    await updateDoc(doc(this.fs, 'users', userId), {
      fullName: profile.fullName ?? '',
      address: profile.address ?? '',
      contact: profile.contact ?? '',
      email: profile.email ?? ''
    });

    const officialRef = doc(this.fs, 'officials', userId);
    const officialSnap = await getDoc(officialRef);

    if (officialSnap.exists()) {
      await updateDoc(officialRef, {
        fullName: profile.fullName ?? '',
        address: profile.address ?? '',
        contact: profile.contact ?? '',
        email: profile.email ?? '',
        validIdFileName: profile.validIdFileName ?? officialSnap.data()['validIdFileName'] ?? '',
        validIdFileUrl: profile.validIdFileUrl ?? officialSnap.data()['validIdFileUrl'] ?? ''
      });
    } else {
      await setDoc(officialRef, {
        fullName: profile.fullName ?? '',
        address: profile.address ?? '',
        contact: profile.contact ?? '',
        email: profile.email ?? '',
        role: 'official',
        validIdFileName: profile.validIdFileName ?? '',
        validIdFileUrl: profile.validIdFileUrl ?? '',
        createdAt: new Date()
      });
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.getCurrentUserAsync();
    if (!user || !user.email) throw new Error('No logged in user');

    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
  }
}