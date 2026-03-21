# Setup

## Requirements

- Node.js 20+ (LTS recommended)
- npm
- A Firebase project with **Firestore** enabled
- A **service account** JSON (Firebase Console → Project settings → Service accounts), or Application Default Credentials

## Install

```bash
npm install
```

## Environment

Copy the example file and edit:

```bash
cp .env.example .env
```

### Firebase credentials (same for API routes and `npm run db:seed`)

Resolution order is implemented in `lib/firebase-credential.ts`:

1. **File path (recommended)** — set one of:
   - `FIREBASE_SERVICE_ACCOUNT_FILE=./firebase-service-account.json`
   - `GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json`
   - `FIREBASE_SERVICE_ACCOUNT_PATH=./your-key.json`  
   The file must exist on disk (multiline `private_key` is fine).

2. **Inline / base64** — `FIREBASE_SERVICE_ACCOUNT` as single-line JSON or base64-encoded JSON (fragile; prefer a file).

3. **Application Default Credentials** — [Google Cloud SDK](https://cloud.google.com/sdk/docs/install): `gcloud auth application-default login`, then leave credential env vars unset.

Do **not** paste full multiline JSON into `.env` — dotenv cannot load it reliably.

`.env` and `.env.local` are gitignored; `.env.example` is committed.

## Firestore seed data

```bash
npm run db:seed
```

Uses `scripts/load-env.ts` then the same `getDb()` path as production API routes. Creates sample `users`, `network`, `events/event_demo_pickleball`, participants, and availability. Re-running overwrites those document IDs.

## Development

```bash
npm run dev
```

## Firebase CLI (optional)

```bash
npm run firebase:login
npx firebase use <project-id>
```

Useful for deploy/emulators. The Next.js API still needs credentials as above (unless you rewire to emulators).

## Production / Vercel

- Set the same env vars in the project settings (or rely on ADC in a GCP environment).
- Service account must be allowed to use Firestore.
- Add **composite indexes** when Firebase prompts (often on filtered `GET /api/events`).
