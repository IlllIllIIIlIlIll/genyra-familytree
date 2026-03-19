<div align="center">
  <img src="genyra_logo.png" alt="Genyra Logo" width="120" />

  <h1>Genyra</h1>
  <p><strong>A private, mobile-first family tree explorer.</strong><br/>Navigate your lineage on an interactive zoomable canvas — built for families, not public databases.</p>

  <p>
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" />
    <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" />
    <img alt="NestJS" src="https://img.shields.io/badge/NestJS-11-E0234E?style=flat-square&logo=nestjs&logoColor=white" />
    <img alt="Prisma" src="https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma&logoColor=white" />
    <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql&logoColor=white" />
    <img alt="License" src="https://img.shields.io/badge/license-MIT-green?style=flat-square" />
  </p>
</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Deployment](#deployment)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [Author](#author)
- [License](#license)

---

## Overview

Genyra is a **private genealogy platform** for families who want to explore and maintain their lineage together — without sharing it with the public. Each family lives in its own isolated group, accessible only via invite codes issued by the Family Head.

Members join via invite, get approved, and then appear as interactive nodes on a shared canvas. The Family Head manages approvals, relationships, and family membership.

---

## Features

- **Interactive family map** — zoomable, pannable canvas built on React Flow; nodes represent family members, edges represent relationships
- **Role-based access** — Family Head (admin) and Family Member roles with distinct capabilities
- **Invite-only registration** — 5-character codes with 7-day expiry; only the Family Head can issue and refresh them
- **Approval workflow** — new members and child additions require Family Head approval before appearing on the map
- **Relationship modelling** — parent–child, spouse, and sibling edges with referrer validation on registration
- **Profile cards** — long-press a node to open a rich profile with photos, bio, birthdate, and place
- **Memory photos** — multiple photos per person, stored as base64 data URLs
- **Deceased marking** — mark members as deceased with an automatic family notification
- **Admin panel** — single-page admin with pending approvals, invite management, badge counts, member removal, and orphan node cleanup
- **Notifications** — in-app bell with unread badge; up to 5 family-wide notifications (new member, member deceased)
- **Family name editing** — the Family Head can rename the family inline on the canvas
- **Download** — export the full family tree as a PNG
- **Clean view** — toggle-able UI-less mode for a distraction-free look at the tree
- **Mobile-first** — designed for touch; long-press gestures, bottom navigation, viewport-aware minimap

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| Graph canvas | `@xyflow/react` v12 (React Flow) |
| Server state | TanStack Query v5 |
| Client UI state | Zustand v5 |
| Styling | Tailwind CSS v4 |
| Forms | React Hook Form + Zod + `@hookform/resolvers` |
| Backend | NestJS 11 on Fastify |
| ORM | Prisma 6 |
| Database | PostgreSQL 16 |
| Auth | `@nestjs/jwt` + `passport-jwt` + argon2 |
| Validation | Zod schemas in `@genyra/shared-types` (shared across FE + BE) |
| Monorepo | pnpm workspaces |

---

## Project Structure

```
genyra-familytree/
├── apps/
│   ├── web/                    # Next.js 15 frontend (port 3000)
│   │   └── src/
│   │       ├── app/            # App Router pages
│   │       │   ├── (auth)/     # Login, register
│   │       │   └── (app)/      # Map, admin, profile
│   │       ├── components/
│   │       │   ├── family-map/ # React Flow canvas, nodes, edges, layout engine
│   │       │   ├── profile/    # Profile card, photo grid, add-child modal
│   │       │   ├── auth/       # Login and registration forms
│   │       │   └── ui/         # Primitive components (Button, Input, Toast, …)
│   │       ├── lib/            # api-client.ts, auth.ts, utils.ts
│   │       ├── store/          # Zustand stores (auth, map UI, toasts)
│   │       └── providers/      # QueryClient, auth bootstrap
│   │
│   └── api/                    # NestJS 11 backend (port 3001)
│       ├── prisma/
│       │   ├── schema.prisma   # Database schema (source of truth)
│       │   ├── seed.ts         # Full 37-member family seed (Keluarga Besar Sadikin)
│       │   └── seed-test.ts    # Minimal test accounts for all user roles/statuses
│       └── src/
│           ├── auth/           # Register, login, refresh, logout
│           ├── users/          # Profile, pending approvals, status management, member removal
│           ├── family-groups/  # Map data, family CRUD, name update
│           ├── person-nodes/   # Node CRUD, add-child, approve, unlinked cleanup
│           ├── relationships/  # Edge creation and deletion
│           ├── invites/        # Invite code generation and validation
│           ├── person-photos/  # Photo upload (base64) and deletion
│           ├── notifications/  # Family-wide notifications
│           └── common/         # Guards, decorators, filters
│
└── packages/
    └── shared-types/           # Zod schemas + inferred TypeScript types
        └── src/
            ├── user.types.ts
            ├── person-node.types.ts
            ├── relationship.types.ts
            └── api-response.types.ts
```

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | ≥ 22.x | Install via [nvm](https://github.com/nvm-sh/nvm) or [nvm-windows](https://github.com/coreybutler/nvm-windows) |
| pnpm | ≥ 9.x | `npm install -g pnpm` |
| PostgreSQL | 16 | [Neon](https://neon.tech) free tier recommended (no local install required) |

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/favianizza/genyra-familytree.git
cd genyra-familytree
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

```bash
# API
copy apps\api\.env.example apps\api\.env

# Frontend
copy apps\web\.env.example apps\web\.env
```

Then open `apps/api/.env` and fill in your values — specifically the `DATABASE_URL` and JWT secrets (see [Environment Variables](#environment-variables) below for how to generate them).

### 4. Run database migrations

```bash
pnpm db:migrate
```

### 5. (Optional) Seed the database

```bash
# Full 37-member sample family (Keluarga Besar Sadikin)
pnpm --filter @genyra/api db:seed

# Or minimal test accounts for each user role (useful for QA)
pnpm --filter @genyra/api db:seed:test
```

### 6. Start development servers

Open two terminals:

```bash
# Terminal 1 — API
pnpm dev:api

# Terminal 2 — Frontend
pnpm dev:web
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 7. Create your first family

1. Go to `/register`
2. Enter your details and a **Family Name** (leave invite code blank)
3. Log in — you are now the Family Head
4. Share your invite code (Admin panel → Family Invite Code) with family members

---

## Environment Variables

> `.env` files are gitignored. Only `.env.example` templates are committed. Copy and fill them in locally; set the same values in your hosting provider's dashboard for production.

### `apps/api/.env`

| Variable | Description | Example / Notes |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | From [Neon](https://neon.tech) dashboard |
| `JWT_ACCESS_SECRET` | 64-char secret for access tokens | See generation command below |
| `JWT_REFRESH_SECRET` | 64-char secret for refresh tokens | Must differ from access secret |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime | `7d` |
| `PORT` | API server port | `3001` |
| `FRONTEND_URL` | Allowed CORS origin | Your Vercel URL in production |

**Generate JWT secrets:**

```bash
node -e "const c=require('crypto'); console.log('ACCESS: ', c.randomBytes(32).toString('hex')); console.log('REFRESH:', c.randomBytes(32).toString('hex'));"
```

### `apps/web/.env`

| Variable | Description | Value |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the NestJS API | `http://localhost:3001` (local) or your Render URL (production) |

---

## Database

Genyra uses **Prisma** as the ORM with **PostgreSQL** (hosted on [Neon](https://neon.tech)).

```bash
# Apply migrations after pulling new changes
pnpm db:migrate

# Regenerate Prisma client after editing schema.prisma
pnpm db:generate

# Open Prisma Studio (visual database browser)
pnpm db:studio
```

### Schema overview

| Model | Purpose |
|---|---|
| `User` | Authentication account (NIK, passwordHash, role, status) |
| `FamilyGroup` | Isolated private family container |
| `PersonNode` | A person on the map (linked or placeholder) |
| `RelationshipEdge` | Directed edge: PARENT_CHILD, SPOUSE, or SIBLING |
| `PersonPhoto` | Photos attached to a PersonNode (base64) |
| `Invite` | 5-char invite code per family (UNUSED → USED) |
| `Notification` | Family-wide events (NEW_MEMBER, MEMBER_DECEASED) — max 5 stored |

### Test accounts

Run `pnpm --filter @genyra/api db:seed:test` to create a isolated "Test Family" with:

| Role | NIK | Password | Status |
|---|---|---|---|
| Family Head | `0000000000000001` | `testpass123` | Active |
| Family Member | `0000000000000002` | `testpass123` | Active |
| Deactivated | `0000000000000003` | `testpass123` | Cannot login |
| Pending Approval | `0000000000000004` | `testpass123` | Cannot login until approved |

---

## Deployment

Genyra is deployed across three **100% free** services:

| Service | Provider | Purpose |
|---|---|---|
| Frontend | [Vercel](https://vercel.com) | Next.js (always-on, zero config) |
| Backend API | [Render](https://render.com) | NestJS web service |
| Database | [Neon](https://neon.tech) | Serverless PostgreSQL |

> **Free tier note:** Render's free web services spin down after 15 minutes of inactivity. The first request after idle takes ~30 seconds to cold-start. For a private family app this is acceptable. Upgrade to Render's Starter plan ($7/mo) to eliminate cold starts.

---

### Step 1 — Database (Neon)

1. Sign up at [neon.tech](https://neon.tech) → **Create project** → name it `genyra`
2. From the **Dashboard → Connection Details**, copy the connection string:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/genyra?sslmode=require
   ```
3. Keep it — you will paste it as `DATABASE_URL` in the next steps

---

### Step 2 — Backend API (Render)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New → Web Service**
3. Connect your GitHub repo — Render will detect `render.yaml` automatically
4. Set these environment variables in the Render dashboard:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Your Neon connection string |
   | `JWT_ACCESS_SECRET` | 64-char random string (generate with the command above) |
   | `JWT_REFRESH_SECRET` | Different 64-char random string |
   | `JWT_ACCESS_EXPIRES_IN` | `15m` |
   | `JWT_REFRESH_EXPIRES_IN` | `7d` |
   | `PORT` | `3001` |
   | `FRONTEND_URL` | Your Vercel URL (set after Step 3, e.g. `https://genyra.vercel.app`) |
   | `NODE_ENV` | `production` |

5. Click **Deploy** — wait for the build to complete
6. Copy your Render service URL (e.g. `https://genyra-api.onrender.com`)

**Run initial migration** (one-time, after first deploy):
In Render → your service → **Jobs** → create a one-off job with command:
```bash
cd apps/api && npx prisma migrate deploy
```

---

### Step 3 — Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your GitHub repo
2. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
3. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL = https://genyra-api.onrender.com
   ```
4. Click **Deploy**
5. Copy your Vercel URL and paste it as `FRONTEND_URL` back in Render (re-deploy if needed)

---

## API Reference

Interactive Swagger docs are available at `/api` on the running API server:
- **Local**: [http://localhost:3001/api](http://localhost:3001/api)
- **Production**: `https://genyra-api.onrender.com/api`

### Key endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Register (join family or create new) |
| `POST` | `/auth/login` | Login with NIK + password |
| `POST` | `/auth/refresh` | Refresh access token |
| `GET` | `/family-groups/:id/map-data` | All nodes + edges for the canvas |
| `GET` | `/invites/my-family` | Get/create the family invite code |
| `PATCH` | `/invites/my-family/refresh` | Regenerate invite code |
| `GET` | `/users/members` | List all active family members |
| `PATCH` | `/users/:id/status` | Approve or reject a pending member |
| `DELETE` | `/users/:id` | Permanently remove a family member |
| `POST` | `/person-nodes/add-child` | Add a newborn child (requires spouse) |
| `PATCH` | `/person-nodes/:id/approve` | Approve a pending child node |
| `GET` | `/notifications/my-family` | Family-wide notifications |

---

## Contributing

This is a personal family project. If you'd like to suggest improvements or report a bug, feel free to open an issue.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit with conventional commits: `git commit -m "feat: add your feature"`
4. Push and open a pull request against `main`

Please keep PRs focused and follow the code style in [`CLAUDE.md`](CLAUDE.md).

---

## Author

**Favian Izza**
- GitHub: [@favianizza](https://github.com/favianizza)

---

## License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.
