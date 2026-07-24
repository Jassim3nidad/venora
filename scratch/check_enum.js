const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });
  await client.connect();
  const result = await client.query(`
    SELECT enum_range(NULL::public.partnership_status);
  `);
  console.log(result.rows[0].enum_range);
  await client.end();
}
run();
