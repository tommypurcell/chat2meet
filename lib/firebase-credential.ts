/**
 * Resolves Firebase Admin credentials for both Next.js API routes and scripts.
 * Matches the precedence used by `scripts/seed-firestore.ts` (file paths, then ADC).
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Credential } from "firebase-admin/app";
import type { ServiceAccount } from "firebase-admin/app";
import { applicationDefault, cert } from "firebase-admin/app";

function resolvePath(p: string): string {
  return resolve(process.cwd(), p);
}

function tryFirstExistingPath(...candidates: (string | undefined)[]): string | null {
  for (const c of candidates) {
    const t = c?.trim();
    if (!t) continue;
    const p = resolvePath(t);
    if (existsSync(p)) return p;
  }
  return null;
}

function tryLoadExplicitCredential(): ServiceAccount | string | null {
  const fromFile = tryFirstExistingPath(
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    process.env.FIREBASE_SERVICE_ACCOUNT_FILE,
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
  );
  if (fromFile) return fromFile;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (!raw) return null;

  if (raw.startsWith("{")) {
    try {
      return JSON.parse(raw) as ServiceAccount;
    } catch {
      return null;
    }
  }

  const maybePath = resolvePath(raw);
  if (existsSync(maybePath)) return maybePath;

  try {
    const decoded = Buffer.from(raw, "base64").toString("utf8");
    return JSON.parse(decoded) as ServiceAccount;
  } catch {
    return null;
  }
}

/** Use for `initializeApp({ credential })` in Node (API routes and scripts). */
export function getAdminCredential(): Credential {
  const explicit = tryLoadExplicitCredential();
  if (explicit) return cert(explicit);
  return applicationDefault();
}
