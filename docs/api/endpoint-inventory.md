# Generated API Inventory

Rescan with `pnpm docs:generate` and `pnpm docs:validate`. Those commands check
every `app/**/route.ts` export and `supabase/functions/*/index.ts` directory
against OpenAPI. Human-readable examples for all 31 operations live in
[API Specification](specification.md).

## Coverage summary

| Surface                                | Implemented |                Documented | Undocumented |
| -------------------------------------- | ----------: | ------------------------: | -----------: |
| Next.js Route Handler files            |          21 |                        21 |            0 |
| Next.js Route Handler operations       |          24 |                        24 |            0 |
| Supabase Edge Functions                |           7 |                         7 |            0 |
| HTTP operations in OpenAPI             |          31 |                        31 |            0 |
| Server Action entry points             |          78 | 78 in `server-actions.md` |            0 |
| Final `public` database function names |          94 |   94 in `supabase-rpc.md` |            0 |
| Storage buckets                        |           4 |         4 in `storage.md` |            0 |
| Payment webhooks                       |           2 |        2 in `webhooks.md` |            0 |

“Documented” means source-backed contract recorded. It does not mean production deployment, live grants, provider configuration, or authenticated runtime behavior was verified.

## Next.js operations

| Operation                                      | Source                                                       | OpenAPI                         | Detailed guide                      |
| ---------------------------------------------- | ------------------------------------------------------------ | ------------------------------- | ----------------------------------- |
| `GET /api/admin/reports/export`                | `apps/web/app/api/admin/reports/export/route.ts`             | Documented                      | [Specification](specification.md)   |
| `GET /api/analytics/venue-owner/export`        | `apps/web/app/api/analytics/venue-owner/export/route.ts`     | Documented                      | [Specification](specification.md)   |
| `GET /api/bookings`                            | `apps/web/app/api/bookings/route.ts`                         | Documented                      | [Specification](specification.md)   |
| `POST /api/bookings`                           | same                                                         | Documented                      | [Specification](specification.md)   |
| `POST /api/bookings/{id}/payment`              | `apps/web/app/api/bookings/[id]/payment/route.ts`            | Documented                      | [Specification](specification.md)   |
| `POST /api/bookings/{id}/refund`               | `apps/web/app/api/bookings/[id]/refund/route.ts`             | Documented                      | [Specification](specification.md)   |
| `PATCH /api/bookings/{id}/status`              | `apps/web/app/api/bookings/[id]/status/route.ts`             | Documented                      | [Specification](specification.md)   |
| `GET /api/debug`                               | `apps/web/app/api/debug/route.ts`                            | Documented, disabled with `404` | [Specification](specification.md)   |
| `GET /api/notification-preferences`            | `apps/web/app/api/notification-preferences/route.ts`         | Documented                      | [Specification](specification.md)   |
| `PATCH /api/notification-preferences`          | same                                                         | Documented                      | [Specification](specification.md)   |
| `GET /api/notifications`                       | `apps/web/app/api/notifications/route.ts`                    | Documented                      | [Specification](specification.md)   |
| `POST /api/notifications/{id}/read`            | `apps/web/app/api/notifications/[id]/read/route.ts`          | Documented                      | [Specification](specification.md)   |
| `GET /api/notifications/push-public-key`       | `apps/web/app/api/notifications/push-public-key/route.ts`    | Documented                      | [Specification](specification.md)   |
| `POST /api/notifications/push-subscriptions`   | `apps/web/app/api/notifications/push-subscriptions/route.ts` | Documented                      | [Specification](specification.md)   |
| `DELETE /api/notifications/push-subscriptions` | same                                                         | Documented                      | [Specification](specification.md)   |
| `POST /api/notifications/read-all`             | `apps/web/app/api/notifications/read-all/route.ts`           | Documented                      | [Specification](specification.md)   |
| `GET /api/suppliers`                           | `apps/web/app/api/suppliers/route.ts`                        | Documented                      | [Specification](specification.md)   |
| `GET /api/suppliers/{id}`                      | `apps/web/app/api/suppliers/[id]/route.ts`                   | Documented                      | [Specification](specification.md)   |
| `POST /api/suppliers/{id}/contact`             | `apps/web/app/api/suppliers/[id]/contact/route.ts`           | Documented                      | [Specification](specification.md)   |
| `POST /api/venues`                             | `apps/web/app/api/venues/route.ts`                           | Documented                      | [Specification](specification.md)   |
| `POST /api/webhooks/paymongo`                  | `apps/web/app/api/webhooks/paymongo/route.ts`                | Documented                      | [Webhooks](webhooks.md)             |
| `GET /auth/callback`                           | `apps/web/app/auth/callback/route.ts`                        | Documented                      | [Authentication](authentication.md) |
| `GET /logout`                                  | `apps/web/app/logout/route.ts`                               | Documented                      | [Authentication](authentication.md) |

## Supabase Edge Functions

| Operation                     | Source                                              | Auth model                                 | Status     |
| ----------------------------- | --------------------------------------------------- | ------------------------------------------ | ---------- |
| `POST /ai-assistant`          | `supabase/functions/ai-assistant/index.ts`          | Optional bearer; anonymous session allowed | Documented |
| `POST /ai-cost-estimator`     | `supabase/functions/ai-cost-estimator/index.ts`     | Optional bearer                            | Documented |
| `POST /ai-package-comparison` | `supabase/functions/ai-package-comparison/index.ts` | Optional bearer                            | Documented |
| `POST /ai-recommendation`     | `supabase/functions/ai-recommendation/index.ts`     | Bearer required                            | Documented |
| `POST /ai-search`             | `supabase/functions/ai-search/index.ts`             | Optional bearer                            | Documented |
| `POST /ai-venue-description`  | `supabase/functions/ai-venue-description/index.ts`  | Bearer plus org/admin authorization        | Documented |
| `POST /booking-notifications` | `supabase/functions/booking-notifications/index.ts` | Exact service-role bearer required         | Documented |

## Non-HTTP inventories

- All 78 Server Action entry points are named and grouped in [server-actions.md](server-actions.md). Count includes six route-local form adapters.
- All 94 final database function names are classified in [supabase-rpc.md](supabase-rpc.md): 33 application/authenticated, 15 service-role, 8 RLS helpers, 10 internal helpers, and 28 triggers.
- Storage inventory is in [storage.md](storage.md): `venue-images`, `avatars`, `verification-docs`, and `review-photos`.

## Confirmed missing/not implemented surfaces

These are requirements or advertised options without a confirmed usable API. They are not counted as undocumented implemented APIs:

- No Next.js `GET /api/venues` list/detail Route Handler. Venue discovery uses Server Components/actions, Supabase queries, and `ai-search`.
- No public REST review CRUD endpoints. Review mutations are Server Actions.
- No standalone REST admin CRUD beyond report export. Admin mutations are Server Actions/RPCs.
- No usable Maya or Stripe checkout gateway. Only PayMongo registers when configured.
- No direct invoice/receipt download Route Handler was found; records are created/read through database-backed UI flows.
- No generic file-upload Route Handler. Uploads use Supabase Storage SDK/signed URLs.
- No application-level Next.js rate-limit middleware or per-route limiter was found.

## Documentation gaps

- Live Supabase grants, RLS policies, buckets, Edge deployment flags, and function environment values were not queried.
- Runtime response examples for authenticated routes were not captured because no test credentials were supplied.
- Complex supplier and AI result objects can evolve with database selects; OpenAPI captures current mapped fields but TypeScript does not enforce every database response at runtime.
- `/api/debug` is documented because the compatibility route exists, but it is disabled and always returns an empty `404`.
