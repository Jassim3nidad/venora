const fs = require('fs');
const { Client } = require('pg');
const env = fs.readFileSync('apps/web/.env.local', 'utf8');
let dbUrl = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const match = env.match(/DATABASE_URL="(.*?)"/);
if (match) dbUrl = match[1];
const match2 = env.match(/DATABASE_URL=([^\s]+)/);
if (!match && match2) dbUrl = match2[1];

const client = new Client({ connectionString: dbUrl });
async function run() {
  try {
    await client.connect();
    const sql = fs.readFileSync('supabase/migrations/20260728120000_custom_amenities.sql', 'utf8');
    await client.query(sql);
    console.log('Migration applied successfully');
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log('Schema cache reloaded successfully');
  } catch(e) {
    console.error('Migration failed:', e);
  } finally {
    await client.end();
  }
}
run();
