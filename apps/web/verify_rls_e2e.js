const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
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

// Service role client (bypasses RLS)
const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

const TEST_PASSWORD = "RLSTestPassword123!";
const TEST_EMAIL = `test_rls_runner_${Date.now()}@gmail.com`;

let testUserId = null;
let userClient = null;

// Helper: Setup new test user
async function setupTestUser() {
  console.log(`👤 Creating single test runner user with email: ${TEST_EMAIL}...`);
  const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: "E2E RLS Runner",
      role: "customer"
    }
  });

  if (createError) {
    throw new Error(`Failed to create test user: ${createError.message}`);
  }

  testUserId = userData.user.id;
  console.log(`- Test user created with ID: ${testUserId}`);

  // Create authenticated client for this user
  userClient = createClient(supabaseUrl, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  });

  const { error: signInError } = await userClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });

  if (signInError) {
    throw new Error(`Failed to sign in: ${signInError.message}`);
  }

  console.log("🔑 Signed in test runner client successfully.");
}

// Helper: Change role of the test user
async function setTestUserRole(role) {
  console.log(`\n🎭 Switching test user role to: [${role}]`);
  
  // Clear any existing roles in public.user_roles for this user
  await adminClient.from('user_roles').delete().eq('user_id', testUserId);
  
  // Insert new role mapping
  const { error } = await adminClient.from('user_roles').insert({
    user_id: testUserId,
    role: role
  });

  if (error) {
    throw new Error(`Failed to set user role to ${role}: ${error.message}`);
  }

  // Small delay for DB consistency and potential cache invalidations
  await new Promise(r => setTimeout(r, 1000));
}

// Main Test Execution
async function runTests() {
  let failed = false;
  const assertions = [];

  function assert(name, condition, details = "") {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      assertions.push({ name, passed: true, details });
    } else {
      console.log(`❌ [FAIL] ${name}`);
      console.log(`   └─ Details: ${details}`);
      assertions.push({ name, passed: false, details });
      failed = true;
    }
  }

  try {
    await setupTestUser();

    console.log("\n🧪 Running Row Level Security Assertions...\n");

    // Existing Owner B (we use Jassim Trinidad's owner account ID from the list)
    // ID: 555dd872-8891-4674-a42e-9c5bba28587e
    const OWNER_B_ID = '555dd872-8891-4674-a42e-9c5bba28587e';
    const ORG_B = crypto.randomUUID();
    const VENUE_B = crypto.randomUUID();
    const BOOKING_B = crypto.randomUUID();

    // Insert Organization & Venue B for Owner B using service role
    await adminClient.from('organizations').upsert({ id: ORG_B, owner_id: OWNER_B_ID, name: "Owner B Org" });
    await adminClient.from('organization_members').upsert({ organization_id: ORG_B, user_id: OWNER_B_ID, role: 'owner' });
    await adminClient.from('venues').upsert({
      id: VENUE_B,
      organization_id: ORG_B,
      name: "Venue B (Draft)",
      slug: `venue-b-draft-test-${Date.now()}`,
      province: "Metro Manila",
      city: "Makati",
      address: "Address B",
      capacity_max: 200,
      base_price: 70000,
      status: "draft" // Draft venue is only visible to owner & admin
    });

    // -------------------------------------------------------------
    // ROLE TEST: customer
    // -------------------------------------------------------------
    await setTestUserRole('customer');

    // Customer SELECT profiles (public read)
    const { data: cProfiles, error: cProfileErr } = await userClient
      .from('profiles')
      .select('id, full_name');
    assert("profiles.select.public: Customer can select profiles", !cProfileErr && cProfiles.length > 0, cProfileErr?.message);

    // Customer UPDATE someone else's profile (should be blocked)
    const { error: cUpdProfErr } = await userClient
      .from('profiles')
      .update({ full_name: "Hacked!" })
      .eq('id', OWNER_B_ID);
    const { data: checkBProf } = await adminClient.from('profiles').select('full_name').eq('id', OWNER_B_ID).single();
    assert("profiles.update.self: Customer cannot update other's profile", checkBProf.full_name !== "Hacked!", cUpdProfErr?.message);

    // Customer SELECT user_roles (should only see self)
    const { data: myRoles, error: myRolesErr } = await userClient.from('user_roles').select('role');
    assert("user_roles.select.self: Customer can see own roles", !myRolesErr && myRoles.length === 1 && myRoles[0].role === 'customer', myRolesErr?.message);

    const { data: otherRoles, error: otherRolesErr } = await userClient.from('user_roles').select('role').eq('user_id', OWNER_B_ID);
    assert("user_roles.select.self: Customer cannot see other's roles", !otherRolesErr && otherRoles.length === 0, otherRolesErr?.message);

    // Customer self-assign admin (should fail)
    const { error: hackRoleErr } = await userClient
      .from('user_roles')
      .insert({ user_id: testUserId, role: 'admin' });
    assert("user_roles.all.admin: Customer blocked from self-assigning admin role", hackRoleErr !== null, "Expected insert to fail");

    // Customer inserts booking
    const BOOKING_A = crypto.randomUUID();
    const { error: cBookErr } = await userClient
      .from('bookings')
      .insert({
        id: BOOKING_A,
        venue_id: VENUE_B, // Inserting booking on Venue B (even if Venue B is draft, customers can request bookings)
        customer_id: testUserId,
        event_date: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
        guest_count: 50,
        status: 'pending'
      });
    assert("bookings.insert.customer: Customer can insert booking", !cBookErr, cBookErr?.message);

    // Customer reads own booking
    const { data: myBookings, error: myBookingsErr } = await userClient.from('bookings').select('id').eq('id', BOOKING_A);
    assert("bookings.select: Customer can see own booking", !myBookingsErr && myBookings.length === 1, myBookingsErr?.message);

    // Customer cannot see other booking
    // Insert a booking for Owner B
    await adminClient.from('bookings').upsert({
      id: BOOKING_B,
      venue_id: VENUE_B,
      customer_id: OWNER_B_ID,
      event_date: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
      guest_count: 50,
      status: 'pending'
    });

    const { data: otherBookings, error: otherBookingsErr } = await userClient.from('bookings').select('id').eq('id', BOOKING_B);
    assert("bookings.select: Customer cannot see other user's booking", !otherBookingsErr && otherBookings.length === 0, otherBookingsErr?.message);

    // Customer SELECT audit_logs (should return 0 rows/fail)
    const { data: cAudit, error: cAuditErr } = await userClient.from('audit_logs').select('*');
    assert("audit_logs.select.admin: Customer sees 0 audit logs", !cAuditErr && (cAudit === null || cAudit.length === 0), cAuditErr?.message);

    // -------------------------------------------------------------
    // ROLE TEST: venue_owner
    // -------------------------------------------------------------
    await setTestUserRole('venue_owner');

    const ORG_A = crypto.randomUUID();
    const VENUE_A = crypto.randomUUID();

    // Venue Owner inserts organization
    const { error: createOrgErr } = await userClient.from('organizations').insert({
      id: ORG_A,
      owner_id: testUserId,
      name: "Owner A Org"
    });
    assert("organizations.insert.venue_owner: Venue Owner can create organization", !createOrgErr, createOrgErr?.message);

    // Insert organization member link using service role
    await adminClient.from('organization_members').insert({
      organization_id: ORG_A,
      user_id: testUserId,
      role: 'owner'
    });

    // Venue Owner inserts venue
    const { error: createVenueErr } = await userClient.from('venues').insert({
      id: VENUE_A,
      organization_id: ORG_A,
      name: "Venue A",
      slug: `venue-a-draft-test-${Date.now()}`,
      province: "Cavite",
      city: "Tagaytay",
      address: "Address A",
      capacity_max: 100,
      base_price: 50000,
      status: "draft"
    });
    assert("venues.all.owner: Venue Owner can create venue in own org", !createVenueErr, createVenueErr?.message);

    // Venue Owner cannot view/read Venue B (draft venue of Org B)
    const { data: oReadVenueB, error: oReadVenueBErr } = await userClient.from('venues').select('id').eq('id', VENUE_B);
    assert("venues.all.owner: Venue Owner A cannot see Venue Owner B's draft venue", !oReadVenueBErr && oReadVenueB.length === 0, oReadVenueBErr?.message);

    // Venue Owner cannot insert booking for a foreign venue (should be blocked by RLS)
    const { error: oBookErr } = await userClient.from('bookings').insert({
      id: crypto.randomUUID(),
      venue_id: VENUE_B, // Venue B belongs to Org B (different owner)
      customer_id: testUserId,
      event_date: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
      guest_count: 50,
      status: 'pending'
    });
    assert("bookings.insert.customer: Venue Owner blocked from booking other's venue", oBookErr !== null, "Expected venue owner booking to fail");

    // -------------------------------------------------------------
    // ROLE TEST: supplier
    // -------------------------------------------------------------
    await setTestUserRole('supplier');

    // Supplier B profile setup (belonging to OWNER_B_ID, pending status)
    const SUP_PROFILE_ID = crypto.randomUUID();
    await adminClient.from('supplier_profiles').insert({
      id: SUP_PROFILE_ID,
      profile_id: OWNER_B_ID,
      business_name: "RLS E2E Catering B",
      accreditation_status: 'pending'
    });

    // Supplier inserts supplier profile for self (using valid UUID format)
    const MY_SUP_PROFILE_ID = crypto.randomUUID();
    const { error: supInsErr } = await userClient.from('supplier_profiles').insert({
      id: MY_SUP_PROFILE_ID,
      profile_id: testUserId,
      business_name: "RLS E2E Catering A",
      accreditation_status: 'pending'
    });
    assert("supplier_profiles.insert.supplier: Supplier can insert supplier profile", !supInsErr, supInsErr?.message);

    // Customer reads pending supplier profile (should filter out profile belonging to another user)
    await setTestUserRole('customer');
    const { data: checkPendingSup, error: checkPendingSupErr } = await userClient
      .from('supplier_profiles')
      .select('id')
      .eq('id', SUP_PROFILE_ID);
    assert("supplier_profiles.select.accredited: Customer cannot view pending supplier profiles of others", !checkPendingSupErr && checkPendingSup.length === 0, checkPendingSupErr?.message);

    // Restore role to supplier to delete service
    await setTestUserRole('supplier');

    // -------------------------------------------------------------
    // ROLE TEST: admin
    // -------------------------------------------------------------
    await setTestUserRole('admin');

    // Admin selects audit logs
    const { data: adminAudit, error: adminAuditErr } = await userClient.from('audit_logs').select('*');
    assert("audit_logs.select.admin: Admin can read audit logs", !adminAuditErr, adminAuditErr?.message);

    // -------------------------------------------------------------
    // CLEANUP TEST DATA
    // -------------------------------------------------------------
    console.log("\n🧹 Cleaning up test data...");
    await adminClient.from('bookings').delete().in('id', [BOOKING_A, BOOKING_B]);
    await adminClient.from('supplier_profiles').delete().in('id', [SUP_PROFILE_ID, MY_SUP_PROFILE_ID]);
    await adminClient.from('venues').delete().in('id', [VENUE_A, VENUE_B]);
    await adminClient.from('organizations').delete().in('id', [ORG_A, ORG_B]);

    console.log("🧹 Deleting test runner user...");
    await adminClient.auth.admin.deleteUser(testUserId);

    console.log("\n==================================================");
    if (!failed) {
      console.log("🎉 ALL RLS TESTS PASSED END-TO-END! (100% of defined roles tested)");
    } else {
      console.log("❌ SOME RLS TESTS FAILED. CHECK LOGS.");
    }
    console.log("==================================================\n");

  } catch (err) {
    console.error("FATAL ERROR running tests:", err);
    if (testUserId) {
      await adminClient.auth.admin.deleteUser(testUserId);
    }
    process.exit(1);
  }

  if (failed) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
