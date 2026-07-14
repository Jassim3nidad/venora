# Server Actions

Inventory: 78 action entry points at commit `15e6173`: 72 file-level exported actions plus six route-local adapters. They are React/Next.js Server Actions, not stable public REST endpoints. Do not call guessed `/_next` URLs or add them to OpenAPI.

## Transport and common behavior

- Invoke from app code by importing the action or binding it to a server form.
- Next.js owns the HTTP transport, action identifiers, serialization, and origin checks.
- `createServerAction(schema, handler, input)` actions return `{data,error}` and map `VenoraError` subclasses.
- Auth/partner/calendar/route-local actions use module-specific `{success,error,data?,fieldErrors?}` shapes.
- User-scoped Supabase clients keep RLS active. Service-role use is limited to payment use cases called by booking actions.
- Unless noted, no explicit rate limit exists.
- Read actions are safe; upserts/state assignments are retry-tolerant where a unique key/state guard exists; toggles, inserts, message sends, and form creates are not generally idempotent.

## Authentication and profile (14)

| Action                          | Validation                                                       | Authorization                             | Data, side effects, result                                                              |
| ------------------------------- | ---------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------- |
| `registerAction`                | Name 2-120; email; password >=8 with letter+number; confirmation | Public                                    | Supabase sign-up and verification mail; generic action result                           |
| `loginAction`                   | Email; password non-empty; optional redirect                     | Public                                    | Supabase password login; reads `user_roles`, `profiles`; returns redirect/profile state |
| `resendVerificationEmailAction` | Email                                                            | Public                                    | Supabase verification resend                                                            |
| `signOutAction`                 | None                                                             | Session optional                          | Supabase sign-out                                                                       |
| `forgotPasswordAction`          | Email                                                            | Public                                    | Sends recovery email                                                                    |
| `resetPasswordAction`           | Strong password; confirmation match                              | Recovery session                          | Updates auth password                                                                   |
| `verifyOtpAction`               | Token hash and `signup\|email`                                   | One-time token                            | Verifies OTP/session                                                                    |
| `updateProfileAction`           | Name 2-120; optional PH mobile                                   | Session, own row                          | Updates `profiles`; revalidates account layout                                          |
| `updateAvatarAction`            | URL and non-empty storage path                                   | Session; path prefix must be current user | Updates `profiles.avatar_url`; removes replaced `avatars` object                        |
| `removeAvatarAction`            | None                                                             | Session                                   | Clears profile avatar; removes owned object                                             |
| `changePasswordAction`          | Old password; strong new password; confirmation                  | Session plus reauthentication             | Updates auth password                                                                   |
| `deleteAccountAction`           | Password twice; exact `DELETE MY ACCOUNT` phrase                 | Session plus reauthentication             | Irreversible account deletion workflow                                                  |
| `completeProfileSetupAction`    | Name/phone; booleans and preferred event types                   | Session                                   | Updates `profiles` preferences/completion timestamp; revalidates                        |
| `skipProfileSetupAction`        | None                                                             | Session                                   | Marks setup complete using current profile                                              |

## Booking, messaging, and calendar (10)

| Action                      | Validation                                                                 | Authorization                                                       | Data, side effects, result                                                                       |
| --------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `approveBookingAction`      | Booking UUID; positive total/deposit; deposit<=total; note<=1,000          | Venue organization member/owner or admin                            | `approve_booking_quote`; invoice/status notifications/cache; returns booking ID/status           |
| `declineBookingAction`      | UUID; reason 5-500                                                         | Venue organization member/owner or admin                            | `decline_booking_request`; notifications/cache                                                   |
| `cancelBookingAction`       | UUID; reason enum; detail<=500 and >=5 for `other`                         | Customer/org/admin through RPC                                      | `cancel_booking_request`; history/notifications/availability/cache                               |
| `startBookingPaymentAction` | UUID; provider enum                                                        | Session; booking customer through RPC                               | Starts/resumes checkout using service client for session attachment; returns checkout URL/status |
| `completeBookingAction`     | Booking UUID                                                               | Workflow RPC authorization/state                                    | `complete_booking_event`; review notification/cache                                              |
| `submitBookingReviewAction` | Booking/venue UUIDs; rating 1-5; optional category ratings; comment<=1,000 | Session; booking customer; eligible completed booking               | Inserts `reviews`; booking status/review stats/triggers; returns review ID                       |
| `getBookingMessages`        | Booking ID string                                                          | Session; RLS/access query                                           | Reads `booking_messages` and sender profiles; returns `[]` on denial/error                       |
| `sendBookingMessageAction`  | UUID; trimmed message 1-2,000                                              | Session; customer or venue-side booking participant; active booking | Inserts `booking_messages` and recipient `notifications`; revalidates conversation               |
| `updateAvailability`        | Venue UUID; `YYYY-MM-DD`; status enum; optional positive price/note<=500   | Venue access through RLS                                            | Refuses active-booking date; upserts `venue_availability`; revalidates calendar/marketplace      |
| `moveBookingDate`           | Booking UUID; `YYYY-MM-DD`                                                 | Venue access through RLS                                            | Checks active status, availability, conflicts; updates booking date and revalidates              |

## Venue marketplace and management (8)

| Action                          | Validation                                                                            | Authorization                                                        | Data, side effects, result                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `loadMoreVenuesAction`          | Page>=1; filters currently `z.any()`                                                  | Public; optional session enriches favorites                          | Reads venue search and `favorites`; returns 12 mapped venues and `hasMore`       |
| `toggleFavoriteAction`          | Venue UUID                                                                            | Session; cannot favorite own venue                                   | Inserts/deletes `favorites`; toggle is not idempotent                            |
| `createInquiryAction`           | Venue UUID; message 10-1,000                                                          | Session; cannot inquire own venue                                    | Inserts `inquiries`                                                              |
| `checkAvailabilityAction`       | Venue UUID; valid future date                                                         | Public/RLS-readable data                                             | Reads availability plus active bookings; returns availability and price override |
| `approveGeneratedContentAction` | Content UUID                                                                          | Session; venue org member/admin through RLS                          | Approves `ai_generated_content`; description approval also updates venue copy    |
| `rejectGeneratedContentAction`  | Content UUID                                                                          | Session; venue org member/admin through RLS                          | Marks AI content rejected                                                        |
| `updateVenueAction`             | Venue UUID; required name/address/city; positive price/capacity; optional description | Session; venue ownership through query/RLS                           | Geocodes address, updates `venues`                                               |
| `reviewVenueAction`             | UUID; action enum; action-specific optional/required reason                           | Admin permission mapped to `venues.review\|approve\|reject\|suspend` | `admin_review_venue`; audit/status/cache                                         |

## Supplier marketplace and dashboard (16)

| Action                               | Validation                                                                     | Authorization                                                           | Data, side effects, result                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `upsertSupplierProfileAction`        | Business 2-120; service areas 1-12; validated URLs/email/phone; numeric limits | Session; owns supplier profile                                          | Upserts `supplier_profiles`; revalidates supplier pages                                       |
| `upsertSupplierPackageAction`        | Optional UUID; name 2-120; nonnegative price; guest range; <=16 inclusions     | Session; owns supplier                                                  | Upserts `supplier_services`                                                                   |
| `archiveSupplierPackageAction`       | Package UUID                                                                   | Session; owns supplier                                                  | Sets owned service inactive                                                                   |
| `upsertSupplierPortfolioAction`      | Optional UUID; title 2-120; image URL; optional date/location; sort 0-999      | Session; owns supplier                                                  | Upserts `supplier_portfolio_items`                                                            |
| `createSupplierContactRequestAction` | Supplier/service/optional booking UUIDs; contact fields; message 10-1,500      | Session; validated eligible booking when supplied                       | Checks accreditation/availability; inserts `supplier_contact_requests`; notification triggers |
| `toggleSupplierFavoriteAction`       | Supplier UUID                                                                  | Session                                                                 | Inserts/deletes `supplier_favorites`; not idempotent                                          |
| `acceptSupplierQuoteAction`          | Quote UUID                                                                     | Customer participant                                                    | `respond_supplier_quote_customer(...,'accepted')`; quote/inquiry state and notifications      |
| `declineSupplierQuoteAction`         | Quote UUID                                                                     | Customer participant                                                    | Same RPC with `declined`                                                                      |
| `sendCustomerInquiryMessageAction`   | Inquiry UUID; message 1-2,000                                                  | Customer participant                                                    | Inserts `supplier_inquiry_messages`; notification trigger/cache                               |
| `upsertSupplierQuoteAction`          | Inquiry UUID; title; 1-40 items; numeric limits; optional date/terms           | Owning supplier/inquiry                                                 | `upsert_supplier_quote_dashboard`; deterministic totals in DB; returns quote ID               |
| `sendSupplierQuoteAction`            | Quote UUID                                                                     | Owning supplier; current status `draft`                                 | Atomic conditional update to `sent` with timestamp                                            |
| `withdrawSupplierQuoteAction`        | Quote UUID                                                                     | Owning supplier; current status `sent`                                  | Atomic conditional update to `withdrawn`                                                      |
| `sendSupplierInquiryMessageAction`   | Inquiry UUID; message 1-2,000                                                  | Owning supplier/inquiry                                                 | Inserts message; notification trigger/cache                                                   |
| `setSupplierAvailabilityAction`      | Date; `available\|unavailable\|blocked`; reason<=300                           | Supplier profile owner                                                  | Refuses confirmed-job date; upserts availability                                              |
| `clearSupplierAvailabilityAction`    | Date                                                                           | Supplier profile owner                                                  | Deletes owned availability override                                                           |
| `reviewSupplierAction`               | UUID; action enum; reason rules                                                | Admin permission mapped to `suppliers.review\|approve\|reject\|suspend` | `admin_review_supplier`; status/audit/cache                                                   |

Legacy supplier dashboard actions in `app/(supplier)/dashboard/supplier/actions.ts` are also independent entry points:

| Action                        | Validation                                                      | Authorization                                              | Side effect                        |
| ----------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------- |
| `addSupplierServiceAction`    | Name 2-120; description<=2,000; optional nonnegative price/unit | Session with supplier profile                              | Inserts `supplier_services`        |
| `deleteSupplierServiceAction` | Service UUID                                                    | Session with supplier profile; row constrained to supplier | Deletes service                    |
| `updateInquiryStatusAction`   | Booking-supplier UUID; `confirmed\|cancelled`                   | Session with supplier profile; row constrained to supplier | Updates `booking_suppliers.status` |

## Reviews (7)

| Action                     | Validation                             | Authorization                                      | Data, side effects, result                                                                |
| -------------------------- | -------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `attachReviewPhotosAction` | Review UUID; 1-5 path/URL records      | Review customer                                    | Enforces total photo cap 5; inserts `review_photos`; storage upload happens before action |
| `deleteReviewPhotoAction`  | Photo UUID                             | Review customer                                    | Removes `review-photos` object and DB row                                                 |
| `replyToReviewAction`      | Review UUID; reply 1-1,000             | Venue owner/coordinator/admin with venue ownership | Updates only owner reply fields; revalidates                                              |
| `flagReviewAction`         | Review UUID; reason enum; details<=500 | Session                                            | Inserts unique `review_flags`; review stays visible pending moderation                    |
| `toggleHelpfulVoteAction`  | Review UUID                            | Session; not own review                            | Inserts/deletes helpful vote; trigger updates count; not idempotent                       |
| `restoreReviewAction`      | Review UUID                            | Admin role                                         | Sets review published and writes admin audit                                              |
| `removeReviewAction`       | Review UUID                            | Admin role                                         | Sets review removed and writes admin audit                                                |

## Partner applications and verification (6)

| Action                                 | Validation                                                                                    | Authorization                                             | Data, side effects, result                                               |
| -------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------ |
| `submitPartnerApplicationAction`       | Role enum; category; structured address; >=1 document path                                    | Session                                                   | Inserts pending `partner_applications`; status trigger notifies admins   |
| `generateVerificationUploadUrlsAction` | Role string; 1-10 file descriptors; each 1 byte-20 MB; PDF/PNG/JPEG extension must match MIME | Session; no submitted pending/approved/denied application | Creates signed upload URLs under `{user}/{role}/{uuid.ext}`              |
| `finalizeVerificationUploadAction`     | Owned paths array                                                                             | Session; path prefix current user                         | Lists uploaded objects; rechecks size/MIME; removes invalid object       |
| `getVerificationDocumentUrlAction`     | Storage path                                                                                  | Session; own path or admin                                | `is_admin`; creates 10-minute signed private URL                         |
| `approveApplicationAction`             | Application UUID string expected by DB                                                        | Admin                                                     | `admin_approve_partner_application`; assigns role/status and revalidates |
| `denyApplicationAction`                | Application UUID; trimmed reason                                                              | Admin                                                     | `admin_deny_partner_application`; status/reason/notification/cache       |

## Administrator configuration and monitoring (8)

| Action                        | Validation                                                                                     | Permission                            | RPC/side effects                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------- |
| `assignAdminTierAction`       | User UUID; tier enum; reason<=500                                                              | `admin_roles.manage`                  | `admin_assign_tier`; audit/cache; DB prevents unsafe last-super-admin changes |
| `updateAiConfigurationAction` | Feature/provider/model; token/timeout/temp and usage limits within schema bounds               | `ai_config.manage`                    | `admin_upsert_ai_configuration`; audit/cache                                  |
| `createCommissionRuleAction`  | Scope; required reference for non-global; percentage 0-100 and/or flat fee; date range         | `commissions.manage`                  | `admin_create_commission_rule`; audit/cache                                   |
| `updateCommissionRuleAction`  | UUID; active flag; required reason; commission/date fields                                     | `commissions.override`                | `admin_update_commission_rule`; audit/cache                                   |
| `createMarketplaceFlagAction` | Entity/type/severity enums; UUID; notes<=1,000                                                 | `marketplace.moderate`                | `admin_create_marketplace_flag`; audit/cache                                  |
| `updateMarketplaceFlagAction` | UUID; optional state/assignee/notes/reason                                                     | `marketplace.moderate`                | `admin_update_marketplace_flag`; audit/cache                                  |
| `updateSystemSettingAction`   | Allowed key; typed scalar/string-array; reason<=500; action validates value against definition | `system_settings.manage`              | `admin_update_system_setting`; audit/cache                                    |
| `setAccountStatusAction`      | User UUID; `suspend\|reactivate`; reason<=1,000                                                | `users.suspend` or `users.reactivate` | `admin_set_account_status`; self/last-super-admin guards; audit/cache         |

## Route-local adapters (6)

These functions contain their own `"use server"` directive and are bound to page forms. They are counted separately because Next.js emits action entry points for them.

| Adapter              | Location                           | Contract                                                                                               |
| -------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `submitFlagStatus`   | `/admin/marketplace` page          | `{id,action,reason?}` mapped into `updateMarketplaceFlagAction`                                        |
| `submitReview`       | `/admin/suppliers/{id}` page       | `{id,action,reason?}` delegated to `reviewSupplierAction`                                              |
| `submitStatusChange` | `/admin/users/{id}` page           | `{id,action,reason?}` delegated to `setAccountStatusAction`                                            |
| `submitReview`       | `/admin/venues/{id}` page          | `{id,action,reason?}` delegated to `reviewVenueAction`                                                 |
| `createVenueAction`  | `/dashboard/venues/new` page       | `FormData`; manually parses venue, packages, amenities, media; inserts venue workflow and revalidates  |
| `updateVenueAction`  | `/dashboard/venues/{id}/edit` page | `FormData`; manually parses editable venue, amenities, packages; updates owned records and revalidates |

## Errors and examples

Wrapped action example:

```ts
const result = await approveBookingAction({
  bookingId: "00000000-0000-4000-8000-000000000001",
  totalAmount: 100000,
  depositAmount: 30000,
  note: "Deposit due within 48 hours",
});

if (result.error) {
  console.error(result.error.code, result.error.message);
}
```

Common failures: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, workflow/state validation, RLS denial, and `INTERNAL_ERROR`. See [error handling](error-handling.md).

## Security and retry notes

- Treat every action argument as attacker-controlled even when invoked from a trusted component.
- Keep auth/ownership checks and RLS; UI visibility is not authorization.
- Do not expose signed upload URLs or private verification paths to other users.
- Avoid automatic retry for toggles, inquiry/message inserts, application submission, and route-local venue create.
- Conditional state transitions and unique-key upserts are retry-safe only when the documented precondition still holds.
