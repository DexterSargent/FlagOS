import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { cleanFirebaseConfigValue } from './firebaseConfig';

const firebaseConfig = {
  apiKey: cleanFirebaseConfigValue(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: cleanFirebaseConfigValue(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: cleanFirebaseConfigValue(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: cleanFirebaseConfigValue(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: cleanFirebaseConfigValue(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: cleanFirebaseConfigValue(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
};

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
