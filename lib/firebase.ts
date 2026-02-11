import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;

const requiredPublicEnvKeys = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const;

const assertBrowser = () => {
  if (typeof window === 'undefined') {
    throw new Error('Firebase client SDK is only available in the browser');
  }
};

const getFirebaseConfig = () => {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const missing = requiredPublicEnvKeys.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase public env: ${missing.join(', ')}`
    );
  }

  return config;
};

export const getFirebaseApp = (): FirebaseApp => {
  assertBrowser();
  if (appInstance) return appInstance;

  const apps = getApps();
  appInstance = apps.length > 0 ? apps[0] : initializeApp(getFirebaseConfig());
  return appInstance;
};

export const getFirebaseAuth = (): Auth => {
  assertBrowser();
  if (authInstance) return authInstance;

  authInstance = getAuth(getFirebaseApp());
  return authInstance;
};
