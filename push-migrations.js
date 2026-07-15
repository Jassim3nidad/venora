const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  const client = new Client({
    connectionString: "postgresql://postgres:startuplab2905@db.szmjjkywcsnzkgqevinz.supabase.co:5432/postgres",
  });
  await client.connect();
  console.log("Connected to database.");

  const files = [
    'supabase/migrations/072_harden_public_auth_role_assignment.sql',
    'supabase/migrations/073_lock_ai_to_openrouter_hy3.sql',
    'supabase/migrations/076_admin_disputes.sql'
  ];

  for (const f of files) {
    const fullPath = path.join(__dirname, f);
    const sql = fs.readFileSync(fullPath, 'utf8');
    try {
      await client.query(sql);
      console.log(`Successfully executed ${f}`);
    } catch (e) {
      console.error(`Failed to execute ${f}:`, e.message);
    }
  }

  await client.end();
}

run();
