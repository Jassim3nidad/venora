const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  connectionString: 'postgresql://postgres:startuplab2905@db.szmjjkywcsnzkgqevinz.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();
  const sql = fs.readFileSync(path.join(__dirname, 'supabase/migrations/0790_fix_promotion_video_rls.sql'), 'utf-8');
  try {
    await client.query(sql);
    console.log("Success: applied 0790_fix_promotion_video_rls.sql");
    await client.query("NOTIFY pgrst, 'reload schema';");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
