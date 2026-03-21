# Chat2meet Agent

Next.js app for scheduling with an **agent** instead of the classic grid UI. The web app is a ChatGPT-style shell; data lives in **Firebase (Firestore)** and is exposed via **Route Handlers** under `app/api/`.

## Quick start

```bash
npm install
cp .env.example .env
# Add Firebase credentials (see docs/setup.md)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Documentation

| Doc | Contents |
| --- | --- |
| [docs/README.md](docs/README.md) | Index of all docs |
| [docs/overview.md](docs/overview.md) | Goals, stack, repo layout |
| [docs/setup.md](docs/setup.md) | Environment, Firebase, seed script |
| [docs/architecture.md](docs/architecture.md) | App structure, Firebase Admin, types |
| [docs/api.md](docs/api.md) | HTTP API reference |
| [docs/components.md](docs/components.md) | UI component map |
| [docs/firebase-mvp.md](docs/firebase-mvp.md) | Firestore collections and fields |

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm run start` | Production build and serve |
| `npm run lint` | ESLint |
| `npm run db:seed` | Seed Firestore with MVP dummy data |
| `npm run firebase` | Firebase CLI (`npm run firebase -- <args>`) |
| `npm run firebase:login` | `firebase login` |

## Deploy

Standard [Next.js on Vercel](https://nextjs.org/docs/app/building-your-application/deploying). Set Firebase / GCP credentials in the host environment for API routes that use Firestore.
