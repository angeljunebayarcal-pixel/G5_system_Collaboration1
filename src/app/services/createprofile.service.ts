import { Injectable } from '@angular/core';
import {
  initializeApp,
  getApps,
  getApp,
  deleteApp,
  FirebaseApp
} from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut,
  Auth
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  Firestore,
  serverTimestamp
} from 'firebase/firestore';
import { environment } from '../../environments/environment';

export interface ResidentProfileData {
  fullName: string;
  dob: string;
  gender: string;
  address: string;
  contact: string;
  email: string;
  username: string;
}

@Injectable({
  providedIn: 'root'
})
export class CreateProfileService {
  private firestore: Firestore;

  constructor() {
    const mainApp = getApps().length ? getApp() : initializeApp(environment.firebase);
    this.firestore = getFirestore(mainApp);
  }

  async createResidentProfile(
    profile: ResidentProfileData,
    password: string
  ): Promise<string> {
    const secondaryAppName = `resident-creator-${Date.now()}`;
    const secondaryApp: FirebaseApp = initializeApp(environment.firebase, secondaryAppName);
    const secondaryAuth: Auth = getAuth(secondaryApp);

    try {
      const cred = await createUserWithEmailAndPassword(
        secondaryAuth,
        profile.email.trim(),
        password
      );

      const uid = cred.user.uid;

      await setDoc(doc(this.firestore, 'users', uid), {
        uid,
        email: profile.email.trim(),
        role: 'resident',
        createdAt: serverTimestamp()
      });

      await setDoc(doc(this.firestore, 'residents', uid), {
        uid,
        fullName: profile.fullName.trim(),
        dob: profile.dob,
        gender: profile.gender,
        address: profile.address.trim(),
        contact: profile.contact.trim(),
        email: profile.email.trim(),
        username: profile.username.trim(),
        createdAt: serverTimestamp()
      });

      await signOut(secondaryAuth);

      return uid;
    } catch (error: any) {
      if (error?.code === 'auth/email-already-in-use') {
        throw new Error('That email is already registered.');
      }

      if (error?.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      }

      if (error?.code === 'auth/weak-password') {
        throw new Error('Password must be at least 6 characters.');
      }

      throw error;
    } finally {
      try {
        await signOut(secondaryAuth);
      } catch {
      }

      try {
        await deleteApp(secondaryApp);
      } catch {
      }
    }
  }
}