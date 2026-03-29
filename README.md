# Genyra — Family Tree Platform

A private genealogy platform for Indonesian families. Build and explore your family tree on an interactive zoomable canvas, manage members, and preserve memories across generations.

## Architecture

Monorepo with three packages:

```
genyra-familytree/
├── apps/web/           # Next.js 15 frontend  (:3000)
├── apps/api/           # NestJS 11 + Fastify backend  (:3001)
└── packages/shared-types/  # Zod schemas + inferred TS types
```

**Package manager:** pnpm workspaces

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS v4 |
| Graph canvas | `@xyflow/react` v12 (React Flow) |
| Server state | TanStack Query v5 |
| Client UI state | Zustand v5 |
| Forms | react-hook-form + zod + @hookform/resolvers |
| Backend | NestJS 11 on Fastify |
| ORM | Prisma 6 |
| Database | PostgreSQL (Neon in production) |
| Auth | `@nestjs/jwt` + `passport-jwt` + `argon2` |

## Local Setup (Windows 11)

### Prerequisites

1. Node.js 22.x (via nvm-windows)
2. pnpm: `npm install -g pnpm`
3. Docker (for local PostgreSQL)

### Steps

```bash
# 1. Clone and install
git clone <repo>
cd genyra-familytree
pnpm install

# 2. Copy env files
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.local.example apps\web\.env.local

# 3. Start PostgreSQL
docker run --name genyra-db -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres

# 4. Apply schema and seed
pnpm db:migrate
pnpm db:seed

# 5. Start dev servers (two separate terminals)
pnpm dev:api    # terminal 1
pnpm dev:web    # terminal 2
```

## Commands

```bash
# Dev
pnpm dev:web          # Next.js on :3000
pnpm dev:api          # NestJS on :3001

# Database
pnpm db:generate      # Regenerate Prisma client after schema changes
pnpm db:migrate       # Create + apply a new migration (prompts for name)
pnpm db:studio        # Prisma Studio visual browser

# Quality
pnpm lint             # ESLint across all packages
pnpm type-check       # tsc --noEmit across all packages
pnpm build            # Build all packages
pnpm test             # Unit tests
pnpm test:e2e         # End-to-end tests
```

## Key Features

### Family Tree Canvas
- Zoomable, pannable React Flow canvas with auto-layout (4-phase algorithm: generation rows, couple units, sibling clusters, overlap resolution)
- Drag-and-drop node repositioning — positions persisted to DB
- Clean view toggle hides UI chrome for screenshots/sharing
- PNG export via `html-to-image`

### Multi-Family Support
- A user can belong to up to **3 families** simultaneously
- A user can **own** (be Family Head of) at most **1 family**
- Family switcher in the map header — switches JWT context and reloads canvas
- "Join another family" directly from the switcher dropdown via invite code

### Member Lifecycle
- Registration via invite code (7-day expiry, collision-retry on generation)
- Pending approval queue — Family Head approves or rejects new members
- Members can request to leave; Family Head approves or rejects
- Leaving is blocked if the member has children registered in the family
- Family Head can force-remove a member (requires entering that member's password as confirmation)

### Ownership & Family Deletion
- Family Head can transfer ownership to any active member — roles swap immediately
- Family Head can delete the family entirely once all other members have left

### Profile System
- Per-person profile page with bio, vital stats, NIK, and memory photo gallery
- Photo upload with crop (base64 stored in DB, no file server needed)
- Family Head can update any member's NIK inline from the admin panel

### Relationship Rules (enforced server-side)
- **SPOUSE:** opposite genders only, no existing living spouse, not related within 3 generations
- **PARENT_CHILD:** parent must be older by at least 12 years
- Age gap validated to month precision

### Notifications
- In-app notification feed (polled every 30 s)
- Types: `NEW_MEMBER`, `MEMBER_DECEASED`, `LEAVE_REQUEST`, `OWNERSHIP_TRANSFER`
- Auto-pruned to 5 most recent per family

## Data Model (simplified)

```
User ──< PersonNode >── FamilyGroup
                 |
         RelationshipEdge (SPOUSE | PARENT_CHILD | SIBLING)
                 |
          PersonPhoto / Notification / LeaveRequest / Invite
```

- `PersonNode` is the family-tree entity — separate from `User` to support placeholder nodes (deceased relatives with no account)
- A `User` can have multiple `PersonNode` records (one per family they belong to)
- `@@unique([userId, familyGroupId])` on PersonNode enforces one node per family per user
- Role (`FAMILY_HEAD` | `FAMILY_MEMBER`) is stored on `PersonNode`, scoped per family
- JWT payload: `{ sub: userId, role, fid: familyGroupId }` — `fid` is the active family context

## Security Notes

- All API calls from the frontend go through `apps/web/src/lib/api-client.ts` — never direct `fetch` in components
- JWT access + refresh token pair; refresh token stored hashed in DB
- Canvas position updates verify family membership before writing
- Force-remove a member requires the **Family Head to enter their own password** (verified with argon2) to prevent accidental removal
- Zod validates all request bodies at the controller boundary
- Role authorization uses `PersonNode.role` (per-family scope), not the legacy `User.role` field

## Default Seed (development)

Family: **Keluarga Besar Sadikin** — 37 members across 4 generations.

Family Head login:
- NIK: `3273010703720017`
- Password: `password123`

## Production Deployment

- Backend: any Node.js host (Railway, Render, Fly.io)
- Frontend: Vercel (recommended)
- Database: Neon PostgreSQL (serverless)

To apply schema changes on Neon (non-interactive environment):

```bash
# From apps/api/ with DATABASE_URL pointing at Neon
npx prisma db push --accept-data-loss
npx prisma db seed
```

## Changelog

### 2026-03-30 — Security Hardening & Feature Sprint

**Security (6 critical / high fixes):**
- **C-01** Fixed cross-family relationship creation — `create` and `delete` now verify both nodes belong to the requesting head's family before writing
- **C-02** Fixed cross-family node deletion — `delete` verifies the target node belongs to the head's own family
- **C-03** `addChild` no longer creates a User account or copies a password hash; it creates a PersonNode only (no NIK required)
- **C-05** `updateStatus` scopes PersonNode approval to the correct `familyGroupId`, preventing cross-family approval pollution
- **C-06** All role checks migrated from `User.role` to `PersonNode.role` (per-family scope) across all services (person-nodes, person-photos, relationships)
- **H-01** Rate limiting: global throttler (20 req/s, 60 req/10 s, 120 req/min); auth endpoints hardened to 10 req/15 min
- **H-02** Invite code strengthened: 8 characters from an expanded unambiguous charset (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`)
- **H-04** Photo uploads now validate MIME type (jpeg/png/webp/gif) and cap size at 5 MB per upload

**New backend features:**
- **Audit log** — new `AuditLog` model; `AuditService` writes structured entries (actor, action, targetId, details)
- **Share links** — Family Head can generate a 30-day read-only share token (`POST /share/token`); unauthenticated viewers get map data via `GET /share/:token`
- **Cancel leave request** — member can now cancel their own pending leave request (`DELETE /family-groups/:id/leave`)
- **Notification read/dismiss** — `PATCH /notifications/:id/read` and `DELETE /notifications/:id`
- **Leave request expiry** — `expiresAt` set to +7 days on creation; hourly cron job (`@nestjs/schedule`) auto-expires stale PENDING requests
- **Schema additions:** `AuditLog`, `ShareToken` models; `Notification.readAt`, `LeaveRequest.expiresAt` fields

**Frontend improvements:**
- **H-08** Canvas respects manually dragged positions — nodes with stored `canvasX/canvasY` keep their position across re-layouts
- **M-06** Profile save is now optimistic — the canvas updates instantly on submit; rolls back on error
- **L-08** New `/members` page — Family Head can view all active members, see their NIK, and remove them with password confirmation
- **L-01** New `/stats` page — family statistics: total / living / deceased, gender breakdown, generation count, average age, oldest / youngest, marriages and divorces
- **L-05** PWA manifest (`/manifest.json`) — app is installable on Android/iOS with correct theme color, start URL, and icon
- **api-client:** added `searchPersons`, `cancelLeaveRequest`, `markNotificationRead`, `dismissNotification`, `createShareToken`, `getPublicMapData`; fixed `deleteUser` to send `headPassword` (not the target's password)
- **Admin panel** — quick-nav links to Members and Stats pages; corrected password prompt copy ("your password" not "their password")

### 2026-03-22
- **Multi-family:** users can belong to up to 3 families, own at most 1
- **Family switcher** in map header; "Join another family" inline invite flow (max 3 check)
- **Leave family** with Family Head approval; blocked if user has registered children
- **Transfer ownership:** Family Head selects successor; roles swap immediately
- **Delete family:** allowed only when no other members remain
- **Force-remove member:** requires entering the target member's password as confirmation
- **Admin NIK edit:** Family Head can correct any member's NIK inline in the admin panel
- **Security hardening:**
  - Canvas-position endpoint now verifies family membership before writing
  - Auth refresh body validated with Zod (was an unchecked cast)
  - All role checks migrated from `User.role` to `PersonNode.role` (per-family scope) across users, person-nodes, and invites services
- **Register form:** thin divider between family-specific fields and personal info fields
