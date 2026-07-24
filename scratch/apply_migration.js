const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });
  await client.connect();
  const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20260724000000_fix_partner_application_notifications.sql'), 'utf8');
  await client.query(sql);
  console.log('Migration applied successfully.');
  await client.end();
}
run();
