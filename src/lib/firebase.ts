import { initializeApp, getApps, getApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { cleanFirebaseConfigValue } from './firebaseConfig';

const useFirebaseEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';
const isLocalDevelopment = process.env.NODE_ENV === 'development';

const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

if (useFirebaseEmulators && process.env.NODE_ENV === 'production' && !isBuildPhase) {
  throw new Error('Firebase emulator mode cannot be enabled in production.');
}

if (isLocalDevelopment && !useFirebaseEmulators) {
  throw new Error(
    'Local development is blocked from Firebase. Set NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true and use the demo-flagos-local project.',
  );
}

const firebaseConfig = {
  apiKey: cleanFirebaseConfigValue(process.env.NEXT_PUBLIC_FIREBASE_API_KEY, 'AIzaSyBHTnWJpyjhbLpGQKJ2BqNWkN43EGP88pw'),
  authDomain: cleanFirebaseConfigValue(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, 'flagfootballleaguemachine.firebaseapp.com'),
  projectId: cleanFirebaseConfigValue(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, 'flagfootballleaguemachine'),
  storageBucket: cleanFirebaseConfigValue(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, 'flagfootballleaguemachine.firebasestorage.app'),
  messagingSenderId: cleanFirebaseConfigValue(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, '204437433125'),
  appId: cleanFirebaseConfigValue(process.env.NEXT_PUBLIC_FIREBASE_APP_ID, '1:204437433125:web:71dac0f10bd618b4ef88cc'),
};

if (useFirebaseEmulators && firebaseConfig.projectId !== 'demo-flagos-local') {
  throw new Error('Firebase emulator mode requires NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-flagos-local.');
}

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

if (useFirebaseEmulators && typeof window !== 'undefined') {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
}

export { app, db, auth };
