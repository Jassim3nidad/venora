# Event Coordinator Security Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver secure invitation-only event coordinator accounts with venue-specific assignments, validated permissions, owner staff management, invitation acceptance, and a safe coordinator shell that never inherits organization-wide owner access.

**Architecture:** Keep Venora's single primary role model and existing `organization_members` relationship. Add venue-scoped assignments and hashed invitations, expose mutations through narrow authenticated RPCs, enforce the same permission checks in RLS and server helpers, and drive owner/coordinator UI from server-resolved authorization data. This is the first of several independently testable coordinator plans; booking, calendar, messaging, suppliers, tasks, timelines, reports, and full responsive QA follow only after this foundation passes its security gate.

**Tech Stack:** Next.js App Router, React, TypeScript, Zod, Supabase Auth/Postgres/RLS, Vitest, Playwright, Tailwind CSS.

## Global Constraints

- Work in `C:\venora`; preserve unrelated dirty files and never reset user changes.
- Do not install packages or modify `package.json`, `pnpm-lock.yaml`, or dependency metadata.
- Do not commit, push, or apply a migration to production unless the user explicitly requests it.
- Create the database migration with `supabase migration new event_coordinator_foundation`; never invent its timestamped filename.
- Keep public signup customer-only and remove `event_coordinator` from the public partner application flow.
- Keep one primary row per user in `public.user_roles`; an accepting customer must explicitly confirm conversion.
- Never authorize from client-submitted role, user, owner, organization, venue, assignment, or permission claims.
- Never expose raw invitation tokens, token hashes, service-role keys, or session data to browser components or audit metadata.
- Coordinators receive no payout, commission, bank, tax, refund, ownership-transfer, venue-deletion, role-management, or admin permissions.
- Every new exposed table must enable RLS, use explicit grants, and have indexes supporting its policy predicates.
- Preserve existing venue-owner, admin, customer, supplier, booking-status, availability, notification, audit, auth, middleware, and RBAC behavior except for the coordinator access vulnerability being fixed.
- Use existing Vitest and Playwright infrastructure and do not add dependencies.
- Record the existing unrelated `MarketplaceLayout.tsx` `exactOptionalPropertyTypes` failure separately from coordinator regressions.

---

## File Map

### Create

- `apps/web/src/lib/rbac/coordinator-permissions.ts`: permission keys, presets, labels, section mapping, and allowlist intersection.
- `apps/web/src/lib/rbac/coordinator-permissions.test.ts`: preset and custom-permission contract tests.
- `apps/web/src/features/staff/schemas/staff-invitation.schema.ts`: Zod contracts for invite, assignment, and acceptance actions.
- `apps/web/src/features/staff/schemas/staff-invitation.schema.test.ts`: validation tests.
- `apps/web/src/features/staff/application/coordinator-authorization.ts`: server-only user, assignment, and permission guards.
- `apps/web/src/features/staff/application/coordinator-authorization.test.ts`: mocked authorization tests.
- `apps/web/src/features/staff/application/staff-invitation-actions.ts`: owner invitation and lifecycle server actions.
- `apps/web/src/features/staff/application/staff-invitation-actions.test.ts`: action authorization, hashing, and safe-error tests.
- `apps/web/src/features/staff/application/get-owner-staff.ts`: owner-scoped staff and invitation queries.
- `apps/web/src/features/staff/application/get-invitation-preview.ts`: safe invitation preview query.
- `apps/web/src/features/staff/ui/InviteCoordinatorDialog.tsx`: owner invitation form.
- `apps/web/src/features/staff/ui/StaffAccessCard.tsx`: assignment and invitation management card.
- `apps/web/src/features/staff/ui/InvitationAcceptanceCard.tsx`: explicit conversion and acceptance UI.
- `apps/web/app/(auth)/staff/invitations/[token]/page.tsx`: authenticated invitation review route.
- `apps/web/app/(auth)/staff/invitations/[token]/loading.tsx`: invitation loading state.
- `apps/web/app/(auth)/staff/invitations/[token]/error.tsx`: invitation error state.
- `apps/web/src/features/staff/application/coordinator-context.ts`: cached coordinator shell context.
- `apps/web/src/features/staff/ui/NoVenueAssignments.tsx`: safe empty/suspended/revoked state.
- `apps/web/e2e/coordinator-foundation.spec.ts`: owner/invite/accept/isolation browser coverage.
- `supabase/tests/event_coordinator_foundation.sql`: direct SQL/RLS/RPC security tests.
- CLI-generated migration returned by `supabase migration new event_coordinator_foundation`: schema, indexes, grants, helper functions, policies, RPCs, and audit integration.

### Modify

- `apps/web/src/features/partner-applications/schemas/partner.schema.ts`: reject public coordinator applications.
- `apps/web/src/features/partner-applications/ui/RoleSelection.tsx`: remove public coordinator option.
- `apps/web/src/features/partner-applications/ui/CategorySelection.tsx`: narrow partner role type and content.
- `apps/web/src/features/partner-applications/ui/VerificationUpload.tsx`: narrow partner role type and document map.
- `apps/web/src/features/partner-applications/constants/application-progress.ts`: remove coordinator application metadata.
- `apps/web/src/features/partner-applications/ui/PartnerWizard.tsx`: use the narrowed role type.
- `apps/web/app/(venue-owner)/dashboard/staff/page.tsx`: replace read-only staff scaffold with real server data and actions.
- `apps/web/src/components/dashboard/enterprise/nav-config.ts`: make coordinator navigation permission-aware.
- `apps/web/src/components/dashboard/enterprise/EnterpriseShell.tsx`: accept resolved coordinator shell context.
- `apps/web/app/(event-coordinator)/dashboard/layout.tsx`: require the coordinator role and load assignment context.
- `apps/web/app/(event-coordinator)/dashboard/coordinator/page.tsx`: stop using owner context and render the safe foundation state.
- `apps/web/src/lib/rbac/roles.ts`: retain coordinator route entry while ensuring invitation acceptance is auth-accessible.
- `packages/database/types/generated.ts`: regenerate from the migrated local database; do not hand-invent rows.
- Existing Supabase policies/functions identified by `rg "is_org_member_for_venue|is_org_member_for_booking" supabase/migrations`: remove coordinator owner-equivalent access while preserving owner/admin behavior.

---

### Task 0: Restore The Database Development Gate And Capture Baseline

**Files:**
- Inspect: `supabase/config.toml`
- Inspect: `package.json`
- Inspect: `apps/web/package.json`
- No source changes

**Interfaces:**
- Consumes: Docker Desktop Linux engine, WSL 2, repository Supabase CLI command, current `.env.local`.
- Produces: a running local Supabase stack, exact CLI-generated migration path for Task 3, and a recorded pre-change verification baseline.

- [ ] **Step 1: Confirm no package or lockfile drift**

Run:

```powershell
git status --short
git diff -- package.json pnpm-lock.yaml apps/web/package.json
```

Expected: only approved documentation or user changes are listed; dependency files have no coordinator changes.

- [ ] **Step 2: Verify the required local executables without installing anything**

Run:

```powershell
docker version
wsl --status
supabase --version
```

Expected: Docker reports a Linux server, WSL reports version 2, and Supabase CLI prints an installed version. If any command fails, stop database work and repair that external runtime without running `pnpm install`, `pnpm add`, or `pnpm exec supabase`.

- [ ] **Step 3: Start and inspect the local Supabase stack**

Run:

```powershell
supabase start
supabase status
```

Expected: database, Auth, API, Realtime, and Studio are healthy and local URLs are printed.

- [ ] **Step 4: Capture the current application baseline**

Run:

```powershell
pnpm --filter @venora/web exec vitest run
pnpm --filter @venora/web type-check
pnpm --filter @venora/web build
git grep -n -E "^(<<<<<<<|=======|>>>>>>>)"
```

Expected: tests report their current baseline; type-check and build may report only the known `apps/web/src/components/layout/MarketplaceLayout.tsx:33` optional `user` mismatch; conflict search returns no matches.

- [ ] **Step 5: Create the migration through the CLI**

Run:

```powershell
supabase migration new event_coordinator_foundation
Get-ChildItem supabase/migrations/*event_coordinator_foundation.sql | Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName
```

Expected: exactly one new migration path is printed. Store that exact path in the execution notes and use it in Tasks 3 and 4.

**Checkpoint:** Review command output and migration path. Do not commit.

---

### Task 1: Define The Coordinator Permission Contract

**Files:**
- Create: `apps/web/src/lib/rbac/coordinator-permissions.test.ts`
- Create: `apps/web/src/lib/rbac/coordinator-permissions.ts`

**Interfaces:**
- Consumes: no database state.
- Produces: `COORDINATOR_PERMISSIONS`, `CoordinatorPermission`, `COORDINATOR_PERMISSION_PRESETS`, `CoordinatorPermissionPreset`, `isCoordinatorPermission(value)`, and `resolveCoordinatorPermissions(preset, requested)`.

- [ ] **Step 1: Write failing permission tests**

```ts
import { describe, expect, it } from "vitest";
import {
  COORDINATOR_PERMISSIONS,
  COORDINATOR_PERMISSION_PRESETS,
  resolveCoordinatorPermissions,
} from "./coordinator-permissions";

describe("coordinator permissions", () => {
  it("keeps every preset inside the allowlist", () => {
    const allowed = new Set<string>(COORDINATOR_PERMISSIONS);
    for (const permissions of Object.values(COORDINATOR_PERMISSION_PRESETS)) {
      expect(permissions.every((permission) => allowed.has(permission))).toBe(true);
    }
  });

  it("resolves a preset to a unique immutable copy", () => {
    const resolved = resolveCoordinatorPermissions("booking_coordinator", []);
    expect(resolved).toContain("booking.view");
    expect(resolved).toContain("message.send");
    expect(new Set(resolved).size).toBe(resolved.length);
    expect(resolved).not.toBe(COORDINATOR_PERMISSION_PRESETS.booking_coordinator);
  });

  it("intersects custom permissions with the server allowlist", () => {
    expect(
      resolveCoordinatorPermissions("custom", [
        "venue.view",
        "venue.view",
        "payout.manage",
      ]),
    ).toEqual(["venue.view"]);
  });
});
```

- [ ] **Step 2: Verify the new test fails**

Run:

```powershell
pnpm --filter @venora/web exec vitest run src/lib/rbac/coordinator-permissions.test.ts
```

Expected: FAIL because `coordinator-permissions.ts` does not exist.

- [ ] **Step 3: Implement the permission catalog and presets**

```ts
export const COORDINATOR_PERMISSIONS = [
  "venue.view",
  "venue.edit_content",
  "venue.manage_media",
  "venue.manage_packages",
  "booking.view",
  "booking.respond",
  "booking.approve",
  "booking.decline",
  "booking.assign_coordinator",
  "booking.add_internal_notes",
  "calendar.view",
  "calendar.manage",
  "calendar.manage_blackouts",
  "calendar.manage_maintenance",
  "message.view",
  "message.send",
  "supplier.view",
  "supplier.recommend",
  "supplier.coordinate",
  "task.view",
  "task.create",
  "task.update",
  "task.assign",
  "task.complete",
  "report.view_operations",
  "report.view_limited_financials",
] as const;

export type CoordinatorPermission = (typeof COORDINATOR_PERMISSIONS)[number];

export const COORDINATOR_PERMISSION_PRESETS = {
  booking_coordinator: [
    "venue.view",
    "booking.view",
    "booking.respond",
    "booking.approve",
    "booking.decline",
    "booking.add_internal_notes",
    "calendar.view",
    "message.view",
    "message.send",
    "supplier.view",
    "task.view",
    "task.create",
    "task.update",
    "task.complete",
    "report.view_operations",
  ],
  operations_coordinator: [
    "venue.view",
    "booking.view",
    "booking.respond",
    "booking.add_internal_notes",
    "calendar.view",
    "calendar.manage",
    "calendar.manage_blackouts",
    "calendar.manage_maintenance",
    "message.view",
    "message.send",
    "supplier.view",
    "supplier.recommend",
    "supplier.coordinate",
    "task.view",
    "task.create",
    "task.update",
    "task.assign",
    "task.complete",
    "report.view_operations",
  ],
  content_coordinator: [
    "venue.view",
    "venue.edit_content",
    "venue.manage_media",
    "venue.manage_packages",
    "calendar.view",
    "supplier.view",
  ],
  read_only_coordinator: [
    "venue.view",
    "booking.view",
    "calendar.view",
    "message.view",
    "supplier.view",
    "task.view",
    "report.view_operations",
  ],
  venue_manager: [...COORDINATOR_PERMISSIONS],
  custom: [],
} as const satisfies Record<string, readonly CoordinatorPermission[]>;

export type CoordinatorPermissionPreset = keyof typeof COORDINATOR_PERMISSION_PRESETS;

const permissionSet = new Set<string>(COORDINATOR_PERMISSIONS);

export function isCoordinatorPermission(value: string): value is CoordinatorPermission {
  return permissionSet.has(value);
}

export function resolveCoordinatorPermissions(
  preset: CoordinatorPermissionPreset,
  requested: readonly string[],
): CoordinatorPermission[] {
  const source = preset === "custom" ? requested : COORDINATOR_PERMISSION_PRESETS[preset];
  return [...new Set(source.filter(isCoordinatorPermission))];
}
```

- [ ] **Step 4: Run the focused test and type-check the module**

Run:

```powershell
pnpm --filter @venora/web exec vitest run src/lib/rbac/coordinator-permissions.test.ts
pnpm --filter @venora/web exec tsc --noEmit --pretty false
```

Expected: permission tests PASS; TypeScript reports no new error in either coordinator permission file.

**Checkpoint:** Review only the two permission files. Do not commit.

---

### Task 2: Define Staff Invitation And Assignment Validation

**Files:**
- Create: `apps/web/src/features/staff/schemas/staff-invitation.schema.test.ts`
- Create: `apps/web/src/features/staff/schemas/staff-invitation.schema.ts`

**Interfaces:**
- Consumes: `CoordinatorPermissionPreset`, `isCoordinatorPermission`, and `resolveCoordinatorPermissions` from Task 1.
- Produces: `createStaffInvitationSchema`, `updateStaffAssignmentSchema`, `invitationTokenSchema`, `acceptStaffInvitationSchema`, and inferred input types.

- [ ] **Step 1: Write failing schema tests**

```ts
import { describe, expect, it } from "vitest";
import {
  acceptStaffInvitationSchema,
  createStaffInvitationSchema,
} from "./staff-invitation.schema";

describe("staff invitation schema", () => {
  it("normalizes email and deduplicates venues", () => {
    const result = createStaffInvitationSchema.parse({
      email: " Coordinator@Example.COM ",
      venueIds: [
        "11111111-1111-4111-8111-111111111111",
        "11111111-1111-4111-8111-111111111111",
      ],
      preset: "read_only_coordinator",
      permissions: [],
      jobTitle: " Event Lead ",
    });
    expect(result.email).toBe("coordinator@example.com");
    expect(result.venueIds).toHaveLength(1);
    expect(result.jobTitle).toBe("Event Lead");
  });

  it("requires explicit account conversion confirmation", () => {
    expect(() =>
      acceptStaffInvitationSchema.parse({ token: "a".repeat(64), confirmRoleConversion: false }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Verify failure**

Run:

```powershell
pnpm --filter @venora/web exec vitest run src/features/staff/schemas/staff-invitation.schema.test.ts
```

Expected: FAIL because the schema module does not exist.

- [ ] **Step 3: Implement complete action schemas**

```ts
import { z } from "zod";
import {
  COORDINATOR_PERMISSION_PRESETS,
  isCoordinatorPermission,
} from "@/lib/rbac/coordinator-permissions";

const uuid = z.string().uuid();
const preset = z.enum(
  Object.keys(COORDINATOR_PERMISSION_PRESETS) as [
    keyof typeof COORDINATOR_PERMISSION_PRESETS,
    ...(keyof typeof COORDINATOR_PERMISSION_PRESETS)[],
  ],
);

export const createStaffInvitationSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  venueIds: z.array(uuid).min(1).transform((values) => [...new Set(values)]),
  preset,
  permissions: z.array(z.string()).transform((values, context) => {
    const invalid = values.filter((value) => !isCoordinatorPermission(value));
    if (invalid.length > 0) {
      context.addIssue({ code: "custom", message: "One or more permissions are not allowed." });
      return z.NEVER;
    }
    return [...new Set(values)];
  }),
  jobTitle: z.string().trim().max(80).transform((value) => value || null),
});

export const updateStaffAssignmentSchema = z.object({
  assignmentId: uuid,
  preset,
  permissions: z.array(z.string()).refine(
    (values) => values.every(isCoordinatorPermission),
    "One or more permissions are not allowed.",
  ),
  status: z.enum(["active", "suspended", "revoked"]),
  jobTitle: z.string().trim().max(80).transform((value) => value || null),
});

export const invitationTokenSchema = z.string().regex(/^[a-f0-9]{64}$/i);

export const acceptStaffInvitationSchema = z.object({
  token: invitationTokenSchema,
  confirmRoleConversion: z.literal(true),
});

export type CreateStaffInvitationInput = z.infer<typeof createStaffInvitationSchema>;
export type UpdateStaffAssignmentInput = z.infer<typeof updateStaffAssignmentSchema>;
export type AcceptStaffInvitationInput = z.infer<typeof acceptStaffInvitationSchema>;
```

- [ ] **Step 4: Run focused validation tests**

Run:

```powershell
pnpm --filter @venora/web exec vitest run src/features/staff/schemas/staff-invitation.schema.test.ts
```

Expected: PASS with email normalization, venue deduplication, invalid permission rejection, and explicit confirmation coverage.

**Checkpoint:** Review schema error copy and inferred types. Do not commit.

---

### Task 3: Add Assignment And Invitation Storage With Safe RLS

**Files:**
- Modify: exact CLI-generated `supabase/migrations/*event_coordinator_foundation.sql` path from Task 0
- Create: `supabase/tests/event_coordinator_foundation.sql`

**Interfaces:**
- Consumes: the exact permission keys and preset names from Task 1.
- Produces: `public.venue_staff_assignments`, `public.venue_staff_invitations`, `public.venue_staff_invitation_venues`, `private.venue_staff_invitation_secrets`, private permission helpers, indexes, grants, RLS, and timestamp triggers.

- [ ] **Step 1: Write the failing database contract test**

Create a pgTAP transaction that verifies the four tables, RLS, uniqueness, grants, and helper visibility:

```sql
begin;
select plan(17);

select has_table('public', 'venue_staff_assignments');
select has_table('public', 'venue_staff_invitations');
select has_table('public', 'venue_staff_invitation_venues');
select has_table('private', 'venue_staff_invitation_secrets');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.venue_staff_assignments'::regclass),
  'venue_staff_assignments has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.venue_staff_invitations'::regclass),
  'venue_staff_invitations has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.venue_staff_invitation_venues'::regclass),
  'venue_staff_invitation_venues has RLS enabled'
);
select has_index('public', 'venue_staff_assignments', 'venue_staff_assignments_active_user_venue_idx');
select has_index('public', 'venue_staff_assignments', 'venue_staff_assignments_venue_status_idx');
select has_index('public', 'venue_staff_invitations', 'venue_staff_invitations_email_status_idx');
select has_index('private', 'venue_staff_invitation_secrets', 'venue_staff_invitation_secrets_token_hash_key');
select has_function('private', 'has_venue_staff_permission', array['uuid', 'text']);
select has_function('private', 'owns_venue', array['uuid']);
select function_privs_are(
  'private', 'has_venue_staff_permission', array['uuid', 'text'], 'anon', array[]::text[]
);
select function_privs_are(
  'private', 'has_venue_staff_permission', array['uuid', 'text'], 'authenticated', array['EXECUTE']
);
select table_privs_are(
  'private', 'venue_staff_invitation_secrets', 'authenticated', array[]::text[]
);
select table_privs_are(
  'private', 'venue_staff_invitation_secrets', 'anon', array[]::text[]
);

select * from finish();
rollback;
```

- [ ] **Step 2: Run the database test before migration**

Run:

```powershell
supabase db reset
supabase test db supabase/tests/event_coordinator_foundation.sql
```

Expected: FAIL because the new schema is absent.

- [ ] **Step 3: Add constrained tables and indexes to the CLI-generated migration**

The migration must create a private schema owned by Postgres, store invitation hashes only in that schema, use `timestamptz`, and use these exact constraints:

```sql
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.venue_staff_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  staff_role text not null default 'event_coordinator'
    check (staff_role = 'event_coordinator'),
  permission_preset text not null
    check (permission_preset in ('booking_coordinator','operations_coordinator','content_coordinator','read_only_coordinator','venue_manager','custom')),
  permissions text[] not null default '{}',
  status text not null default 'active'
    check (status in ('active','suspended','revoked')),
  job_title text check (job_title is null or char_length(job_title) <= 80),
  invited_by uuid not null references auth.users(id),
  accepted_at timestamptz not null default now(),
  suspended_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, venue_id),
  check (
    permissions <@ array[
      'venue.view','venue.edit_content','venue.manage_media','venue.manage_packages',
      'booking.view','booking.respond','booking.approve','booking.decline',
      'booking.assign_coordinator','booking.add_internal_notes','calendar.view',
      'calendar.manage','calendar.manage_blackouts','calendar.manage_maintenance',
      'message.view','message.send','supplier.view','supplier.recommend',
      'supplier.coordinate','task.view','task.create','task.update','task.assign',
      'task.complete','report.view_operations','report.view_limited_financials'
    ]::text[]
  )
);

create unique index venue_staff_assignments_active_user_venue_idx
  on public.venue_staff_assignments (user_id, venue_id)
  where status <> 'revoked';
create index venue_staff_assignments_venue_status_idx
  on public.venue_staff_assignments (venue_id, status, user_id);
create index venue_staff_assignments_user_status_idx
  on public.venue_staff_assignments (user_id, status, venue_id)
  include (organization_id, permissions, permission_preset);

create table public.venue_staff_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invited_email text not null check (invited_email = lower(trim(invited_email))),
  staff_role text not null default 'event_coordinator' check (staff_role = 'event_coordinator'),
  permission_preset text not null
    check (permission_preset in ('booking_coordinator','operations_coordinator','content_coordinator','read_only_coordinator','venue_manager','custom')),
  permissions text[] not null default '{}',
  job_title text check (job_title is null or char_length(job_title) <= 80),
  status text not null default 'pending'
    check (status in ('pending','accepted','declined','expired','revoked')),
  expires_at timestamptz not null,
  invited_by uuid not null references auth.users(id),
  accepted_by uuid references auth.users(id),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create index venue_staff_invitations_email_status_idx
  on public.venue_staff_invitations (invited_email, status, expires_at);
create index venue_staff_invitations_owner_status_idx
  on public.venue_staff_invitations (organization_id, invited_by, status, created_at desc);

create table public.venue_staff_invitation_venues (
  invitation_id uuid not null references public.venue_staff_invitations(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete cascade,
  primary key (invitation_id, venue_id)
);
create index venue_staff_invitation_venues_venue_idx
  on public.venue_staff_invitation_venues (venue_id, invitation_id);

create table private.venue_staff_invitation_secrets (
  invitation_id uuid primary key references public.venue_staff_invitations(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);
alter table private.venue_staff_invitation_secrets owner to postgres;
alter table private.venue_staff_invitation_secrets enable row level security;
```

Add a constraint trigger that verifies each assignment and invitation venue belongs to the stored organization. Add the repository's existing `updated_at` trigger function to assignments and invitations.

- [ ] **Step 4: Add non-exposed authorization helpers**

```sql
create or replace function private.owns_venue(p_venue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.venues v
    join public.organizations o on o.id = v.organization_id
    where v.id = p_venue_id
      and (o.owner_id = (select auth.uid()) or public.is_admin())
  );
$$;

create or replace function private.has_venue_staff_permission(
  p_venue_id uuid,
  p_permission text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.venue_staff_assignments a
    where a.venue_id = p_venue_id
      and a.user_id = (select auth.uid())
      and a.status = 'active'
      and p_permission = any(a.permissions)
  );
$$;

revoke all on function private.owns_venue(uuid) from public, anon, authenticated;
revoke all on function private.has_venue_staff_permission(uuid, text) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.owns_venue(uuid) to authenticated;
grant execute on function private.has_venue_staff_permission(uuid, text) to authenticated;
```

- [ ] **Step 5: Add explicit grants and RLS policies**

Use these access boundaries:

```sql
alter table public.venue_staff_assignments enable row level security;
alter table public.venue_staff_invitations enable row level security;
alter table public.venue_staff_invitation_venues enable row level security;

revoke all on public.venue_staff_assignments from anon, authenticated;
revoke all on public.venue_staff_invitations from anon, authenticated;
revoke all on public.venue_staff_invitation_venues from anon, authenticated;

grant select on public.venue_staff_assignments to authenticated;
grant select on public.venue_staff_invitations to authenticated;
grant select on public.venue_staff_invitation_venues to authenticated;

create policy "owners read venue staff assignments"
on public.venue_staff_assignments for select to authenticated
using (private.owns_venue(venue_id));

create policy "coordinators read own assignments"
on public.venue_staff_assignments for select to authenticated
using (user_id = (select auth.uid()));

create policy "owners read organization invitations"
on public.venue_staff_invitations for select to authenticated
using (
  exists (
    select 1 from public.organizations o
    where o.id = organization_id
      and (o.owner_id = (select auth.uid()) or public.is_admin())
  )
);

create policy "invitees read matching invitations"
on public.venue_staff_invitations for select to authenticated
using (
  invited_email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  and status = 'pending'
  and expires_at > now()
);

create policy "authorized users read invitation venues"
on public.venue_staff_invitation_venues for select to authenticated
using (
  exists (
    select 1 from public.venue_staff_invitations i
    where i.id = invitation_id
  )
);
```

Do not add insert, update, or delete policies for authenticated users. Task 4 RPCs own all mutations and audit writes.

- [ ] **Step 6: Reset and run the database contract**

Run:

```powershell
supabase db reset
supabase test db supabase/tests/event_coordinator_foundation.sql
```

Expected: all 17 pgTAP assertions PASS; reset completes without migration-order errors.

**Checkpoint:** Inspect `supabase db diff --schema public,private` and confirm it is empty after reset. Do not commit.

---

### Task 4: Add Atomic Invitation And Assignment RPCs

**Files:**
- Modify: CLI-generated foundation migration from Task 0
- Modify: `supabase/tests/event_coordinator_foundation.sql`

**Interfaces:**
- Consumes: tables/private helpers from Task 3.
- Produces: `create_venue_staff_invitation`, `preview_venue_staff_invitation`, `accept_venue_staff_invitation`, `decline_venue_staff_invitation`, `update_venue_staff_assignment`, `revoke_venue_staff_invitation`, and `rotate_venue_staff_invitation_token` RPCs.

- [ ] **Step 1: Extend failing pgTAP coverage**

Add assertions that every RPC exists, `anon` has no execute privilege, `authenticated` has execute privilege only on the public RPCs, and direct table mutation remains denied. Add fixture transactions proving:

```sql
-- Owner may invite only to venues owned by the same organization.
-- Matching authenticated email may preview and accept once.
-- Customer conversion requires p_confirm_role_conversion = true.
-- venue_owner, supplier, and admin roles cannot be converted.
-- Expired, revoked, reused, or wrong-email tokens fail.
-- Acceptance creates organization membership and one active assignment per invited venue.
-- Coordinator cannot update, suspend, restore, revoke, or broaden an assignment.
-- Revocation removes authorization immediately.
```

Use deterministic fixture UUIDs and `set local request.jwt.claims` for each actor. Roll back the entire test.

- [ ] **Step 2: Verify new assertions fail**

Run:

```powershell
supabase db reset
supabase test db supabase/tests/event_coordinator_foundation.sql
```

Expected: FAIL only for the missing RPC contracts and behavior.

- [ ] **Step 3: Implement the invitation creation RPC**

The function must be `security definer`, set `search_path = ''`, normalize email, reject non-owner venues, resolve permissions against the SQL allowlist, insert the public invitation and private hash atomically, insert all venue links, emit an audit row without the hash, and return only the invitation UUID and expiry:

```sql
create or replace function public.create_venue_staff_invitation(
  p_invited_email text,
  p_venue_ids uuid[],
  p_permission_preset text,
  p_permissions text[],
  p_job_title text,
  p_token_hash text
)
returns table (invitation_id uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_invitation_id uuid := gen_random_uuid();
  v_expires_at timestamptz := now() + interval '7 days';
  v_permissions text[];
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if array_length(p_venue_ids, 1) is null then raise exception 'Select at least one venue'; end if;
  if p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid invitation token'; end if;

  select min(v.organization_id)
  into v_org_id
  from public.venues v
  join public.organizations o on o.id = v.organization_id
  where v.id = any(p_venue_ids)
    and (o.owner_id = v_user_id or public.is_admin());

  if v_org_id is null or exists (
    select 1 from unnest(p_venue_ids) venue_id
    left join public.venues v on v.id = venue_id and v.organization_id = v_org_id
    where v.id is null
  ) then
    raise exception 'One or more venues cannot be managed by this account';
  end if;

  select coalesce(array_agg(distinct permission order by permission), '{}')
  into v_permissions
  from unnest(coalesce(p_permissions, '{}')) permission
  where permission = any(array[
    'venue.view','venue.edit_content','venue.manage_media','venue.manage_packages',
    'booking.view','booking.respond','booking.approve','booking.decline',
    'booking.assign_coordinator','booking.add_internal_notes','calendar.view',
    'calendar.manage','calendar.manage_blackouts','calendar.manage_maintenance',
    'message.view','message.send','supplier.view','supplier.recommend',
    'supplier.coordinate','task.view','task.create','task.update','task.assign',
    'task.complete','report.view_operations','report.view_limited_financials'
  ]::text[]);

  insert into public.venue_staff_invitations (
    id, organization_id, invited_email, permission_preset, permissions,
    job_title, expires_at, invited_by
  ) values (
    v_invitation_id, v_org_id, lower(trim(p_invited_email)),
    p_permission_preset, v_permissions, nullif(trim(p_job_title), ''),
    v_expires_at, v_user_id
  );

  insert into private.venue_staff_invitation_secrets (invitation_id, token_hash)
  values (v_invitation_id, p_token_hash);

  insert into public.venue_staff_invitation_venues (invitation_id, venue_id)
  select v_invitation_id, venue_id from unnest(p_venue_ids) venue_id
  on conflict do nothing;

  perform public.log_audit(
    'venue_staff.invited', 'venue_staff_invitation', v_invitation_id,
    jsonb_build_object('email', lower(trim(p_invited_email)), 'venue_count', cardinality(p_venue_ids))
  );

  return query select v_invitation_id, v_expires_at;
end;
$$;
```

The existing audit helper signature is `public.log_audit(text, text, uuid, jsonb)`; keep the metadata keys shown and omit secrets.

- [ ] **Step 4: Implement preview and acceptance RPCs**

`preview_venue_staff_invitation(p_token_hash text)` returns only invitation ID, normalized invited email, organization name, venue IDs/names, preset, permissions, job title, status, and expiry after token-hash lookup. It requires authenticated matching email.

`accept_venue_staff_invitation(p_token_hash text, p_confirm_role_conversion boolean)` must lock the invitation row `for update`, recompute expiry, check email with `auth.jwt() ->> 'email'`, read the current `user_roles` row, reject `venue_owner`, `supplier`, and `admin`, require confirmation for `customer`, update customer to `event_coordinator`, insert `organization_members` with `role = 'coordinator'`, insert one active assignment per invitation venue, mark accepted, delete the private secret, and write a secret-free audit row in one transaction.

Use this transition guard inside the function:

```sql
if v_current_role = 'customer' and not p_confirm_role_conversion then
  raise exception 'Role conversion confirmation required';
elsif v_current_role not in ('customer', 'event_coordinator') then
  raise exception 'This account role cannot accept a coordinator invitation';
end if;
```

- [ ] **Step 5: Implement owner lifecycle RPCs**

Each assignment mutation loads the target assignment, verifies `private.owns_venue(assignment.venue_id)`, validates permissions against the same SQL allowlist, updates timestamps consistently, and writes an audit row. Invitation revoke and token rotation verify organization ownership; rotation stores only the new SHA-256 hash and extends expiry by seven days.

Grant only these function signatures:

```sql
revoke all on function public.create_venue_staff_invitation(text, uuid[], text, text[], text, text) from public, anon;
grant execute on function public.create_venue_staff_invitation(text, uuid[], text, text[], text, text) to authenticated;
-- Repeat explicit revoke/grant for each public foundation RPC signature.
```

- [ ] **Step 6: Run database behavior tests and advisors**

Run:

```powershell
supabase db reset
supabase test db supabase/tests/event_coordinator_foundation.sql
supabase db lint --level warning
```

Expected: all foundation tests PASS; lint reports no new security-definer search-path, RLS, unindexed foreign-key, or privilege warnings.

**Checkpoint:** Inspect every RPC grant with `\df+` in local Postgres and confirm secrets are inaccessible to `anon` and `authenticated`. Do not commit.

---

### Task 5: Regenerate Types And Add Server Authorization Helpers

**Files:**
- Modify: `packages/database/types/generated.ts`
- Create: `apps/web/src/features/staff/application/coordinator-authorization.test.ts`
- Create: `apps/web/src/features/staff/application/coordinator-authorization.ts`

**Interfaces:**
- Consumes: generated assignment rows and `CoordinatorPermission` from Task 1.
- Produces: `requireCoordinatorUser()`, `getCoordinatorAssignments(userId)`, `requireVenueAssignment(venueId)`, and `requireVenuePermission(venueId, permission)`.

- [ ] **Step 1: Regenerate database types from local Supabase**

Run the repository's existing type generation command found in `package.json`:

```powershell
pnpm db:types
git diff -- packages/database/types/generated.ts
```

Expected: generated types include all three public tables and all public RPC signatures; no manual `any` additions or private secret table browser type are introduced.

- [ ] **Step 2: Write failing authorization tests**

Mock `@/lib/supabase/server` and assert:

```ts
it("rejects a coordinator without an active assignment", async () => {
  mockUser("coordinator-user");
  mockRole("event_coordinator");
  mockAssignments([]);
  await expect(requireVenuePermission(VENUE_ID, "booking.view")).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
});

it("rejects a missing permission on an active assignment", async () => {
  mockAssignment({ venue_id: VENUE_ID, status: "active", permissions: ["venue.view"] });
  await expect(requireVenuePermission(VENUE_ID, "booking.approve")).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
});

it("returns the active assignment when permission exists", async () => {
  mockAssignment({ venue_id: VENUE_ID, status: "active", permissions: ["booking.view"] });
  await expect(requireVenuePermission(VENUE_ID, "booking.view")).resolves.toMatchObject({
    venue_id: VENUE_ID,
  });
});
```

- [ ] **Step 3: Verify tests fail**

Run:

```powershell
pnpm --filter @venora/web exec vitest run src/features/staff/application/coordinator-authorization.test.ts
```

Expected: FAIL because the authorization helper does not exist.

- [ ] **Step 4: Implement server-only guards**

```ts
import "server-only";
import { cache } from "react";
import type { CoordinatorPermission } from "@/lib/rbac/coordinator-permissions";
import { requireRole } from "@/lib/rbac/guards";
import { createClient } from "@/lib/supabase/server";

export class CoordinatorAuthorizationError extends Error {
  readonly code = "FORBIDDEN";
}

export const requireCoordinatorUser = cache(async () => {
  return requireRole("event_coordinator");
});

export const getCoordinatorAssignments = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("venue_staff_assignments")
    .select("id,organization_id,venue_id,user_id,permission_preset,permissions,status,job_title,accepted_at")
    .eq("user_id", userId)
    .order("accepted_at", { ascending: true });
  if (error) throw error;
  return data;
});

export async function requireVenueAssignment(venueId: string) {
  const { user } = await requireCoordinatorUser();
  const assignments = await getCoordinatorAssignments(user.id);
  const assignment = assignments.find(
    (candidate) => candidate.venue_id === venueId && candidate.status === "active",
  );
  if (!assignment) throw new CoordinatorAuthorizationError("Venue access is not assigned.");
  return assignment;
}

export async function requireVenuePermission(
  venueId: string,
  permission: CoordinatorPermission,
) {
  const assignment = await requireVenueAssignment(venueId);
  if (!assignment.permissions.includes(permission)) {
    throw new CoordinatorAuthorizationError("This action is not permitted.");
  }
  return assignment;
}
```

Use the exact `requireRole` return shape from `apps/web/src/lib/rbac/guards.ts`; adjust destructuring without changing the exported signatures above.

- [ ] **Step 5: Run focused tests and generated-type checks**

Run:

```powershell
pnpm --filter @venora/web exec vitest run src/features/staff/application/coordinator-authorization.test.ts src/lib/rbac/coordinator-permissions.test.ts
pnpm test:database
```

Expected: focused tests PASS and generated database contracts match the local schema.

**Checkpoint:** Search the helper for `as any`, client IDs, and owner context imports; all searches must be empty. Do not commit.

---

### Task 6: Add Secure Invitation Server Actions And Email Delivery

**Files:**
- Create: `apps/web/src/features/staff/application/staff-invitation-actions.test.ts`
- Create: `apps/web/src/features/staff/application/staff-invitation-actions.ts`
- Create: `apps/web/src/features/staff/application/get-owner-staff.ts`
- Create: `apps/web/src/features/staff/application/get-invitation-preview.ts`

**Interfaces:**
- Consumes: Task 2 schemas, Task 4 RPCs, existing server Supabase clients, existing owner dashboard context, and existing server-side Auth admin/email helper.
- Produces: `createStaffInvitationAction`, `acceptStaffInvitationAction`, `declineStaffInvitationAction`, `updateStaffAssignmentAction`, `revokeStaffInvitationAction`, `resendStaffInvitationAction`, `getOwnerStaff`, and `getInvitationPreview`.

- [ ] **Step 1: Write failing action tests**

Cover these exact outcomes:

```ts
it("hashes a random token and never returns the hash", async () => {
  mockRandomBytes(Buffer.alloc(32, 7));
  mockCreateInvitationRpc({ invitation_id: INVITATION_ID, expires_at: EXPIRES_AT });
  const result = await createStaffInvitationAction(validInput);
  expect(mockRpc).toHaveBeenCalledWith("create_venue_staff_invitation", expect.objectContaining({
    p_token_hash: createHash("sha256").update(Buffer.alloc(32, 7).toString("hex")).digest("hex"),
  }));
  expect(result).toEqual({ ok: true });
  expect(JSON.stringify(result)).not.toContain("p_token_hash");
});

it("returns a stable safe error for unauthorized venue input", async () => {
  mockRpcError("One or more venues cannot be managed by this account");
  await expect(createStaffInvitationAction(validInput)).resolves.toEqual({
    ok: false,
    message: "Unable to invite this coordinator for the selected venues.",
  });
});

it("requires explicit conversion confirmation on acceptance", async () => {
  await expect(
    acceptStaffInvitationAction({ token: RAW_TOKEN, confirmRoleConversion: false }),
  ).resolves.toEqual({ ok: false, message: "Confirm the account role change to continue." });
});
```

- [ ] **Step 2: Verify action tests fail**

Run:

```powershell
pnpm --filter @venora/web exec vitest run src/features/staff/application/staff-invitation-actions.test.ts
```

Expected: FAIL because the action module does not exist.

- [ ] **Step 3: Implement token generation and RPC invocation**

```ts
"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { resolveCoordinatorPermissions } from "@/lib/rbac/coordinator-permissions";
import { getOwnerDashboardContext } from "@/lib/dashboard/org-dashboard-data";
import { createClient } from "@/lib/supabase/server";
import {
  acceptStaffInvitationSchema,
  createStaffInvitationSchema,
  updateStaffAssignmentSchema,
} from "../schemas/staff-invitation.schema";

type StaffActionResult = { ok: true } | { ok: false; message: string };

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createStaffInvitationAction(rawInput: unknown): Promise<StaffActionResult> {
  const parsed = createStaffInvitationSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, message: "Check the invitation details and try again." };

  const { supabase } = await getOwnerDashboardContext();
  const rawToken = randomBytes(32).toString("hex");
  const permissions = resolveCoordinatorPermissions(parsed.data.preset, parsed.data.permissions);
  const { data, error } = await supabase.rpc("create_venue_staff_invitation", {
    p_invited_email: parsed.data.email,
    p_venue_ids: parsed.data.venueIds,
    p_permission_preset: parsed.data.preset,
    p_permissions: permissions,
    p_job_title: parsed.data.jobTitle ?? "",
    p_token_hash: hashToken(rawToken),
  });
  if (error || !data?.[0]) {
    return { ok: false, message: "Unable to invite this coordinator for the selected venues." };
  }

  await deliverCoordinatorInvitation({
    email: parsed.data.email,
    invitationUrl: `${getPublicSiteUrl()}/staff/invitations/${rawToken}`,
    expiresAt: data[0].expires_at,
  });
  revalidatePath("/dashboard/staff");
  return { ok: true };
}
```

Implement `deliverCoordinatorInvitation` with `createAdminClient()` from `apps/web/src/lib/supabase/admin.ts`. Locate an existing auth user through a paginated, exact normalized-email comparison; use `admin.auth.admin.inviteUserByEmail` for a new user and `admin.auth.admin.generateLink({ type: "magiclink" })` for an existing user, with `redirectTo` set to the invitation route. Keep this lookup and all service-role calls server-only; never import the admin client into a Client Component.

- [ ] **Step 4: Implement acceptance and lifecycle actions**

Acceptance hashes the raw route token, invokes `accept_venue_staff_invitation`, revalidates `/dashboard/coordinator`, `/dashboard/staff`, and the invitation route, and redirects only after a successful RPC. Every lifecycle action parses Task 2 schemas, invokes one narrow RPC, returns stable user-safe copy, and revalidates owner staff plus coordinator shell paths.

- [ ] **Step 5: Implement scoped read queries**

`getOwnerStaff()` starts from `getOwnerDashboardContext()`, queries assignments and pending invitations visible through RLS, joins only venue/profile display fields needed by the page, and returns separate `assignments` and `invitations` arrays.

`getInvitationPreview(rawToken)` requires auth, hashes the token server-side, invokes `preview_venue_staff_invitation`, and returns this browser-safe type:

```ts
export type StaffInvitationPreview = {
  invitationId: string;
  invitedEmail: string;
  organizationName: string;
  venues: Array<{ id: string; name: string }>;
  permissionPreset: string;
  permissions: string[];
  jobTitle: string | null;
  expiresAt: string;
};
```

- [ ] **Step 6: Run focused tests**

Run:

```powershell
pnpm --filter @venora/web exec vitest run src/features/staff/application/staff-invitation-actions.test.ts src/features/staff/schemas/staff-invitation.schema.test.ts
```

Expected: PASS for hashing, safe errors, ownership failure, confirmation, expiry, resend, revoke, and revalidation behavior.

**Checkpoint:** Search action results and audit metadata for `token`, `hash`, `service_role`, and session objects. Only local server variables and RPC argument names may match. Do not commit.

---

### Task 7: Replace The Owner Staff Scaffold With Real Management

**Files:**
- Create: `apps/web/src/features/staff/ui/InviteCoordinatorDialog.tsx`
- Create: `apps/web/src/features/staff/ui/StaffAccessCard.tsx`
- Modify: `apps/web/app/(venue-owner)/dashboard/staff/page.tsx`

**Interfaces:**
- Consumes: `getOwnerStaff`, venue list from owner context, coordinator presets, and Task 6 actions.
- Produces: owner invitation, resend, revoke, suspend, restore, permission edit, and empty/error states.

- [ ] **Step 1: Add component tests for permission-sensitive form behavior**

Use existing Testing Library setup to assert the dialog requires email and at least one owned venue, preset selection populates permission checkboxes, custom mode exposes the allowlist, and no owner-only financial permission is rendered.

- [ ] **Step 2: Verify component tests fail**

Run:

```powershell
pnpm --filter @venora/web exec vitest run src/features/staff/ui
```

Expected: FAIL because the UI components do not exist.

- [ ] **Step 3: Implement the invitation dialog**

Use the existing dialog, input, select, checkbox, button, and action-state components. The form submits exactly:

```ts
type InviteCoordinatorFormValues = {
  email: string;
  venueIds: string[];
  preset: CoordinatorPermissionPreset;
  permissions: CoordinatorPermission[];
  jobTitle: string;
};
```

Disable submit while pending, show server action errors inline, and close/reset only on `{ ok: true }`. Venue choices come only from the server-rendered owned venue list.

- [ ] **Step 4: Implement staff access cards**

Each active/suspended assignment card shows display name/email, venue, job title, preset, readable permission groups, status, accepted date, and owner actions. Revoked assignments are history-only. Pending invitation cards show email, venues, expiry, resend, and revoke. Every menu action uses a confirmation dialog and the Task 6 server action.

- [ ] **Step 5: Replace the staff page data source**

The server page calls `getOwnerStaff()`, renders a restrained header plus `Invite coordinator`, shows separate active staff and pending invitations sections, and uses these exact empty messages:

```text
No coordinators yet
Invite a coordinator and assign the venues they can help manage.

No pending invitations
New invitations will appear here until they are accepted or revoked.
```

- [ ] **Step 6: Run UI tests and browser-check owner staff states**

Run:

```powershell
pnpm --filter @venora/web exec vitest run src/features/staff/ui src/features/staff/application
```

Browser checks at 1440x900, 1024x768, and 390x844: empty state, dialog viewport fit, preset/custom controls, pending card, active card, suspended card, validation errors, and keyboard focus return after dialog close.

**Checkpoint:** Verify no client component receives organization owner IDs, token hashes, or unowned venue IDs. Do not commit.

---

### Task 8: Add Invitation Review And Acceptance Route

**Files:**
- Create: `apps/web/src/features/staff/ui/InvitationAcceptanceCard.tsx`
- Create: `apps/web/app/(auth)/staff/invitations/[token]/page.tsx`
- Create: `apps/web/app/(auth)/staff/invitations/[token]/loading.tsx`
- Create: `apps/web/app/(auth)/staff/invitations/[token]/error.tsx`
- Modify: `apps/web/src/lib/rbac/roles.ts`

**Interfaces:**
- Consumes: `getInvitationPreview` and acceptance/decline actions from Task 6.
- Produces: authenticated invite review with explicit customer conversion consent and stable invalid/expired/revoked states.

- [ ] **Step 1: Write route/UI tests**

Cover authenticated matching-email preview, unauthenticated redirect preserving the invite URL, customer confirmation checkbox, existing coordinator acceptance without a second role warning, privileged-role rejection, expired/revoked token copy, and successful redirect to `/dashboard/coordinator`.

- [ ] **Step 2: Verify route tests fail**

Run:

```powershell
pnpm --filter @venora/web exec vitest run src/features/staff/ui/InvitationAcceptanceCard.test.tsx
```

Expected: FAIL because the acceptance UI does not exist.

- [ ] **Step 3: Implement the server route**

The route validates the raw token with `invitationTokenSchema`, requires authentication, loads safe preview data server-side, and renders `notFound()` for malformed tokens. Invalid lifecycle states render a neutral card without revealing whether an unrelated email was invited.

- [ ] **Step 4: Implement explicit acceptance UI**

Show organization, venues, job title, preset, permission groups, expiry, and invited email. For customer accounts, require this unchecked checkbox before enabling acceptance:

```text
I understand that accepting changes this account from Customer to Event Coordinator.
```

Buttons: `Accept invitation` and `Decline`. Errors stay inline; pending state disables both actions.

- [ ] **Step 5: Ensure auth routing preserves the invitation URL**

Update route metadata only as needed so unauthenticated access redirects to:

```text
/login?redirectTo=/staff/invitations/{raw-token}
```

Do not add the invite route to coordinator-only protected route prefixes; authentication and the server preview RPC provide access control.

- [ ] **Step 6: Run tests and browser-check invitation states**

Run focused tests, then inspect the route at 1440x900, 1024x768, and 390x844 for new-user, existing customer, existing coordinator, wrong email, expired, revoked, accepted, and declined states.

Expected: no secret appears in rendered HTML beyond the raw token already present in the route, and successful acceptance lands on the coordinator dashboard.

**Checkpoint:** Inspect browser network responses and React server payloads for token hashes and service-role data; none may appear. Do not commit.

---

### Task 9: Remove Event Coordinator From Public Partner Applications

**Files:**
- Modify: `apps/web/src/features/partner-applications/schemas/partner.schema.ts`
- Modify: `apps/web/src/features/partner-applications/ui/RoleSelection.tsx`
- Modify: `apps/web/src/features/partner-applications/ui/CategorySelection.tsx`
- Modify: `apps/web/src/features/partner-applications/ui/VerificationUpload.tsx`
- Modify: `apps/web/src/features/partner-applications/constants/application-progress.ts`
- Modify: `apps/web/src/features/partner-applications/ui/PartnerWizard.tsx`
- Test: existing partner application tests plus focused schema test

**Interfaces:**
- Consumes: public partner application flow.
- Produces: a two-role public application contract: `venue_owner | supplier`.

- [ ] **Step 1: Add a failing schema regression test**

```ts
it("rejects public event coordinator applications", () => {
  expect(
    partnerApplicationSchema.safeParse({
      ...validApplication,
      roleAppliedFor: "event_coordinator",
    }).success,
  ).toBe(false);
});
```

- [ ] **Step 2: Verify the regression test fails**

Run the exact partner schema test file with Vitest. Expected: FAIL because the current schema accepts `event_coordinator`.

- [ ] **Step 3: Narrow schema and UI role unions**

Use one exported type:

```ts
export const partnerApplicationRoleSchema = z.enum(["venue_owner", "supplier"]);
export type PartnerApplicationRole = z.infer<typeof partnerApplicationRoleSchema>;
```

Replace local role unions in Category Selection, Verification Upload, progress constants, and wizard state with `PartnerApplicationRole`. Delete coordinator cards, categories, documents, labels, and dashboard route mapping from the public application flow.

- [ ] **Step 4: Run partner tests and inspect the public flow**

Run all partner application Vitest files. Browser-check `/account/become-partner`: only Venue Owner and Supplier choices render; submitting a crafted coordinator payload returns validation failure and creates no application.

**Checkpoint:** `rg -n "event_coordinator" apps/web/src/features/partner-applications` may match historical display handling only if required for already-stored records; it must not match a public selectable or accepted value. Do not commit.

---

### Task 10: Gate The Coordinator Shell By Active Assignments And Permissions

**Files:**
- Create: `apps/web/src/features/staff/application/coordinator-context.ts`
- Create: `apps/web/src/features/staff/ui/NoVenueAssignments.tsx`
- Modify: `apps/web/src/components/dashboard/enterprise/nav-config.ts`
- Modify: `apps/web/src/components/dashboard/enterprise/EnterpriseShell.tsx`
- Modify: `apps/web/app/(event-coordinator)/dashboard/layout.tsx`
- Modify: `apps/web/app/(event-coordinator)/dashboard/coordinator/page.tsx`

**Interfaces:**
- Consumes: Task 5 authorization helpers and assignments.
- Produces: `CoordinatorContext`, validated `selectedVenueId`, unioned shell permissions, permission-filtered nav, and safe assignment states.

- [ ] **Step 1: Write failing context tests**

Test all active assignments, mixed suspended/revoked assignments, unauthorized `?venue=`, and permission union behavior:

```ts
expect(resolveSelectedVenue(assignments, "unassigned-id")).toBe(assignments[0]?.venue_id ?? null);
expect(resolveCoordinatorPermissionsForShell(assignments)).toEqual(
  expect.arrayContaining(["venue.view", "booking.view"]),
);
```

- [ ] **Step 2: Implement the cached context**

```ts
export type CoordinatorContext = {
  userId: string;
  assignments: Awaited<ReturnType<typeof getCoordinatorAssignments>>;
  activeAssignments: Awaited<ReturnType<typeof getCoordinatorAssignments>>;
  selectedVenueId: string | null;
  permissions: CoordinatorPermission[];
  state: "active" | "unassigned" | "suspended" | "revoked";
};
```

The context always derives assignments from `auth.uid()`. `selectedVenueId` is accepted only when it appears in `activeAssignments`; otherwise choose the first active assignment. No assignment means no venue queries.

- [ ] **Step 3: Make coordinator nav permission-aware**

Map foundation links only:

```ts
const coordinatorNav = [
  { href: "/dashboard/coordinator", label: "Overview", permission: null },
  { href: "/dashboard/coordinator/venues", label: "My Venues", permission: "venue.view" },
  { href: "/dashboard/coordinator/calendar", label: "Calendar", permission: "calendar.view" },
  { href: "/dashboard/coordinator/reports", label: "Reports", permission: "report.view_operations" },
] satisfies CoordinatorNavItem[];
```

Filter on server-resolved permissions. Keep downstream route links hidden until their secure implementations land in later plans.

- [ ] **Step 4: Replace owner context in the coordinator overview**

The foundation overview shows assigned venue count and permission-aware quick links only. For no active assignment, render one of:

```text
No venue assignments
A venue owner needs to assign at least one venue before you can use the coordinator dashboard.

Access suspended
Your venue access is currently suspended. Contact the venue owner for assistance.

Access revoked
Your previous venue access has been revoked. Contact the venue owner if you believe this is a mistake.
```

Do not query bookings, revenue, messages, suppliers, or calendar data from owner context in this phase.

- [ ] **Step 5: Run shell tests and browser-check states**

Verify active full, read-only, unassigned, suspended-only, and revoked-only accounts at desktop/tablet/mobile widths. Direct navigation to a hidden route must still fail through server authorization rather than merely hiding navigation.

**Checkpoint:** `rg -n "getOwnerDashboardContext" "apps/web/app/(event-coordinator)"` must return no matches for the migrated layout and overview. Remaining coordinator scaffold routes are disabled or redirected until their later secure plans. Do not commit.

---

### Task 11: Remove Coordinator Owner-Equivalent Database Access

**Files:**
- Modify: CLI-generated foundation migration from Task 0
- Modify: `supabase/tests/event_coordinator_foundation.sql`
- Inspect and replace policies/functions found by `rg -n "is_org_member_for_venue|is_org_member_for_booking" supabase/migrations`

**Interfaces:**
- Consumes: `private.has_venue_staff_permission` from Task 3.
- Produces: preserved owner/admin access, preserved intended legacy non-coordinator staff behavior, and assignment-aware coordinator access with no broad financial access.

- [ ] **Step 1: Add failing cross-tenant and permission tests**

The SQL test must prove:

```text
Coordinator A cannot read Venue B when assigned only to Venue A.
Coordinator A cannot read or mutate a revoked/suspended Venue A assignment.
Read-only coordinator cannot update venues, availability, bookings, or messages.
Coordinator with venue.view can read only the assigned venue's safe fields.
Coordinator cannot read transactions, payouts, commissions, owner banking, owner tax, or organization-wide analytics.
Venue owner retains current access to owned venues and bookings.
Admin retains current trusted access.
Customer and supplier access remains unchanged.
```

- [ ] **Step 2: Verify tests expose current broad access**

Run:

```powershell
supabase db reset
supabase test db supabase/tests/event_coordinator_foundation.sql
```

Expected: at least the current organization-member coordinator isolation assertions FAIL before policy tightening.

- [ ] **Step 3: Separate coordinator membership from owner-equivalent helpers**

Update broad helpers so `organization_members.role = 'coordinator'` never satisfies owner-equivalent access by membership alone. Preserve owners/admins and explicitly documented legacy staff. Add assignment-aware coordinator policies only where foundation pages require them:

```sql
create policy "assigned coordinators read venues"
on public.venues for select to authenticated
using (private.has_venue_staff_permission(id, 'venue.view'));
```

Do not add coordinator policies to transactions, payouts, commissions, refunds, organization billing, tax, bank, or marketplace analytics tables.

- [ ] **Step 4: Block existing coordinator mutation RPCs until permission wrappers land**

For any existing booking/calendar/message RPC that currently authorizes through organization membership, replace coordinator membership acceptance with the exact permission helper. Foundation behavior is deny-by-default:

```sql
owner_or_admin_check
or private.has_venue_staff_permission(v_venue_id, 'booking.approve')
```

Use `booking.decline`, `calendar.manage`, or `message.send` for their exact mutations. If a downstream action cannot yet derive `venue_id` safely, deny coordinator use until its dedicated plan.

- [ ] **Step 5: Run RLS, migration, and regression tests**

Run:

```powershell
supabase db reset
supabase test db supabase/tests/event_coordinator_foundation.sql
pnpm test:rls
pnpm test:database
supabase db lint --level warning
```

Expected: coordinator cross-tenant and direct-RPC tests PASS; owner/admin/customer/supplier regression tests remain green; no new advisor warnings.

**Checkpoint:** Review every changed policy and function with a security-first diff. Confirm no policy trusts `organization_members` for coordinator venue access. Do not commit.

---

### Task 12: Foundation End-To-End Verification

**Files:**
- Create: `apps/web/e2e/coordinator-foundation.spec.ts`
- Modify only test fixtures/helpers already used by existing Playwright auth tests when required

**Interfaces:**
- Consumes: all Tasks 1-11.
- Produces: repeatable owner/invitation/coordinator browser evidence and a clean foundation handoff to later plans.

- [ ] **Step 1: Add Playwright scenarios**

Use safe development fixtures and test:

```text
Owner invites a new coordinator to one owned venue.
Owner cannot invite against another owner's venue.
Matching customer signs in, sees explicit role conversion, and accepts.
Wrong-email user cannot preview or accept the token.
Accepted token cannot be reused.
Coordinator sees only assigned venue navigation/data.
Read-only coordinator cannot mutate through UI or direct request.
Owner suspends access and the open coordinator session loses access after navigation.
Owner restores access and coordinator regains only assigned permissions.
Owner revokes access and direct route/RPC access remains denied.
Public partner application offers only Venue Owner and Supplier.
```

- [ ] **Step 2: Run focused unit and database suites**

Run:

```powershell
pnpm --filter @venora/web exec vitest run src/lib/rbac/coordinator-permissions.test.ts src/features/staff
supabase db reset
supabase test db supabase/tests/event_coordinator_foundation.sql
pnpm test:rls
pnpm test:database
```

Expected: all coordinator foundation unit, RLS, RPC, and database contract tests PASS.

- [ ] **Step 3: Run browser verification at all required widths**

Run the new Playwright spec in desktop Chromium, then use the in-app browser for 1440x900, 1024x768, and 390x844 screenshots of owner staff, invitation acceptance, active coordinator, read-only coordinator, unassigned, suspended, and revoked states.

Expected: no horizontal overflow, clipped dialogs, sticky blank overlays, inaccessible icon controls, or unexplained whitespace; hidden controls are also server-denied.

- [ ] **Step 4: Run final repository checks**

```powershell
pnpm --filter @venora/web type-check
pnpm --filter @venora/web build
git grep -n -E "^(<<<<<<<|=======|>>>>>>>)"
git diff --check
git status --short
git diff -- package.json pnpm-lock.yaml apps/web/package.json
```

Expected: no coordinator-related TypeScript/build errors, no conflict markers, clean diff check, and no dependency-file changes. If the known `MarketplaceLayout.tsx:33` baseline error remains, report it verbatim and do not misclassify it as a coordinator regression.

- [ ] **Step 5: Perform secret and authorization scans**

```powershell
rg -n "service_role|token_hash|rawToken|organization_members" apps/web/app apps/web/src/features/staff
rg -n "getOwnerDashboardContext|as any" "apps/web/app/(event-coordinator)" apps/web/src/features/staff
rg -n "venue_staff_(assignments|invitations)|has_venue_staff_permission" supabase/migrations supabase/tests
```

Expected: service credentials and token hashes remain server/database-only; coordinator routes do not use owner context; every assignment table access is authorized and typed.

**Checkpoint:** Produce a short foundation report with root cause, files changed, migration generated/used, permission presets, invitation behavior, role conversion behavior, RLS isolation, tests, type-check, build, browser widths, known baseline failure, and remaining downstream coordinator plans. Do not commit.

---

## Foundation Completion Gate

This plan is complete only when all of the following are true:

- Local Supabase resets from zero and the CLI-generated migration applies in order.
- Public coordinator applications are rejected in UI, schema, action, and crafted-request tests.
- Owners can invite only to their own venues and can manage assignment lifecycle through audited RPCs.
- Invitation hashes are private, raw tokens are never persisted, and acceptance is email-bound, expiring, and single-use.
- Customer role conversion is explicit; privileged role conversion is rejected.
- Coordinator access requires active venue assignment plus exact permission in both application helpers and RLS/RPCs.
- Existing organization membership no longer grants coordinators owner-equivalent venue or financial access.
- The coordinator shell has safe active, unassigned, suspended, and revoked states.
- Focused Vitest, pgTAP/RLS, database contract, and Playwright tests pass.
- Type-check/build have no new coordinator errors; any known baseline failure is reported separately.
- No package, lockfile, unrelated auth, middleware, or production database changes were made.

## Follow-On Plans

After this gate passes, write and execute separate plans in this order:

1. Coordinator assigned venues, booking list/detail, internal notes, and secure booking transitions.
2. Coordinator availability calendar and assigned-customer views.
3. Coordinator booking conversations and notification targeting.
4. Supplier coordination, booking tasks, and event timeline data/workflows.
5. Operational reports, audit views, responsive/accessibility polish, and complete cross-role browser/RLS verification.
