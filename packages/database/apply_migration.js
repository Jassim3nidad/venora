const fs = require('fs');
const { Client } = require('pg');
const env = fs.readFileSync('../../apps/web/.env.local', 'utf8');
const match = env.match(/DATABASE_URL="(.*?)"/);
const dbUrl = match ? match[1] : 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const client = new Client({ connectionString: dbUrl });
async function run() {
  await client.connect();
  const sql = fs.readFileSync('../../supabase/migrations/20260723300000_supplier_agreements.sql', 'utf8');
  try {
    await client.query(sql);
    console.log('Migration applied successfully');
  } catch(e) {
    console.error('Migration failed:', e);
  } finally {
    await client.end();
  }
}
run();
