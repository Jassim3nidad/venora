import dotenv from "dotenv";

dotenv.config({ path: "apps/web/.env.local" });

console.log("Validating environment variables for Notification Platform...");

const requiredEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
];

let hasErrors = false;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar] || process.env[envVar].trim() === "") {
    console.error(
      `ERROR: Missing or empty required environment variable: ${envVar}`,
    );
    hasErrors = true;
  }
}

if (!["465", "2465"].includes(process.env.SMTP_PORT?.trim())) {
  console.error(
    "ERROR: SMTP_PORT must use an implicit TLS port supported by hosted Edge (465 or 2465).",
  );
  hasErrors = true;
}

const publicSupabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (publicSupabaseKey?.startsWith("sb_secret_")) {
  console.error(
    "ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY contains a Supabase secret key. Use a public anon or publishable key only.",
  );
  hasErrors = true;
}

if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "ERROR: NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY must not be defined. Service-role keys are server-only.",
  );
  hasErrors = true;
}

if (process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY) {
  console.error(
    "ERROR: NEXT_PUBLIC_SUPABASE_SECRET_KEY must not be defined. Supabase secret keys are server-only.",
  );
  hasErrors = true;
}

// Special check for SMS
const smsVars = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_PHONE_NUMBER",
];
let hasTwilio = false;

for (const smsVar of smsVars) {
  if (process.env[smsVar]) {
    hasTwilio = true;
  }
}

if (hasTwilio) {
  console.log(
    "WARNING: Twilio variables are present, but SMS should remain disabled.",
  );
} else {
  console.log("OK: SMS is disabled (No Twilio configuration).");
}

// Payout account encryption. Not in requiredEnvVars: an environment that
// never touches the earnings pages runs fine without it. But a malformed
// key must fail loudly here rather than at the moment someone submits a
// bank account, and an under-length key silently weakens AES-256.
const payoutKey = process.env.PAYOUT_ENCRYPTION_KEY?.trim();

if (!payoutKey) {
  console.log(
    "WARNING: PAYOUT_ENCRYPTION_KEY is not set. Payout accounts and withdrawals will be unavailable.",
  );
} else if (Buffer.from(payoutKey, "base64").length !== 32) {
  console.error(
    "ERROR: PAYOUT_ENCRYPTION_KEY must decode to exactly 32 bytes. Generate one with: openssl rand -base64 32",
  );
  hasErrors = true;
} else {
  console.log("OK: PAYOUT_ENCRYPTION_KEY is a valid 32-byte key.");
}

if (
  process.env.PAYMONGO_DISBURSEMENTS_ENABLED === "true" &&
  !process.env.PAYMONGO_SECRET_KEY?.trim()
) {
  console.error(
    "ERROR: PAYMONGO_DISBURSEMENTS_ENABLED is true but PAYMONGO_SECRET_KEY is missing.",
  );
  hasErrors = true;
}

if (hasErrors) {
  console.error(
    "\nEnvironment validation failed. Please check your .env file.",
  );
  console.error(
    "Suggested fix: ensure all required variables are populated without exposing secrets.",
  );
  process.exit(1);
}

console.log("OK: Environment validation passed.\n");
