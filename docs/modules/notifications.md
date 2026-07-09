# Notifications

## Folder structure

- `apps/web/src/features/notifications/schemas`: Zod input validation.
- `apps/web/src/features/notifications/types`: UI/API types.
- `apps/web/src/features/notifications/hooks`: TanStack Query and Supabase Realtime hooks.
- `apps/web/src/features/notifications/ui`: Bell, inbox, and settings UI.
- `apps/web/app/api/notifications`: inbox, read state, and push subscription API routes.
- `apps/web/app/api/notification-preferences`: notification preference API route.
- `supabase/migrations/033_notifications_platform.sql`: database schema, RLS, helper functions, and workflow triggers.
- `supabase/functions/booking-notifications`: delivery dispatcher for email, push, and in-app status.

## Database schema

- `notifications`: canonical user-facing notification event. Added `kind`, `priority`, `metadata`, `read_at`, `expires_at`, `dedupe_key`, and `actor_id`.
- `notification_preferences`: per-user channel and category preferences.
- `notification_deliveries`: delivery queue and audit trail by channel. SMS rows are skipped while SMS is disabled.
- `push_subscriptions`: Web Push subscriptions per user device.
- Enums: `notification_kind`, `notification_priority`, `notification_delivery_status`.

## API design

- `GET /api/notifications`: list notifications with `limit`, `read`, and `kind` filters.
- `POST /api/notifications/:id/read`: mark one notification read through RPC.
- `POST /api/notifications/read-all`: mark all notifications read through RPC.
- `GET /api/notification-preferences`: fetch or create current user's preferences.
- `PATCH /api/notification-preferences`: update current user's preferences.
- `GET /api/notifications/push-public-key`: expose the public VAPID key for browser subscription.
- `POST /api/notifications/push-subscriptions`: register current browser push subscription.
- `DELETE /api/notifications/push-subscriptions`: disable current browser push subscription.

## Notification types

- Booking updates: inquiry, approval, cancellation, completion, expiry.
- Payment updates: pending, paid, failed, refunded.
- Review requests: post-event review prompts and submitted-review alerts.
- Admin alerts: verification review and flagged review moderation.
- Realtime notifications: Supabase Realtime listens to `public.notifications` for authenticated users.

## Security

- Users can only select their own notifications, preferences, deliveries, and push subscriptions.
- Notification writes happen through `SECURITY DEFINER` helper functions and workflow triggers.
- Read mutations use RPC functions instead of direct client table updates.
- Delivery dispatch uses the Supabase service role inside the Edge Function.
- Push endpoints are unique per user and are disabled when providers return expired subscription errors.

## Delivery providers

- Email: Resend (`RESEND_API_KEY`, `RESEND_FROM`). `RESEND_FROM` must be a verified sender; otherwise the email delivery is marked `failed` and other channels continue.
- Push: Web Push VAPID (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`). The web app reads the public key through `/api/notifications/push-public-key`.
- SMS: disabled for this phase. No Twilio variables are required.

## Webhook and retry

- `notification_deliveries_dispatch_webhook` is an INSERT-only database trigger backed by `pg_net`.
- Webhook URL/auth are stored in locked `notification_webhook_config` rows, with RLS enabled and no anon/authenticated table grants.
- The trigger only fires for `queued` non-SMS rows, so Edge Function status updates cannot loop.
- Failed non-SMS deliveries can be retried by invoking `booking-notifications` with an empty body or by calling `retry_failed_notification_deliveries()`.
- SMS deliveries are marked `skipped` with provider `sms-disabled`.

## Production validation

- Resend: verify `venora.ph` in Resend or set `RESEND_FROM` to another verified sender.
- Web Push: sign in with a real browser, open `/settings`, click Enable device push, allow browser permission, and confirm a row is created in `push_subscriptions`.

## Responsive behavior

- Desktop users get a bell dropdown in marketplace and enterprise nav.
- Mobile users can open notification center from profile/menu navigation.
- Notification center uses compact filters and stacked notification rows on small screens.
- Settings use two-column toggle grids on tablet/desktop and single-column rows on mobile.

## Scalability

- `notification_deliveries` decouples event creation from provider delivery.
- `dedupe_key` prevents repeated workflow notifications per user and state.
- Provider failures are stored per delivery for retries and admin inspection.
- New notification kinds or providers can be added without changing booking/payment workflows.
