const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Loaded so the URL can live in the gitignored .env.local instead of being
// exported by hand. Optional: an exported SUPABASE_DB_URL works on its own.
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

/**
 * The connection string is read from the environment and never stored in
 * this file. It was previously hardcoded here in plaintext while the repo
 * was public, so any credential that ever appeared in this file must be
 * treated as compromised and rotated, not merely deleted.
 */
function requireDbUrl() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    throw new Error(
      'SUPABASE_DB_URL is not set.\n' +
      '  Add it to .env.local (gitignored) or export it in your shell:\n' +
      '    SUPABASE_DB_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres\n' +
      '  Supabase Dashboard > Project Settings > Database > Connection string.'
    );
  }
  return url;
}

const client = new Client({
  connectionString: requireDbUrl()
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
