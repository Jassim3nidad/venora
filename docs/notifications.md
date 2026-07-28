# Notifications

Venora implements in-app notifications, preferences, Resend email, and Web Push
using VAPID. Booking, payment, review, admin, partner-application, and supplier
inquiry workflows create notifications. SMS is disabled/unsupported; Twilio
variables do not enable delivery.

## Pipeline

| Stage                 | Behavior                                          | Failure evidence / retry                                                          |
| --------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------- |
| Domain event          | RPC/trigger/action determines recipients and type | Audit/status history proves source event                                          |
| In-app record         | Notification is inserted for recipient            | Database error; rerun only an idempotent domain/helper path                       |
| Preference resolution | User channel/category preference is applied       | Missing preference should use implemented defaults, not broaden delivery          |
| Delivery record       | Channel attempt/status/error is recorded          | Inspect pending/failed/attempt count/timestamps                                   |
| Resend                | Server/Edge sends from verified `RESEND_FROM`     | Provider ID/error; retry after key/sender/domain correction                       |
| Web Push              | Active subscription receives VAPID-signed payload | Browser/provider status; expire invalid subscriptions and ask user to resubscribe |
| Inbox                 | Authenticated user reads/marks notifications      | RLS/session errors; do not query another recipient                                |

External delivery can fail after the in-app notification succeeds. Retry the
failed channel from delivery evidence; do not recreate the booking/payment event
or send duplicates blindly. Respect current preferences on retry.

## Configuration

Resend needs `RESEND_API_KEY` and an allowed `RESEND_FROM`. Web Push needs a
matching `VAPID_PUBLIC_KEY`, private key, and valid subject. The public key is
delivered to the browser, but the private key remains server-only. Rotating the
pair invalidates existing subscriptions.

Provider validation scripts can send mail or write test notification data and
therefore require dedicated test fixtures. They are not part of default unit
tests. See [environment variables](environment-variables.md).

Guest RSVP invitations use the `rsvp-notifications` Edge Function. Invitation
requests retain the signed-in customer's bearer token so guest ownership is
enforced by RLS. The production `RSVP reminders` workflow runs every six hours
and calls a secret-protected, capacity-bounded reminder batch. Configure
`RSVP_REMINDER_FUNCTION_URL`, `RSVP_REMINDER_ANON_KEY`, and
`RSVP_REMINDER_SECRET` as GitHub production-environment secrets, and configure
the same reminder secret plus Resend and application URL values in Supabase.
Reminder rows are claimed conditionally before sending to prevent duplicate
concurrent sends; failed sends clear the claim for a later retry.

## Troubleshooting

| Symptom                             | Confirm                                                        | Safe action                                                            |
| ----------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Email absent                        | In-app/delivery record, Resend key/from/domain, provider event | Correct config, retry one delivery, inspect spam/bounce                |
| Invalid sender                      | Resend response and verified domain                            | Use an authorized sender; do not spoof a domain                        |
| Push subscribe fails                | Browser permission, secure context, public key, service worker | Correct key/context; user must grant permission                        |
| Push delivery fails                 | Subscription endpoint, VAPID pair, provider status             | Remove expired subscription and resubscribe; do not expose private key |
| Notification exists but no delivery | Preferences and delivery row                                   | Queue/retry enabled channel once with idempotency                      |
| Duplicate delivery                  | Same notification/channel attempts and provider IDs            | Stop retries, mark duplicate evidence, correct claim logic             |
| Preference row missing              | User/category defaults in database/code                        | Restore through approved helper/migration, not broad direct send       |

Use the [Resend](runbooks/16-resend-delivery-failure.md) and
[Web Push](runbooks/17-web-push-delivery-failure.md) runbooks for incidents.
