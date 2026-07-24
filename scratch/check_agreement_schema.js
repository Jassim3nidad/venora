const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });
  await client.connect();
  
  // Check venue owner column
  const r1 = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'venues' AND column_name LIKE '%owner%' OR column_name LIKE '%profile%';
  `);
  console.log('Venue owner columns:', r1.rows);
  
  // Check if bookings have a reference to agreements
  const r2 = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'bookings';
  `);
  console.log('Booking columns:', r2.rows.map(r => r.column_name));
  
  // Also look at the notification_kind enum to pick a valid type
  const r3 = await client.query(`SELECT enum_range(NULL::public.notification_kind);`);
  console.log('notification_kind values:', r3.rows[0].enum_range);

  await client.end();
}
run().catch(console.error);
