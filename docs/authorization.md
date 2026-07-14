# Authorization

Venora has multiple independent authorization facts:

1. **Authentication:** Supabase identity/session.
2. **Application role:** `user_roles` such as customer or venue owner.
3. **Approval/account status:** profile or partner application state.
4. **Admin role tier:** assignment in admin access-control tables.
5. **Admin permission:** capability resolved through admin role permissions.
6. **RLS/Storage policy:** final database/object authorization.

Passing an earlier layer does not bypass a later one.

## Role matrix

| Capability                          | Visitor | Customer | Venue owner        | Supplier             | Coordinator      | Administrator              |
| ----------------------------------- | ------- | -------- | ------------------ | -------------------- | ---------------- | -------------------------- |
| Browse public marketplace           | Yes     | Yes      | Yes                | Yes                  | Yes              | Yes                        |
| Manage own profile                  | No      | Own      | Own                | Own                  | Own              | Own                        |
| Create/manage customer bookings     | No      | Own      | No                 | No                   | Partial          | By scoped admin permission |
| Manage venues/packages/availability | No      | No       | Owned organization | No                   | Partial          | Scoped moderation          |
| View supplier inquiry marketplace   | No      | No       | No                 | Eligible snapshots   | Partial          | Scoped oversight           |
| Submit supplier quote/message       | No      | No       | No                 | Own eligible inquiry | Partial          | No general impersonation   |
| Access admin routes                 | No      | No       | No                 | No                   | No               | Assigned admin only        |
| Read private verification documents | No      | No       | Own allowed flow   | Own allowed flow     | Own allowed flow | Explicit permission only   |

“Partial” means implemented surfaces are incomplete and must be confirmed against
the [design inventory](design/README.md). Ownership, eligibility, status, and RLS
still constrain every “Yes.”

## Admin tiers

Admin access uses `admin_user_roles`, admin roles, role-permission mappings, and
the `has_admin_permission()` database function. Examples include analytics,
finance/commission, moderation, and super-admin capabilities. A generic `admin`
application role is insufficient for permission-specific actions. Exact
permission identifiers are authoritative in migrations and server guards.

| Admin tier concept | Expected boundary                                                     |
| ------------------ | --------------------------------------------------------------------- |
| Analyst            | Read analytics/reporting allowed by assigned permissions              |
| Finance            | Payment, commission, refund, or export operations explicitly assigned |
| Super admin        | Broad administration, still logged and subject to explicit checks     |

Do not infer a stable named tier from UI labels alone; resolve actual assignments
and permissions on the server.

## Enforcement pattern

Use server-side user resolution, `requireRole()`/`hasRole()` for coarse role
checks, `requirePermission()` for admin capabilities, ownership/status checks
for the resource, and RLS for the query. Privileged service-role operations must
perform equivalent checks before bypassing RLS and must write audit evidence.

Security-definer functions require explicit execute grants. Revoking only from
`PUBLIC` is insufficient where `anon` or `authenticated` has a direct grant;
migrations 047 and 065 contain relevant hardening.

Hidden navigation, disabled buttons, middleware/proxy redirects, and Client
Component checks improve UX but are not security boundaries. Cross-account,
negative RLS, and admin-tier behavior remain areas requiring authenticated
runtime verification.
