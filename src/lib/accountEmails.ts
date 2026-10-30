"use client";

import { deleteApp, initializeApp } from "firebase/app";
import {
  browserPopupRedirectResolver, connectAuthEmulator, EmailAuthProvider, GoogleAuthProvider, initializeAuth,
  inMemoryPersistence, reauthenticateWithCredential, reauthenticateWithPopup,
  signInWithCustomToken, signInWithEmailAndPassword, signInWithPopup, signOut,
  type User,
} from "firebase/auth";
import { app, auth } from "./firebase";

export async function accountEmailRequest<T>(user: User, action: string, data: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch("/api/account/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...data }),
  });
  const text = await response.text();
  let result: any = {};
  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Unable to update account emails (status ${response.status}).`);
  }
  if (!response.ok) throw new Error(result.error || "Unable to update account emails.");
  if (result.data === undefined) throw new Error("The account request returned no data.");
  return result.data as T;
}

export async function resolveConnectedAccount(user: User): Promise<User> {
  if (!user.emailVerified) return user;
  try {
    const { customToken } = await accountEmailRequest<{ customToken: string | null }>(user, "resolve");
    if (customToken !== null && (typeof customToken !== "string" || !customToken)) {
      throw new Error("The connected account response was invalid.");
    }
    return customToken ? (await signInWithCustomToken(auth, customToken)).user : user;
  } catch (error) {
    console.warn("Connected account resolution skipped, continuing with current session:", error);
    return user;
  }
}

export async function confirmAccountOwner(user: User, password?: string) {
  if (password !== undefined) {
    if (!user.email) throw new Error("This account has no primary email.");
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
  } else {
    await reauthenticateWithPopup(user, new GoogleAuthProvider());
  }
}

export async function connectAccountEmail(user: User, credentials?: { email: string; password: string }) {
  const secondaryApp = initializeApp(app.options, `email-connection-${crypto.randomUUID()}`);
  const secondaryAuth = initializeAuth(secondaryApp, { persistence: inMemoryPersistence, popupRedirectResolver: browserPopupRedirectResolver });
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") {
    connectAuthEmulator(secondaryAuth, "http://127.0.0.1:9099", { disableWarnings: true });
  }
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const proof = credentials
      ? await signInWithEmailAndPassword(secondaryAuth, credentials.email.trim(), credentials.password)
      : await signInWithPopup(secondaryAuth, provider);
    if (!proof.user.emailVerified) throw new Error("Verify the additional email before connecting it.");
    await accountEmailRequest(user, "connect", { proofToken: await proof.user.getIdToken() });
    // Pick up the refreshed linkedEmails claim used by Firestore rules.
    await user.getIdToken(true);
  } finally {
    try {
      await signOut(secondaryAuth);
    } finally {
      await deleteApp(secondaryApp);
    }
  }
}
