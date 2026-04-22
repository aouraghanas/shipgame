# Shipeh Leaderboard — Project Brain

Everything an AI agent needs to understand this codebase and continue working on it.

---

## What This App Is

An internal performance leaderboard for **Shipeh** (a shipping/logistics company). Account managers ("Managers") log their daily work, and the system scores them monthly based on two metrics:

- **Delivered orders** — total package deliveries for the month
- **Stock orders** — new stock orders added (each entry scored by quantity tier)

The top-scored manager wins a reward; the bottom-scored gets a punishment. Both are configured per-month by an admin.

Live URL: **https://shipeh.top**

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14.2 (App Router, TypeScript) |
| Database | PostgreSQL via Supabase |
| ORM | Prisma 5 |
| Auth | NextAuth v4 (JWT, credentials-only) |
| File storage | Supabase Storage (two buckets) |
| Styling | Tailwind CSS (dark theme, zinc palette, indigo accents) |
| UI primitives | Radix UI (Dialog, Select, Switch, Label, etc.) |
| Rich text | TipTap v2 (admin notification editor) |
| Validation | Zod |
| Hosting | Netlify (via @netlify/plugin-nextjs v5 / OpenNext) |

---

## User Roles

Three roles, all authenticate with email + password:

| Role | Description | Default landing |
|------|-------------|-----------------|
| `ADMIN` | Full access — manages users, performance data, rewards, notifications | `/admin` |
| `MANAGER` | Account managers — log activities, view their own stats, see leaderboard | `/dashboard` |
| `SCREEN` | Read-only TV display account — sees leaderboard fullscreen | `/screen` |

Role is stored on the JWT session. Every API route checks it server-side.

---

## Route Structure

### Public
- `/login` — credential login (NextAuth), redirects by role after sign-in

### Manager routes (`app/(manager)/`)
Requires session; SCREEN role is redirected away.

| Path | Purpose |
|------|---------|
| `/dashboard` | Manager's personal stats, stock entries, quick actions |
| `/leaderboard` | Live ranked leaderboard for current month |
| `/activity` | Log and view interactions with sellers |
| `/profile` | Update name, password, avatar photo |

### Admin routes (`app/(admin)/admin/`)
Requires ADMIN role.

| Path | Purpose |
|------|---------|
| `/admin` | Dashboard with cards linking to all admin sections |
| `/admin/users` | List all users |
| `/admin/users/new` | Create user |
| `/admin/users/[id]` | Edit user (name, email, role, status, password) |
| `/admin/rewards` | Set monthly reward & punishment text |
| `/admin/activity` | View all manager activity logs (filterable, CSV export) |
| `/admin/reports` | Delivered & stock reports |
| `/admin/performance` | Edit delivered totals and stock entries per manager |
| `/admin/notifications` | List all notification bars |
| `/admin/notifications/new` | Create notification bar |
| `/admin/notifications/[id]/edit` | Edit notification bar |

### Screen route (`app/(screen)/`)
Requires SCREEN or ADMIN role.

| Path | Purpose |
|------|---------|
| `/screen` | Fullscreen auto-refreshing leaderboard for TV display |

### Root
`/` — redirects to `/dashboard` or `/login` based on session.

---

## Scoring System (`lib/scoring.ts`)

```
Delivered score  = deliveredTotal / 100
Stock entry score: qty >= 200 → 3pts | qty >= 100 → 2pts | else → 1pt
Stock score      = sum of all stock entry points for the month
Total score      = delivered score + stock score
```

Rank tiebreakers (in order):
1. Total score (desc)
2. Delivered orders (desc)
3. Stock quantity (desc)
4. Account creation date (asc — earlier user ranks higher)

---

## Database Schema (Prisma)

### Enums
- `Role`: `ADMIN | MANAGER | SCREEN`
- `Status`: `ACTIVE | INACTIVE`
- `ActivityCategory`: `CALL | EMAIL | MEETING | ISSUE_FIX | FOLLOW_UP | OTHER`
- `NotificationType`: `INFO | WARNING | SUCCESS | DANGER | PROMO`
- `NotificationFrequency`: `ALWAYS | ONCE_PER_SESSION | UNTIL_DISMISSED`

### Models

**User** — all app users
- `id`, `email` (unique), `name`, `passwordHash`, `role`, `status`, `avatarUrl?`, timestamps
- Relations: `deliveredEntries`, `stockEntries`, `notes`, `managerActivities`

**DeliveredEntry** — one record per user per month (upserted on update)
- `userId`, `monthKey` (YYYY-MM), `total` (int)
- Unique: `[userId, monthKey]`

**StockEntry** — additive per user per month (each entry is separate)
- `userId`, `monthKey`, `quantity`, `sellerName?`

**Note** — admin annotation shown on leaderboard under a manager's row
- `userId`, `monthKey`, `content`, `visible`
- Unique: `[userId, monthKey]` — one note per manager per month (upserted)

**AuditLog** — immutable record of every mutation
- `userId`, `userName`, `action` (dot-notation: e.g. `stock.create`), `details`

**Seller** — shared seller directory across all managers
- `name`, `email?`

**ManagerActivity** — CRM-style activity log entry
- `managerId`, `sellerId`, `description`, `category`, `attachments[]` (public URLs)

**Notification** — announcement bars shown across the app
- `title` (internal label), `content` (HTML from TipTap), `type` (preset style)
- `bgColor?`, `textColor?`, `icon?` — custom color overrides
- `ctaText?`, `ctaUrl?`, `ctaNewTab` — optional call-to-action button
- `isActive`, `isDraft` — must be both `isActive=true` AND `isDraft=false` to show
- `isDismissible` — shows X dismiss button if true
- `frequency`: `ALWAYS` (always show) | `ONCE_PER_SESSION` (sessionStorage) | `UNTIL_DISMISSED` (localStorage + DB)
- `targetRoles[]` — empty array = show to all roles; otherwise filter by role
- `displayPages[]` — which pages to show on; `"all"` = everywhere
- `priority` — higher = shown first (supports multiple simultaneous bars)
- `startAt?`, `endAt?` — optional scheduling
- `createdBy` — userId of creator
- `dismissals` — relation to `NotificationDismissal`

**NotificationDismissal** — tracks per-user dismissals in DB
- `notificationId`, `userId`
- Unique: `[notificationId, userId]`

**MonthConfig** — monthly reward/punishment text
- `monthKey` (unique), `rewardText?`, `punishmentText?`

---

## API Routes

All under `app/api/`. All require authentication unless noted.

### Auth
| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/auth/[...nextauth]` | GET/POST | — | NextAuth handler |

### Users
| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/users` | GET | ADMIN | List all users |
| `/api/users` | POST | ADMIN | Create user (email, name, password, role) |
| `/api/users/[id]` | GET | ADMIN or self | Get user |
| `/api/users/[id]` | PUT | ADMIN or self | Update user; non-admins can only update name/avatarUrl/password |
| `/api/users/[id]` | DELETE | ADMIN | Delete user (cascades all relations) |

### Leaderboard & Performance
| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/leaderboard` | GET | any session | Scored + ranked leaderboard; `?month=YYYY-MM` |
| `/api/performance/[userId]` | PUT | ADMIN | Upsert delivered entry for a user |

### Stock
| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/stock` | GET | any non-SCREEN | Own entries; admin can use `?userId=X` |
| `/api/stock` | POST | any non-SCREEN | Add stock entry; admin can specify `userId` |
| `/api/stock/[id]` | DELETE | any non-SCREEN | Delete own entry; admin can delete any |

### Activity (CRM)
| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/manager-activities` | GET | non-SCREEN | Manager sees own; admin sees all; filter by `from`, `to`, `managerId`, `sellerId`, `keyword` |
| `/api/manager-activities` | POST | non-SCREEN | Log activity for a seller |
| `/api/manager-activities/export` | GET | ADMIN | Download CSV (up to 5000 rows) |
| `/api/upload-activity` | POST | non-SCREEN | Upload file attachment (max 10MB); returns public URL |

### Sellers
| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/sellers` | GET | non-SCREEN | List sellers; `?search=` for name filter |
| `/api/sellers` | POST | non-SCREEN | Create seller |

### Notes
| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/notes` | GET | ADMIN | All notes for a month; `?month=YYYY-MM` |
| `/api/notes` | POST | ADMIN | Upsert note for a user (one per user per month) |
| `/api/notes/[id]` | GET | ADMIN | Get single note |
| `/api/notes/[id]` | PUT | ADMIN | Update note |
| `/api/notes/[id]` | DELETE | ADMIN | Delete note |

### Rewards
| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/rewards` | GET | any session | Get monthly reward/punishment text |
| `/api/rewards` | POST | ADMIN | Upsert monthly config |

### Audit Log
| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/audit-log` | GET | ADMIN | Recent logs; filter by `from`, `to`, `userId` (max 500) |

### Notifications
| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/notifications` | GET | ADMIN | All notifications (ordered by priority desc) |
| `/api/notifications` | POST | ADMIN | Create notification |
| `/api/notifications/[id]` | GET | ADMIN | Get single notification |
| `/api/notifications/[id]` | PUT | ADMIN | Update notification |
| `/api/notifications/[id]` | DELETE | ADMIN | Delete notification |
| `/api/notifications/active` | GET | any session | Active notifications filtered by page & role; includes `isDismissed` flag |
| `/api/notifications/[id]/dismiss` | POST | any session | Record dismissal (upserts DB record) |

### File Upload
| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/upload` | POST | any session | Upload avatar image to Supabase `avatars` bucket |
| `/api/upload-activity` | POST | non-SCREEN | Upload activity attachment to `activity-attachments` bucket |

---

## Key Libraries & Files

### `lib/auth.ts`
NextAuth config. Credentials provider with bcrypt password check. JWT callbacks store `id`, `role`, `avatarUrl`. Session callbacks expose them on `session.user`.

### `lib/prisma.ts`
Singleton Prisma client (avoids hot-reload connections in dev). Binary targets include `rhel-openssl-3.0.x` for Netlify.

### `lib/scoring.ts`
Pure scoring functions. `stockEntryPoints()`, `deliveredScore()`, `totalStockScore()`, `totalScore()`, `rankManagers()`.

### `lib/audit.ts`
`logAudit(userId, userName, action, details)` — creates an `AuditLog` record. Called after every mutation in API routes.

### `lib/supabase.ts`
Two clients: `supabaseAdmin` (service role key, server-only) and `supabaseClient` (anon key). Two buckets: `avatars` and `activity-attachments`.

### `lib/utils.ts`
`cn()` (clsx + tailwind-merge), `getCurrentMonthKey()` (YYYY-MM), `formatMonthKey()` (human label), `getInitials()`.

---

## Component Architecture

### Layouts
- `app/layout.tsx` — root HTML shell, wraps everything in `<SessionProvider>`
- `app/(admin)/layout.tsx` — enforces ADMIN role, renders `<Navbar />`
- `app/(manager)/layout.tsx` — enforces non-SCREEN, renders `<Navbar />` + `<NotificationBar />`
- `app/(screen)/layout.tsx` — enforces SCREEN/ADMIN, renders `<NotificationBar />`

### Shared Components (`components/shared/`)
- **`Navbar.tsx`** — client component; reads session with `useSession()`, renders role-appropriate nav links + sign-out button. Admin nav includes Bell (Notifications link).
- **`NotificationBar.tsx`** — client component; fetches `/api/notifications/active?page=X` using `usePathname()` to determine current page. Handles dismiss with both local storage and API call. Renders stacked bars with preset type styles.
- **`SessionProvider.tsx`** — wraps NextAuth `SessionProvider` for client components.
- **`Avatar.tsx`** — renders initials fallback or Supabase-hosted image.

### Admin Components (`components/admin/`)
- **`NotificationForm.tsx`** — full create/edit form for notifications. Two-column layout: form (left 3/5) + sticky live preview (right 2/5). Handles TipTap content, color pickers, scheduling, role/page targeting.
- **`TipTapEditor.tsx`** — rich text editor with toolbar: bold, italic, underline, strikethrough, text color, highlight color, link, bullet list, ordered list. Extensions: StarterKit, TextStyle, Color, Highlight (multicolor), Link, Underline.

### UI Primitives (`components/ui/`)
All custom-built shadcn-style components:
- `Button` — variants: default (indigo), outline, ghost, secondary, destructive; sizes: default, sm, lg, icon
- `Badge` — variants: default, secondary, outline, destructive
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogClose`
- `Input`, `Label`, `Textarea`, `Select`, `Switch`

### Activity Components (`components/activity/`)
- **`SellerCombobox.tsx`** — combobox for selecting or creating sellers inline

---

## Notification Bar System (full detail)

Notifications are announcement banners displayed at the top of pages.

**Type presets** (each has default bg, text, border, icon):
- `INFO` — blue | `WARNING` — amber | `SUCCESS` — green | `DANGER` — red | `PROMO` — purple

**Display logic:**
1. Fetch from `/api/notifications/active?page=<current-page>`
2. API filters: `isActive=true`, `isDraft=false`, `startAt <= now <= endAt`
3. Client-side filters: not in local dismissed set, not hidden by frequency rule
4. Render stacked bars in priority order (highest first)

**Frequency handling (client-side):**
- `ALWAYS` — always shown
- `ONCE_PER_SESSION` — dismissed state in `sessionStorage` key `notif_session_dismissed`
- `UNTIL_DISMISSED` — dismissed state in `localStorage` key `notif_dismissed` + DB record

**Page targeting** — `displayPages` field is an array of page slugs: `leaderboard`, `dashboard`, `screen`, `activity`, `profile`. Special value `all` matches every page.

---

## Environment Variables

Required in `.env.local` and set in Netlify:

```
DATABASE_URL                  # Supabase PostgreSQL (pooler URL for Prisma)
DIRECT_URL                    # Supabase direct DB URL (for migrations)
NEXTAUTH_SECRET               # Secret for JWT signing
NEXTAUTH_URL                  # e.g. https://shipeh.top
NEXT_PUBLIC_SUPABASE_URL      # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY # Supabase anon key (client-side safe)
SUPABASE_SERVICE_ROLE_KEY     # Supabase service role key (server-only)
```

---

## Deployment

**Host:** Netlify at `https://shipeh.top`
**Plugin:** `@netlify/plugin-nextjs` v5 (OpenNext serverless architecture)
**No GitHub** — deployed directly via Netlify CLI: `npx netlify deploy --prod`

### netlify.toml build command
```toml
command = "find . -not -path './node_modules/*' -not -path './.next/*' -type f | xargs -P8 -I{} sh -c 'cat \"{}\" > /dev/null 2>&1 || true' && npm run build"
```

The `find | xargs cat` prefix exists because the project lives on macOS iCloud Desktop, which evicts file contents ("dataless stubs") when the disk is low. The cat loop forces synchronous re-download of all stubs before the build starts.

### Prisma deploy
Schema changes: `npx prisma db push` (pushes to Supabase directly, no migration files).

### Build flags in `next.config.mjs`
- `eslint: { ignoreDuringBuilds: true }` — skip ESLint (had network timeout issues fetching ESLint plugin)
- `typescript: { ignoreBuildErrors: true }` — skip TS type-check phase (iCloud stubs caused intermittent ETIMEDOUT during the checker)

---

## Common Development Patterns

### Adding a new API route
1. Create `app/api/<resource>/route.ts`
2. Check session + role at the top
3. Validate input with Zod
4. Query via `prisma`
5. Call `logAudit()` for any mutation
6. Return `NextResponse.json(...)`

### Adding a new admin page
1. Create `app/(admin)/admin/<page>/page.tsx`
2. Add `"use client"` if it needs hooks; keep it a server component if it only needs `getServerSession`
3. Add a card for it in `app/(admin)/admin/page.tsx` sections array
4. Add a nav link in `Navbar.tsx` `ADMIN_LINKS` array

### monthKey convention
All per-month data uses `YYYY-MM` string keys (e.g. `"2026-04"`). Use `getCurrentMonthKey()` from `lib/utils.ts` to get the current one. Never store full timestamps for month-bucketed data — always derive from `monthKey`.

### Audit logging
Every write operation should call:
```ts
await logAudit(session.user.id, session.user.name, "resource.action", "Human-readable description");
```
Action names follow `noun.verb` convention: `stock.create`, `user.update`, `notification.delete`, etc.

---

## Known Issues / Watch Out For

- **iCloud eviction**: The project is on macOS Desktop (iCloud Drive). When disk space is low, iCloud evicts file contents. Always check disk space before deploying. Free up space by deleting `.next/` and any `/tmp` build directories if below 1GB free. Run `brctl download` on the project directory if files appear empty.
- **TypeScript check disabled**: `typescript: { ignoreBuildErrors: true }` is in `next.config.mjs`. Type errors won't fail the build. Fix type errors anyway — they matter for correctness.
- **No test suite**: There are no automated tests. All verification is manual.
- **No GitHub / no CI**: Deploys are 100% manual from the local machine via `npx netlify deploy --prod`.
- **Prisma binary target**: `rhel-openssl-3.0.x` is required for Netlify Lambda. If you change the schema, always run `npx prisma generate` before building.
- **Avatar image domain**: Supabase project ID `uspbkwltfsbedhazlrud` is hardcoded in `next.config.mjs` `remotePatterns`. If the Supabase project changes, update this.
- **TipTap import**: `TextStyle` from `@tiptap/extension-text-style` is a **named** export, not default. `import { TextStyle } from "@tiptap/extension-text-style"`. Same applies to all TipTap extensions.
- **Set spread TypeScript**: Never spread a `Set<string>` directly (`[...set]`). Use `Array.from(set)` instead to avoid downlevelIteration compilation errors.
