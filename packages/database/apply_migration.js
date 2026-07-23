const fs = require('fs');
const { Client } = require('pg');
const env = fs.readFileSync('../../apps/web/.env.local', 'utf8');
const match = env.match(/DATABASE_URL="(.*?)"/);
if (!match) { console.error('No DATABASE_URL found'); process.exit(1); }
const client = new Client({ connectionString: match[1] });
async function run() {
  await client.connect();
  const sql = fs.readFileSync('../../supabase/migrations/20260723200000_supplier_partnerships.sql', 'utf8');
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
