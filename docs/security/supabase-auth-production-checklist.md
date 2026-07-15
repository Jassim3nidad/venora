# Supabase Auth Production Checklist

Use this checklist in the Supabase Dashboard before production release. Do not place credentials, tokens, or secret values in this file.

## Authentication

- Email confirmation is enabled for email/password signup.
- Production Site URL is the canonical Venora production origin.
- Redirect URLs are restricted to Venora production, approved preview domains, and required local development URLs only.
- Preview redirect policy is reviewed before public preview links are shared.
- Anonymous signup is disabled unless intentionally supported.
- Phone auth is disabled unless intentionally supported.
- OAuth providers use production callback URLs only.

## Password Security

- Supabase password minimum length is at least 12 characters.
- Character policy is reviewed against the application Zod policy.
- Leaked-password protection is enabled when the Supabase plan supports it.
- Reauthentication for password changes is enabled where available.
- Password reset links use the approved Venora callback URL.

## Bot Protection

- CAPTCHA provider is configured in Supabase Auth if available for the project.
- CAPTCHA secret is stored only in Supabase, never in browser-exposed variables.
- Registration CAPTCHA is tested.
- Login CAPTCHA policy is tested for suspicious or repeated failures.
- Password-reset CAPTCHA is tested.
- Resend-confirmation abuse behavior is reviewed.

## Rate Limits

- Signup rate limits are reviewed.
- Email-sent limits are reviewed.
- Verification and OTP limits are reviewed.
- Password recovery email limits are reviewed.
- Token refresh behavior and limits are reviewed.
- Anonymous-user limits are reviewed if anonymous auth is enabled.

## MFA

- TOTP is enabled before requiring MFA in application code.
- Admin MFA policy is defined and tested.
- Partner MFA recommendation is documented for venue owners and suppliers.
- AAL2 enforcement is tested in staging before any production admin lockout policy is enabled.
- MFA recovery and factor removal workflows require recent authentication.

## Sessions

- Session lifetime is reviewed.
- Inactivity timeout is reviewed.
- Single-session policy is reviewed if Venora wants stricter account controls.
- Refresh-token behavior is tested.
- Session revocation is tested after account suspension/deletion.
- JWT expiry is short enough for role/status changes to take effect promptly.

## Security

- Audit logs are reviewed after admin role changes, partner approvals, password resets, suspensions, and account deletion.
- JWT signing-key strategy is documented.
- Key rotation plan exists for Supabase anon/publishable and service-role keys.
- Service-role key is stored only in server/Edge Function secret storage.
- Custom SMTP is configured for production auth email reliability.
- Email templates are reviewed for safe Venora redirect links only.
- Data API exposure is reviewed for all new public-schema tables; exposed tables must have RLS enabled and policies reviewed.
