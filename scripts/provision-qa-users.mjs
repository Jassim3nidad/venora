import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse .env.local
const envPath = path.join(__dirname, '../apps/web/.env.local');
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
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

const ACCOUNTS = [
  { role: "analystAdmin", email: env.E2E_ANALYST_ADMIN_EMAIL, password: env.E2E_ANALYST_ADMIN_PASSWORD, dbRole: "admin", tier: "analyst" },
  { role: "financeAdmin", email: env.E2E_FINANCE_ADMIN_EMAIL, password: env.E2E_FINANCE_ADMIN_PASSWORD, dbRole: "admin", tier: "finance" },
  { role: "superAdmin", email: env.E2E_SUPER_ADMIN_EMAIL, password: env.E2E_SUPER_ADMIN_PASSWORD, dbRole: "admin", tier: "super_admin" },
  { role: "tenantAOwner", email: env.E2E_TENANT_A_OWNER_EMAIL, password: env.E2E_TENANT_A_OWNER_PASSWORD, dbRole: "venue", orgName: "Tenant A Org", venueName: "Tenant A Venue" },
  { role: "tenantBOwner", email: env.E2E_TENANT_B_OWNER_EMAIL, password: env.E2E_TENANT_B_OWNER_PASSWORD, dbRole: "venue", orgName: "Tenant B Org", venueName: "Tenant B Venue" },
  { role: "coordinator", email: env.E2E_COORDINATOR_EMAIL, password: env.E2E_COORDINATOR_PASSWORD, dbRole: "event_coordinator" },
  { role: "supplier", email: env.E2E_SUPPLIER_EMAIL, password: env.E2E_SUPPLIER_PASSWORD, dbRole: "supplier", businessName: "QA Supplier" },
  { role: "tenantACustomer", email: env.E2E_TENANT_A_CUSTOMER_EMAIL, password: env.E2E_TENANT_A_CUSTOMER_PASSWORD, dbRole: "customer" },
  { role: "tenantBCustomer", email: env.E2E_TENANT_B_CUSTOMER_EMAIL, password: env.E2E_TENANT_B_CUSTOMER_PASSWORD, dbRole: "customer" },
  { role: "nonMember", email: env.E2E_NON_MEMBER_EMAIL, password: env.E2E_NON_MEMBER_PASSWORD, dbRole: null }
].filter(acc => acc.email); // Only provision those defined

const IS_CLEANUP = process.argv.includes('--clean');

async function cleanAccounts() {
  console.log('Cleaning up QA synthetic records...');
  const { data: usersData } = await adminClient.auth.admin.listUsers();
  
  for (const acc of ACCOUNTS) {
    const user = usersData?.users?.find(u => u.email === acc.email);
    if (user) {
      console.log(`Deleting QA records and account for ${acc.email}...`);
      
      // Delete venues owned by this user's organization (trigger cascade or manual)
      const { data: orgs } = await adminClient.from('organizations').select('id').eq('owner_id', user.id);
      if (orgs) {
        for (const org of orgs) {
          await adminClient.from('venues').delete().eq('organization_id', org.id);
          await adminClient.from('organizations').delete().eq('id', org.id);
        }
      }
      
      await adminClient.from('supplier_profiles').delete().eq('profile_id', user.id);
      await adminClient.auth.admin.deleteUser(user.id);
    }
  }
  console.log('Cleanup complete.');
}

async function provisionAccounts() {
  console.log('Provisioning QA Accounts & Fixtures...');
  const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers();
  if (listError) throw listError;

  const userIds = {};

  for (const acc of ACCOUNTS) {
    let existingUser = usersData.users.find(u => u.email === acc.email);
    let userId;
    
    if (existingUser) {
      userId = existingUser.id;
    } else {
      console.log(`[${acc.email}] Creating user...`);
      const { data: userData, error } = await adminClient.auth.admin.createUser({
        email: acc.email, password: acc.password, email_confirm: true,
        user_metadata: { full_name: `QA ${acc.role}` }
      });
      if (error) { console.error(error.message); continue; }
      userId = userData.user.id;
    }
    userIds[acc.role] = userId;

    await adminClient.from('profiles').update({ status: 'active', full_name: `QA ${acc.role}` }).eq('id', userId);

    if (acc.dbRole) {
      await adminClient.from('user_roles').delete().eq('user_id', userId);
      await adminClient.from('user_roles').insert({ user_id: userId, role: acc.dbRole });
      
      if (acc.tier) {
        // Idempotent upsert into admin_user_roles via direct insert bypassing admin_assign_tier RPC (as it requires acting as admin)
        await adminClient.from('admin_user_roles').delete().eq('user_id', userId);
        await adminClient.from('admin_user_roles').insert({ user_id: userId, tier: acc.tier, is_active: true });
        console.log(`[${acc.email}] Assigned admin tier: ${acc.tier}`);
      }
    }
  }

  // Tenant A & B organizations & venues
  for (const role of ['tenantAOwner', 'tenantBOwner']) {
    const acc = ACCOUNTS.find(a => a.role === role);
    const userId = userIds[role];
    if (!acc || !userId) continue;

    let { data: orgs } = await adminClient.from('organizations').select('id').eq('owner_id', userId);
    let orgId;
    if (!orgs || orgs.length === 0) {
      const { data: newOrg } = await adminClient.from('organizations').insert({
        owner_id: userId, name: acc.orgName
      }).select().single();
      orgId = newOrg?.id;
      console.log(`Created Organization: ${acc.orgName}`);
    } else {
      orgId = orgs[0].id;
    }

    if (orgId) {
      // Ensure owner membership
      await adminClient.from('organization_members').upsert({
        organization_id: orgId, user_id: userId, role: 'staff'
      });

      // Ensure Venue exists
      const slug = acc.venueName.toLowerCase().replace(/ /g, '-');
      let { data: venues } = await adminClient.from('venues').select('id').eq('slug', slug);
      if (!venues || venues.length === 0) {
        await adminClient.from('venues').insert({
          organization_id: orgId, name: acc.venueName, slug: slug,
          province: 'Metro Manila', city: 'Makati', address: '123 QA St',
          capacity_max: 200, base_price: 50000, status: 'published'
        });
        console.log(`Created Venue: ${acc.venueName}`);
      }
    }
  }

  // Supplier profile
  const supplierId = userIds['supplier'];
  if (supplierId) {
    const { data: sps } = await adminClient.from('supplier_profiles').select('id').eq('profile_id', supplierId);
    if (!sps || sps.length === 0) {
      await adminClient.from('supplier_profiles').insert({
        profile_id: supplierId, business_name: 'QA Supplier', accreditation_status: 'accredited',
        slug: 'qa-supplier'
      });
      console.log(`Created Accredited Supplier: QA Supplier`);
    } else {
      await adminClient.from('supplier_profiles').update({ accreditation_status: 'accredited' }).eq('id', sps[0].id);
    }
  }
  
  // Coordinator mapping (add to Tenant A)
  const coordId = userIds['coordinator'];
  const tenantAOwnerId = userIds['tenantAOwner'];
  if (coordId && tenantAOwnerId) {
    const { data: orgs } = await adminClient.from('organizations').select('id').eq('owner_id', tenantAOwnerId);
    if (orgs && orgs[0]) {
      try {
        await adminClient.from('organization_members').upsert({
          organization_id: orgs[0].id, user_id: coordId, role: 'coordinator'
        });
      } catch (err) {
        await adminClient.from('organization_members').upsert({
          organization_id: orgs[0].id, user_id: coordId, role: 'staff'
        });
      }
      console.log(`Assigned Coordinator to Tenant A Org`);
    }
  }

  console.log('Finished provisioning QA fixtures.');
}

if (IS_CLEANUP) {
  cleanAccounts().catch(console.error);
} else {
  provisionAccounts().catch(console.error);
}
