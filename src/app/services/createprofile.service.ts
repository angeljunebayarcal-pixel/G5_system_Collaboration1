import { Injectable } from '@angular/core';
import { initializeApp, getApps, getApp } from 'firebase/app';
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
  Firestore
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
  private auth: Auth;
  private firestore: Firestore;

  constructor() {
    const app = getApps().length ? getApp() : initializeApp(environment.firebase);
    this.auth = getAuth(app);
    this.firestore = getFirestore(app);
  }

  async createResidentProfile(
    profile: ResidentProfileData,
    password: string
  ): Promise<string> {
    const cred = await createUserWithEmailAndPassword(
      this.auth,
      profile.email,
      password
    );

    const uid = cred.user.uid;

    await setDoc(doc(this.firestore, 'users', uid), {
      email: profile.email,
      role: 'resident',
      createdAt: new Date()
    });

    await setDoc(doc(this.firestore, 'residents', uid), {
      fullName: profile.fullName,
      dob: profile.dob,
      gender: profile.gender,
      address: profile.address,
      contact: profile.contact,
      email: profile.email,
      username: profile.username,
      createdAt: new Date()
    });

    await signOut(this.auth);

    return uid;
  }
}