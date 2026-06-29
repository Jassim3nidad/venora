# Venora — Venue Discovery & Event Marketplace Platform
### AI-Powered Event Marketplace SaaS Organized as a Turborepo Monorepo

Venora is an enterprise-grade venue discovery and booking SaaS platform designed for the Philippine market. It is engineered with **Next.js 15**, **Supabase**, **TypeScript**, and a customized **Tailwind CSS v4 design system**, utilizing a Clean Architecture structure.

---

## 🛠️ Technology Stack

| Layer | Technology | Role |
|---|---|---|
| **Frontend Framework** | Next.js 15 (App Router) & React 19 | Client application rendering & Server Actions |
| **Backend & Database** | Supabase & PostgreSQL | Gated RLS tables, enums, triggers, and RPC search |
| **State Management** | TanStack Query v5 | Client-side caching, fetching, and optimistic updates |
| **Form Management** | React Hook Form & Zod | Form validation schemas |
| **Mapping Engine** | MapLibre GL JS & OpenFreeMap | Open-source vector tile map integrations |
| **Design Tokens** | Tailwind CSS v4 & Radix Primitives | Accessible White & Blue brand theme components |
| **Monorepo Manager** | Turborepo & pnpm workspaces | Monorepo pipeline scheduling |
| **Compute / Functions**| Deno Edge Functions | Background calculations & notifications |

---

## 📁 Repository Structure

```
venora/
├── apps/
│   └── web/                   # Next.js 15 App Router web application
│       ├── app/               # App Router pages and page-level layouts
│       ├── src/
│       │   ├── components/    # Common React client components (e.g. VenueMap)
│       │   ├── features/      # Feature-first modules (Auth, Booking, Venues)
│       │   └── lib/           # Common utilities (RBAC configurations, Errors)
│       └── postcss.config.js  # Tailwind CSS compilation settings
├── packages/
│   ├── ui/                    # Reusable workspace UI component library (@venora/ui)
│   ├── database/              # Supabase generated typings
│   ├── lib/                   # Shared helpers (slugify, cn, app errors)
│   └── config/                # Shared ESLint, TS, and Tailwind presets
└── supabase/
    ├── migrations/            # Ordered SQL migration files (001_initial to 011_audit)
    ├── functions/             # Deno Edge Functions (commission rules, estimator, AI)
    └── seed.sql               # Default sample seeds and organization metadata
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js:** `>= 20`
- **pnpm:** `>= 9`
- **Supabase CLI:** Installed locally

### 2. Installation & Configuration
Clone the repository and install all workspaces dependencies:
```bash
# Install dependencies
pnpm install

# Setup environment variables
copy apps/web/.env.example apps/web/.env.local
```

Open **`apps/web/.env.local`** and configure your Supabase project keys:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Start Development
Run the local dev server across all workspaces:
```bash
pnpm dev
```
The application will boot and serve pages locally:
- Web App: **http://localhost:3000**
- Design System Showcase: **http://localhost:3000/design-system**

---

## 🛡️ Architecture & Core Modules

### 1. Unified Database & RLS Strategy
All tables are gated via Row-Level Security (RLS) with centralized security definer helper functions:
- `has_role(role)`: Checks user membership against the many-to-many `user_roles` matrix.
- `is_org_member(org_id)`: Validates ownership/coordinator association for organization management.

### 2. Clean Architecture Conventions
Features are organized into distinct layers to isolate domain logic from frameworks:
- **`domain/`**: Interface contracts, pure entity models, and value objects.
- **`application/`**: Use cases managing business actions (e.g., `create-booking`).
- **`infrastructure/`**: Concrete database repository adapters connecting to Supabase.
- **`ui/` / `hooks/`**: React client views and React Query actions.

### 3. OpenFreeMap Map Integration
Maps are loaded dynamically with SSR disabled to prevent layout shifts. It renders high-performance vector tiles from OpenFreeMap (`https://tiles.openfreemap.org/styles/liberty`) utilizing client-side WebGL canvas.

### 4. Custom Tailwind v4 Design System
Interactive states and visual tokens are mapped via CSS Custom Properties in `globals.css` with a responsive design floor supporting light/dark themes:
- Primary Brand: **Blue** (Hsl 217)
- Highlight Accent: **Golden Hour** (Hsl 45)
- Delight state: **Hibiscus** (Hsl 349)
- Destructive/Danger: **Rust** (Hsl 12)

---

## 💻 Standard Development Commands

| Command | Action |
|---|---|
| `pnpm dev` | Starts Next.js development server (runs with Webpack/PostCSS) |
| `pnpm build` | Compiles optimized production bundle across all packages |
| `pnpm type-check` | Runs typescript compiler checks for clean builds |
| `pnpm db:types` | Generates TypeScript definitions from the local Supabase container |
| `supabase db reset` | Dry-runs and applies all migrations in the local Supabase database |
