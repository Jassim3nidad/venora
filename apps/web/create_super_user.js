const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env file
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

const SUPER_EMAIL = "super@venora.com";
const SUPER_PASSWORD = "SuperPassword123!";

async function createSuperUser() {
  console.log(`Checking if user ${SUPER_EMAIL} already exists...`);
  
  const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers();
  if (listError) {
    console.error("Error listing users:", listError.message);
    process.exit(1);
  }
  
  let existingUser = usersData.users.find(u => u.email === SUPER_EMAIL);
  let userId;
  
  if (existingUser) {
    console.log(`User already exists (ID: ${existingUser.id}). Ensuring admin role...`);
    userId = existingUser.id;
  } else {
    console.log(`Creating user with email: ${SUPER_EMAIL}...`);
    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
      email: SUPER_EMAIL,
      password: SUPER_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: "Super User",
        role: "admin"
      }
    });
    
    if (createError) {
      console.error("Error creating user:", createError.message);
      process.exit(1);
    }
    userId = userData.user.id;
    console.log(`User created successfully with ID: ${userId}`);
  }
  
  // Set profile to active
  console.log(`Ensuring profile status is active...`);
  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ status: 'active', full_name: 'Super User' })
    .eq('id', userId);
  if (profileError) {
    console.error("Warning updating profile status:", profileError.message);
  }

  console.log(`Assigning single role: admin...`);
  const { error: deleteRoleError } = await adminClient
    .from('user_roles')
    .delete()
    .eq('user_id', userId);

  if (deleteRoleError) {
    console.error("Error clearing existing roles:", deleteRoleError.message);
    process.exit(1);
  }

  const { error: roleError } = await adminClient
    .from('user_roles')
    .insert({ user_id: userId, role: 'admin' });

  if (roleError) {
    console.error(`Error assigning admin role:`, roleError.message);
    process.exit(1);
  }

  console.log(`\n🎉 Super User account setup complete!`);
  console.log(`----------------------------------------`);
  console.log(`Email:    ${SUPER_EMAIL}`);
  console.log(`Password: ${SUPER_PASSWORD}`);
  console.log(`Role:     admin`);
  console.log(`----------------------------------------\n`);
}

createSuperUser();
