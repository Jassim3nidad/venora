const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });
  await client.connect();
  
  const sql = fs.readFileSync('supabase/migrations/20260724100000_agreement_cancellation_notifications.sql', 'utf8');
  
  try {
    await client.query(sql);
    console.log('Migration applied successfully.');
  } catch (e) {
    console.error('Migration failed:', e.message);
  }
  
  await client.end();
}
run();
