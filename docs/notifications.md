# Notifications

Venora implements in-app notifications, preferences, SMTP email, and Web Push
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
| SMTP                  | Supabase Edge sends from verified `SMTP_FROM`     | Provider ID/error; retry after credential/sender correction                       |
| Web Push              | Active subscription receives VAPID-signed payload | Browser/provider status; expire invalid subscriptions and ask user to resubscribe |
| Inbox                 | Authenticated user reads/marks notifications      | RLS/session errors; do not query another recipient                                |

External delivery can fail after the in-app notification succeeds. Retry the
failed channel from delivery evidence; do not recreate the booking/payment event
or send duplicates blindly. Respect current preferences on retry.

## Configuration

Production email requires `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASS`, and `SMTP_FROM`. Use secure SMTP port 465 and the same verified
sender identity configured for Supabase Auth custom SMTP. Hosted Edge Functions
block outbound ports 25 and 587. Booking and RSVP emails have no secondary
provider fallback. Auth emails (verification, recovery, and invitations)
continue to use Supabase Auth SMTP. Web Push needs a
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
the same reminder secret plus SMTP and application URL values in Supabase.

When a booking changes to `approved`, the database notification trigger queues
the customer's email delivery. The Edge Function renders a branded Venora
approval message with venue, event, guest, amount, deposit, and booking-reference
details plus a payment call to action. The delivery record stores provider,
attempt, failure, and sent evidence; retry remains idempotent through the
notification dedupe key and unique channel constraint.
Reminder rows are claimed conditionally before sending to prevent duplicate
concurrent sends; failed sends clear the claim for a later retry.

## Troubleshooting

| Symptom                             | Confirm                                                        | Safe action                                                            |
| ----------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Email absent                        | In-app/delivery record, SMTP credentials/from, provider event  | Correct config, retry one delivery, inspect spam/bounce                |
| Invalid sender                      | SMTP response and verified sender                              | Use an authorized sender; do not spoof a domain                        |
| Push subscribe fails                | Browser permission, secure context, public key, service worker | Correct key/context; user must grant permission                        |
| Push delivery fails                 | Subscription endpoint, VAPID pair, provider status             | Remove expired subscription and resubscribe; do not expose private key |
| Notification exists but no delivery | Preferences and delivery row                                   | Queue/retry enabled channel once with idempotency                      |
| Duplicate delivery                  | Same notification/channel attempts and provider IDs            | Stop retries, mark duplicate evidence, correct claim logic             |
| Preference row missing              | User/category defaults in database/code                        | Restore through approved helper/migration, not broad direct send       |

Use the email delivery and
[Web Push](runbooks/17-web-push-delivery-failure.md) runbooks for incidents.
