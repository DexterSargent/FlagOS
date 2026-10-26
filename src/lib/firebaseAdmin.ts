import "server-only";

import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const useFirebaseEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";
// Hosting env values can arrive wrapped in literal quotes, which breaks ID token audience checks.
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim().replace(/^["']+|["']+$/g, "");

if (process.env.NODE_ENV !== "production" && !useFirebaseEmulators) {
  throw new Error(
    "Local Firebase Admin access is blocked. Start the Auth and Firestore emulators and enable NEXT_PUBLIC_USE_FIREBASE_EMULATORS.",
  );
}

const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

if (useFirebaseEmulators) {
  if (process.env.NODE_ENV === "production" && !isBuildPhase) {
    throw new Error("Firebase emulator mode cannot be enabled in production.");
  }
  if (projectId !== "demo-flagos-local") {
    throw new Error("Firebase emulator mode requires NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-flagos-local.");
  }
  process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
  if (process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080") {
    throw new Error("Firebase emulator mode requires FIRESTORE_EMULATOR_HOST=127.0.0.1:8080.");
  }
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099") {
    throw new Error("Firebase emulator mode requires FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099.");
  }
}

const adminApp =
  getApps()[0] ??
  initializeApp({
    credential: applicationDefault(),
    projectId,
  });

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
