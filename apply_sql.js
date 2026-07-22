const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  connectionString: 'postgresql://postgres:REMOVED-CREDENTIAL@db.szmjjkywcsnzkgqevinz.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();
  const sql = fs.readFileSync(path.join(__dirname, 'supabase/migrations/0795_business_profiles.sql'), 'utf-8');
  try {
    await client.query(sql);
    console.log("Success: applied 0795_business_profiles.sql");
    await client.query("NOTIFY pgrst, 'reload schema';");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
