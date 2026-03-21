import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth as getAuthModular } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAdminCredential } from "./firebase-credential";

function initAdmin() {
  if (getApps().length === 0) {
    initializeApp({
      credential: getAdminCredential(),
    });
  }
}

/**
 * Firestore — use in Route Handlers and server code.
 */
export function getDb() {
  initAdmin();
  return getFirestore();
}

/**
 * Firebase Admin Auth — for future server-side token verification, etc.
 */
export function getAuth() {
  initAdmin();
  return getAuthModular();
}

/**
 * Server timestamp for `createdAt` / `updatedAt` fields.
 */
export function getServerTimestamp() {
  return FieldValue.serverTimestamp();
}
