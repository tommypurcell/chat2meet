/**
 * Canonical Firestore user id for the primary seeded user (`npm run db:seed`).
 * Keep test pages, dev fallbacks, and docs aligned on this id.
 */
export const SEED_PRIMARY_USER_ID = "user_tommy" as const;

/**
 * When no session user is present (local dev), chat API uses this id so it matches
 * seeded data and `/test-calendar` unless overridden by env.
 */
export function defaultDevUserId(): string {
  const fromEnv = process.env.DEFAULT_DEV_USER_ID?.trim();
  if (fromEnv) return fromEnv;
  return SEED_PRIMARY_USER_ID;
}
