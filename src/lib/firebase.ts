import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { cleanFirebaseConfigValue } from './firebaseConfig';

const firebaseConfig = {
  apiKey: cleanFirebaseConfigValue(process.env.NEXT_PUBLIC_FIREBASE_API_KEY, 'AIzaSyBHTnWJpyjhbLpGQKJ2BqNWkN43EGP88pw'),
  authDomain: cleanFirebaseConfigValue(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, 'flagfootballleaguemachine.firebaseapp.com'),
  projectId: cleanFirebaseConfigValue(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, 'flagfootballleaguemachine'),
  storageBucket: cleanFirebaseConfigValue(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, 'flagfootballleaguemachine.firebasestorage.app'),
  messagingSenderId: cleanFirebaseConfigValue(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, '204437433125'),
  appId: cleanFirebaseConfigValue(process.env.NEXT_PUBLIC_FIREBASE_APP_ID, '1:204437433125:web:71dac0f10bd618b4ef88cc'),
};

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
