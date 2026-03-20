import { Injectable } from '@angular/core';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Firestore
} from 'firebase/firestore';
import { environment } from '../../environments/environment';

export interface UserSettingsData {
  emailNotifications: boolean;
  smsNotifications: boolean;
  showContactInfo: boolean;
  activityStatus: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private firestore: Firestore;

  constructor() {
    const app = getApps().length ? getApp() : initializeApp(environment.firebase);
    this.firestore = getFirestore(app);
  }

  async getSettings(uid: string): Promise<UserSettingsData> {
    const ref = doc(this.firestore, 'userSettings', uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      const defaults: UserSettingsData = {
        emailNotifications: true,
        smsNotifications: false,
        showContactInfo: false,
        activityStatus: true
      };

      await setDoc(ref, defaults);
      return defaults;
    }

    const data = snap.data();

    return {
      emailNotifications: data['emailNotifications'] ?? true,
      smsNotifications: data['smsNotifications'] ?? false,
      showContactInfo: data['showContactInfo'] ?? false,
      activityStatus: data['activityStatus'] ?? true
    };
  }

  async updateSettings(uid: string, settings: Partial<UserSettingsData>): Promise<void> {
    const ref = doc(this.firestore, 'userSettings', uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      await updateDoc(ref, settings);
    } else {
      await setDoc(ref, {
        emailNotifications: true,
        smsNotifications: false,
        showContactInfo: false,
        activityStatus: true,
        ...settings
      });
    }
  }
}