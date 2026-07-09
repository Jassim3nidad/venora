import dotenv from 'dotenv';
dotenv.config({ path: 'apps/web/.env.local' });
console.log('Validating environment variables for Notification Platform...');

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY',
  'RESEND_FROM',
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'VAPID_SUBJECT'
];

let hasErrors = false;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar] || process.env[envVar].trim() === '') {
    console.error(`❌ Missing or empty required environment variable: ${envVar}`);
    hasErrors = true;
  }
}

// Special check for SMS
const smsVars = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'];
let hasTwilio = false;
for (const smsVar of smsVars) {
  if (process.env[smsVar]) {
    hasTwilio = true;
  }
}

if (hasTwilio) {
  console.log('⚠️ Twilio variables are present, but SMS should remain disabled.');
} else {
  console.log('✅ SMS is disabled (No Twilio configuration).');
}

if (hasErrors) {
  console.error('\nEnvironment validation failed. Please check your .env file.');
  console.error('Suggested fix: Ensure all required variables are populated without exposing secrets.');
  process.exit(1);
}

console.log('✅ Environment validation passed.\n');
