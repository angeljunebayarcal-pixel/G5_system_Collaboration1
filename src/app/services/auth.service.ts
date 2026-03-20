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
  Firestore,
  collection,
  getDocs,
  query,
  where,
  deleteDoc
} from 'firebase/firestore';
import { environment } from '../../environments/environment';

export interface UserProfileData {
  uid: string;
  fullName: string;
  address: string;
  contact: string;
  email: string;
  role: 'resident' | 'official' | 'admin';
  status?: 'pending' | 'active' | 'declined';
  username?: string;
  dob?: string;
  gender?: string;
  validIdFileName?: string;
  validIdFileUrl?: string;
}

export interface DirectoryUserData {
  uid: string;
  fullName: string;
  email: string;
  role: 'resident' | 'official' | 'admin';
  status: 'pending' | 'active' | 'declined' | 'inactive';
  address?: string;
  contact?: string;
  username?: string;
  dob?: string;
  gender?: string;
  validIdFileName?: string;
  validIdFileUrl?: string;
  createdAt?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  async getAllUsersForDirectory(): Promise<DirectoryUserData[]> {
    const snapshot = await getDocs(collection(this.fs, 'users'));

    const users = await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const userId = docSnap.id;
        const user = docSnap.data();

        const role = (user['role'] || 'resident') as 'resident' | 'official' | 'admin';

        let extraData: any = {};

        if (role === 'resident') {
          const residentSnap = await getDoc(doc(this.fs, 'residents', userId));
          if (residentSnap.exists()) {
            extraData = residentSnap.data();
          }
        }

        if (role === 'official') {
          const officialSnap = await getDoc(doc(this.fs, 'officials', userId));
          if (officialSnap.exists()) {
            extraData = officialSnap.data();
          }
        }

        return {
          uid: userId,
          fullName:
            extraData['fullName'] ||
            user['fullName'] ||
            (user['email'] ? String(user['email']).split('@')[0] : 'User'),
          email: extraData['email'] || user['email'] || '',
          role,
          status: user['status'] || extraData['status'] || 'active',
          address: extraData['address'] || user['address'] || '',
          contact: extraData['contact'] || user['contact'] || '',
          username: extraData['username'] || '',
          dob: extraData['dob'] || '',
          gender: extraData['gender'] || '',
          validIdFileName: extraData['validIdFileName'] || '',
          validIdFileUrl: extraData['validIdFileUrl'] || '',
          createdAt: user['createdAt'] || extraData['createdAt'] || null
        } as DirectoryUserData;
      })
    );

    return users;
  }

  async deleteUserDirectoryRecord(
  uid: string,
  role: 'resident' | 'official' | 'admin'
): Promise<void> {
  await deleteDoc(doc(this.fs, 'users', uid));

  if (role === 'resident') {
    await deleteDoc(doc(this.fs, 'residents', uid));
  }

  if (role === 'official') {
    await deleteDoc(doc(this.fs, 'officials', uid));
  }
}

  private auth: Auth;
  private fs: Firestore;

  constructor() {
    const app = getApps().length ? getApp() : initializeApp(environment.firebase);
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
      status: 'active',
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
      uid,
      email,
      role: 'official',
      status: 'pending',
      fullName: resolvedFullName,
      address: '',
      contact: '',
      createdAt: new Date()
    });

    await setDoc(doc(this.fs, 'officials', uid), {
      uid,
      fullName: resolvedFullName,
      address: '',
      contact: '',
      email,
      role: 'official',
      status: 'pending',
      validIdFileName: validIdFileName || '',
      validIdFileUrl: validIdFileUrl || '',
      createdAt: new Date()
    });

    return uid;
  }

  async getUserRole(uid?: string): Promise<'resident' | 'official' | 'admin' | null> {
    const userId = uid || (await this.getCurrentUserAsync())?.uid;
    if (!userId) return null;

    const snap = await getDoc(doc(this.fs, 'users', userId));
    if (!snap.exists()) return null;

    const data = snap.data();
    return (data?.['role'] as 'resident' | 'official' | 'admin' | null) ?? null;
  }

  async getUserStatus(uid?: string): Promise<'pending' | 'active' | 'declined' | null> {
    const userId = uid || (await this.getCurrentUserAsync())?.uid;
    if (!userId) return null;

    const snap = await getDoc(doc(this.fs, 'users', userId));
    if (!snap.exists()) return null;

    const data = snap.data();
    return (data?.['status'] as 'pending' | 'active' | 'declined' | null) ?? null;
  }

  async updateUserStatus(uid: string, status: 'pending' | 'active' | 'declined'): Promise<void> {
    await updateDoc(doc(this.fs, 'users', uid), {
      status
    });

    const officialRef = doc(this.fs, 'officials', uid);
    const officialSnap = await getDoc(officialRef);

    if (officialSnap.exists()) {
      await updateDoc(officialRef, {
        status
      });
    }
  }

  async getPendingOfficials(): Promise<any[]> {
    const q = query(
      collection(this.fs, 'users'),
      where('role', '==', 'official'),
      where('status', '==', 'pending')
    );

    const snapshot = await getDocs(q);

    const results = await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const userData = docSnap.data();
        const uid = docSnap.id;

        const officialSnap = await getDoc(doc(this.fs, 'officials', uid));
        const officialData = officialSnap.exists() ? officialSnap.data() : {};

        return {
          uid,
          ...userData,
          validIdFileName: officialData?.['validIdFileName'] || '',
          validIdFileUrl: officialData?.['validIdFileUrl'] || '',
          fullName: officialData?.['fullName'] || userData?.['fullName'] || '',
          address: officialData?.['address'] || userData?.['address'] || '',
          contact: officialData?.['contact'] || userData?.['contact'] || '',
          email: officialData?.['email'] || userData?.['email'] || ''
        };
      })
    );

    return results;
  }

  async isOfficial(uid?: string): Promise<boolean> {
    return (await this.getUserRole(uid)) === 'official';
  }

  async isResident(uid?: string): Promise<boolean> {
    return (await this.getUserRole(uid)) === 'resident';
  }

  async isAdmin(uid?: string): Promise<boolean> {
    return (await this.getUserRole(uid)) === 'admin';
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
        status: user['status'] || 'active',
        username: resident['username'] || '',
        dob: resident['dob'] || '',
        gender: resident['gender'] || ''
      };
    }

    if (role === 'admin') {
      const userSnap = await getDoc(doc(this.fs, 'users', userId));
      if (!userSnap.exists()) return null;

      const user = userSnap.data();

      return {
        uid: userId,
        fullName:
          user['fullName'] ||
          (user['email'] ? String(user['email']).split('@')[0] : 'Admin User'),
        address: user['address'] || '',
        contact: user['contact'] || '',
        email: user['email'] || currentUser?.email || '',
        role: 'admin',
        status: user['status'] || 'active'
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
      status: official['status'] || user['status'] || 'pending',
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

    if (role === 'admin') {
      await updateDoc(doc(this.fs, 'users', userId), {
        fullName: profile.fullName ?? '',
        address: profile.address ?? '',
        contact: profile.contact ?? '',
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
        status: 'pending',
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