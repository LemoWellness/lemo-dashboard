// Server-only. Never import this file from a page component or anything
// that ships to the browser — it holds the service account credentials.
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_JSON is not set. Generate a service account key in ' +
      'Firebase console > Project settings > Service accounts, and paste its JSON ' +
      'contents into that environment variable (see .env.local.example).'
    );
  }
  // Support either raw JSON or base64-encoded JSON (base64 is often easier to
  // paste into Vercel's env var UI without escaping issues).
  try {
    return JSON.parse(raw);
  } catch (e) {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  }
}

function adminApp() {
  if (getApps().length) return getApps()[0];
  const serviceAccount = loadServiceAccount();
  return initializeApp({
    credential: cert(serviceAccount),
  });
}

export const adminAuth = getAuth(adminApp());
export const adminDb = getFirestore(adminApp());
export const adminMessaging = getMessaging(adminApp());
