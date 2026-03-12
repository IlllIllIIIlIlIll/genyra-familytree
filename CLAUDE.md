# Genyra — Claude Code Project Guide

## Project Overview
Genyra is a private genealogy platform. Monorepo with a Next.js frontend
(`apps/web`) and NestJS backend (`apps/api`). Shared types live in
`packages/shared-types`.

## Commands

### Development (run from repo root)
```
pnpm dev:web         # Start Next.js dev server on :3000
pnpm dev:api         # Start NestJS dev server on :3001
```
Run each in a separate terminal on Windows.

### Database (run from repo root)
```
pnpm db:generate     # Regenerate Prisma client after schema changes
pnpm db:migrate      # Create and apply a new migration (prompt for name)
pnpm db:studio       # Open Prisma Studio (visual DB browser)
```

### Code Quality (run from repo root)
```
pnpm lint            # ESLint across all packages
pnpm type-check      # tsc --noEmit across all packages
pnpm build           # Build all packages
```

### Testing
```
pnpm test            # Run all unit tests
pnpm test:e2e        # Run end-to-end tests
```

## Naming Conventions
- **Files and folders**: `kebab-case` (e.g., `family-map-canvas.tsx`)
- **React components**: `PascalCase` (e.g., `FamilyMapCanvas`)
- **Functions and variables**: `camelCase` (e.g., `fetchPersonNode`)
- **Types and interfaces**: `PascalCase`, no `I` prefix (e.g., `PersonNode`)
- **Zod schemas**: `PascalCase` + `Schema` suffix (e.g., `PersonNodeSchema`)
- **NestJS DTOs**: `PascalCase` + `Dto` suffix (e.g., `CreatePersonNodeDto`)
- **Constants**: `SCREAMING_SNAKE_CASE`
- **CSS**: Tailwind utility classes only — no custom CSS except `globals.css`

## TypeScript Rules
- Strict mode is ON. Never use `any`. Use `unknown` and narrow it.
- No type assertions (`as SomeType`) without a comment explaining why.
- All async functions must have explicit return types.
- Use `z.infer<typeof Schema>` rather than duplicating type definitions.

## Architecture Rules
- ALL API communication from the frontend goes through `src/lib/api-client.ts`.
  Never call `fetch` directly in a component or hook.
- ALL server state (data from the API) is managed by TanStack Query.
  Never store API response data in Zustand.
- Zustand is ONLY for client-side UI state (map viewport, selected node,
  modal open/close state).
- ALL business logic lives in NestJS services. Controllers are thin —
  they validate the DTO, call a service method, and return the result.
- ALL database access goes through Prisma. Use `$queryRaw` only for
  complex recursive CTE queries where Prisma's query builder falls short.

## Directory Rules
- `components/ui/` — headless or near-headless primitive components with no business logic
- `components/family-map/` — React Flow canvas and node/edge components
- `components/profile/` — profile card and editing components
- `hooks/` — custom React hooks. One hook per concept.
- `providers/` — React context providers only
- `store/` — Zustand stores only

## Git Conventions
- Branch names: `feature/short-description`, `fix/short-description`
- Commit messages: conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`)
- No direct commits to `main`. Always PR.

## Environment Setup (Windows 11)
1. Install Node.js 22.x via nvm-windows
2. Install pnpm: `npm install -g pnpm`
3. Install dependencies: `pnpm install` from repo root
4. Copy env files:
   - `copy apps\api\.env.example apps\api\.env`
   - `copy apps\web\.env.local.example apps\web\.env.local`
5. Start PostgreSQL (Docker recommended):
   `docker run --name genyra-db -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres`
6. Run migrations: `pnpm db:migrate`
7. Start dev servers (separate terminals):
   - Terminal 1: `pnpm dev:api`
   - Terminal 2: `pnpm dev:web`

## Key Libraries
| Purpose | Library |
|---|---|
| Graph canvas | `@xyflow/react` v12 (React Flow) |
| Server state | `@tanstack/react-query` v5 |
| Client UI state | `zustand` v5 |
| Form validation | `react-hook-form` + `zod` + `@hookform/resolvers` |
| Styling | Tailwind CSS v4 |
| API framework | NestJS v11 on Fastify |
| ORM | Prisma v6 |
| Auth | `@nestjs/jwt` + `passport-jwt` |
| Password hashing | `argon2` |
