import dotenv from "dotenv";

dotenv.config({ path: "apps/web/.env.local" });

console.log("Validating environment variables for Notification Platform...");

const requiredEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RESEND_API_KEY",
  "RESEND_FROM",
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
