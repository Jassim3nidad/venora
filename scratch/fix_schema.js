const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });
  await client.connect();
  
  try {
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE public.partnership_status AS ENUM (
          'invited',
          'application_submitted',
          'under_review',
          'active',
          'paused',
          'ended',
          'suspended'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await client.query(`
      ALTER TABLE public.venue_suppliers ADD COLUMN IF NOT EXISTS status public.partnership_status NOT NULL DEFAULT 'application_submitted';
    `);
    
    await client.query(`
      UPDATE public.venue_suppliers SET status = 'active' WHERE status = 'application_submitted';
    `);
    
    console.log("Successfully fixed status column");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
