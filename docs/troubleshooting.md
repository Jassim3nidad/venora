# Troubleshooting

Start with the exact command, environment, commit, timestamp, request/event ID,
and redacted error. Never paste secrets or production personal data. Use the
linked runbook when impact is active or data/security may be affected.

| Symptom                                     | Likely cause / confirm                                              | Safe fix / escalate                                                                                               |
| ------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Dependency install fails                    | Node/pnpm version, registry, lockfile, workspace state              | Use Node 20+, pnpm 9, `pnpm install --frozen-lockfile`; escalate lockfile corruption                              |
| Unsupported Node                            | `node --version` is below engine range                              | Switch to supported Node; do not remove engine constraint                                                         |
| Lockfile mismatch                           | Frozen install names package manifest drift                         | Recreate lock only for intentional dependency change and review full diff                                         |
| Missing env                                 | Validator or runtime names absent variable                          | Copy safe example and set correct scope; never invent/publicize a secret                                          |
| Supabase connection fails                   | URL/key project mismatch, Docker/network, expired key               | Confirm environment/project; restart local stack or rotate authorized key                                         |
| Database type mismatch                      | Generated file predates migration                                   | Rehearse full local history, then `pnpm db:types`; see [runbook 04](runbooks/04-stale-database-types.md)          |
| Migration fails                             | SQL/order/grant/duplicate `068`/drift                               | Stop and preserve evidence; use [runbook 03](runbooks/03-supabase-migration-failure.md)                           |
| RLS denial                                  | Wrong session, tenant, status, policy, grant                        | Reproduce as exact role; fix policy via reviewed migration; [runbook 06](runbooks/06-unexpected-rls-denial.md)    |
| Storage upload denied                       | Bucket/path/owner/MIME/size/policy mismatch                         | Correct scoped path or policy; [runbook 18](runbooks/18-storage-upload-denial.md)                                 |
| Auth redirect loops/wrong host              | App URL, Supabase allow-list, callback cookie                       | Correct per-environment origins; [runbook 20](runbooks/20-auth-callback-failure.md)                               |
| Localhost return URL in production          | `NEXT_PUBLIC_APP_URL` or server origin wrong at build/runtime       | Correct production variable and redeploy; [runbook 09](runbooks/09-paymongo-return-url.md)                        |
| PayMongo webhook fails                      | Wrong secret, raw-body/signature, endpoint, event data              | Check redacted event/endpoint then [runbook 10](runbooks/10-paymongo-webhook-signature.md)                        |
| Resend error                                | Missing key, unverified sender/domain, provider rejection           | Correct authorized sender/key and retry once; [runbook 16](runbooks/16-resend-delivery-failure.md)                |
| Web Push error                              | Permission, secure context, stale subscription, VAPID mismatch      | Resubscribe after config correction; [runbook 17](runbooks/17-web-push-delivery-failure.md)                       |
| Google Maps fails                           | Feature is not implemented; app uses MapLibre/OpenFreeMap/Nominatim | Diagnose map provider/network and remove invalid Google-key assumption                                            |
| OpenAI/Anthropic error                      | OpenAI key/config/provider error; direct Anthropic is missing       | Inspect AI config/usage; use supported provider, never add key client-side                                        |
| Build fails                                 | Env, TypeScript, bundling, route/render issue                       | Reproduce `pnpm build`; [runbook 26](runbooks/26-production-build-failure.md)                                     |
| Type-check fails                            | Contract/import/generated type drift                                | Fix smallest source/schema mismatch; validate full type-check                                                     |
| Lint fails                                  | ESLint rule violation                                               | Fix source; do not disable the rule or blanket-ignore                                                             |
| Tests fail                                  | Behavior regression, timing, fixture, dependency                    | Run focused test then suite; [runbook 25](runbooks/25-test-suite-failure.md)                                      |
| OpenAPI warning/failure                     | Contract inventory or Redocly semantics drift                       | Generate and validate; seven baseline warnings are known; [runbook 24](runbooks/24-openapi-validation-failure.md) |
| Mermaid validation fails                    | Unbalanced fence, invalid directive/edge syntax                     | Reduce to supported Mermaid syntax and rerun technical validator                                                  |
| Vercel deployment mismatch                  | External Git integration/branch/cache/config wrong                  | Compare source SHA and logs; [runbook 02](runbooks/02-unexpected-production-commit.md)                            |
| Missing route                               | Stale link/inventory or incomplete custom 404/error experience      | Check route inventory and App Router tree; escalate product gap                                                   |
| Dead navigation                             | UI control lacks target (desktop Help is a known example)           | Link to existing route in a separate UI fix; document until verified                                              |
| Empty analytics                             | Correctly empty scope, RLS denial, filter, stale aggregation        | Confirm authorized raw scope and filters; [runbook 23](runbooks/23-analytics-export-failure.md)                   |
| Unauthorized export                         | Missing role/admin permission or RLS                                | Do not bypass; obtain approved permission or fix server guard                                                     |
| Supplier data looks actionable unexpectedly | Fallback inventory resembles production                             | Stop relying on fallback and label/block action; known product risk                                               |
| Venue card opens different venue            | Card identity/slug fallback mismatch                                | Capture card/URL/source evidence; do not edit data blindly                                                        |
| Venue count is negative                     | “more venues” arithmetic can produce `-1`                           | Treat display as known bug; use actual result count and escalate UI fix                                           |

Cross-account exposure, payments, production incidents, rollback, and secret
events need the focused [operational runbooks](runbooks/README.md), not ad hoc
database edits.
