import dotenv from 'dotenv';
dotenv.config({ path: 'apps/web/.env.local' });

console.log('Validating Resend Email Provider...');

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM;
const testEmail = process.env.NOTIFICATION_TEST_EMAIL;

if (!apiKey || !fromEmail || !testEmail) {
  console.error('❌ Missing RESEND_API_KEY, RESEND_FROM, or NOTIFICATION_TEST_EMAIL.');
  console.error('Skipping Resend validation. Set NOTIFICATION_TEST_EMAIL to fully test.');
  process.exit(1);
}

try {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: fromEmail,
      to: testEmail,
      subject: 'Notification Platform Validation Test',
      html: '<p>Automated validation test passed.</p>'
    })
  });

  const data = await response.json();

  if (response.ok) {
    console.log('✅ Resend validation passed. Test email queued successfully.');
    console.log(`   Response ID: ${data.id}`);
  } else {
    console.error(`❌ Resend validation failed: ${data.message || 'Unknown error'}`);
    console.error('   Suggested fix: Check if the RESEND_FROM domain is verified in your Resend dashboard.');
    console.error('   Command to rerun: pnpm test:notifications:providers');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Resend validation failed to connect to API:', error.message);
  process.exit(1);
}

console.log('\n');
