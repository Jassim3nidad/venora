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
    'supabase/migrations/20260717013034_fix_smart_search_venues.sql',
    'supabase/migrations/20260717031107_fix_coordinator_invitation_flow.sql',
    'supabase/migrations/20260717143000_ensure_organization_owner_membership.sql',
    'supabase/migrations/20260720063605_public_owner_profiles.sql'
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

  console.log("Reloading PostgREST schema cache...");
  await client.query("NOTIFY pgrst, 'reload schema';");
  await client.end();
}

run();
