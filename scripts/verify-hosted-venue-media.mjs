import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

if (
  process.env.VENORA_TEST_ENVIRONMENT !== "confirmed" ||
  process.env.VENORA_ENVIRONMENT_CLASS !== "staging"
) {
  console.error(
    "BLOCKED: run pnpm hosted:guard before hosted RLS verification.",
  );
  process.exit(1);
}

const root = resolve(import.meta.dirname, "..");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const runId = (process.env.GITHUB_RUN_ID ?? crypto.randomUUID()).replace(
  /[^a-zA-Z0-9-]/g,
  "",
);
if (!url || !anonKey || !serviceKey) {
  console.error("BLOCKED: protected Supabase credentials are incomplete.");
  process.exit(1);
}

const options = { auth: { autoRefreshToken: false, persistSession: false } };
const service = createClient(url, serviceKey, options);

async function signIn(emailName, passwordName) {
  const email = process.env[emailName];
  const password = process.env[passwordName];
  if (!email || !password)
    throw new Error(`missing fixture ${emailName}/${passwordName}`);
  const client = createClient(url, anonKey, options);
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user)
    throw new Error(`fixture sign-in failed: ${emailName}`);
  return { client, userId: data.user.id };
}

async function venueFor(userId) {
  const { data: memberships, error: memberError } = await service
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .limit(5);
  if (memberError || !memberships?.length)
    throw new Error("venue fixture has no organization membership");
  for (const membership of memberships) {
    const { data: venue, error } = await service
      .from("venues")
      .select("id, organization_id")
      .eq("organization_id", membership.organization_id)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error("venue fixture lookup failed");
    if (venue) return venue;
  }
  throw new Error("venue fixture organization has no venue");
}

function bytes(value) {
  return new TextEncoder().encode(value);
}

async function assertObject(path, expected) {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const objectUrl = new URL(
    `/storage/v1/object/venue-images/${encodedPath}`,
    url,
  );
  objectUrl.searchParams.set("verification", crypto.randomUUID());
  const response = await fetch(objectUrl, {
    cache: "no-store",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });
  if (!response.ok) throw new Error("expected venue-media object is missing");
  const actual = await response.text();
  if (actual !== expected)
    throw new Error("venue-media object content changed unexpectedly");
}

async function assertDenied(result, label) {
  if (!result.error) throw new Error(`${label} unexpectedly succeeded`);
}

const cleanup = new Set();
try {
  const ownerA = await signIn("RLS_TENANT_A_EMAIL", "RLS_TENANT_A_PASSWORD");
  const ownerB = await signIn("RLS_TENANT_B_EMAIL", "RLS_TENANT_B_PASSWORD");
  const customer = await signIn(
    "RLS_NON_MEMBER_EMAIL",
    "RLS_NON_MEMBER_PASSWORD",
  );
  const venueA = await venueFor(ownerA.userId);
  const venueB = await venueFor(ownerB.userId);
  if (venueA.organization_id === venueB.organization_id) {
    throw new Error("venue fixtures must belong to different organizations");
  }

  const pathA = `${venueA.organization_id}/${venueA.id}/ci-${runId}-a.png`;
  const pathB = `${venueB.organization_id}/${venueB.id}/ci-${runId}-b.png`;
  const servicePath = `${venueA.organization_id}/${venueA.id}/ci-${runId}-service.png`;
  cleanup.add(pathA);
  cleanup.add(pathB);
  cleanup.add(servicePath);

  const ownUpload = await ownerA.client.storage
    .from("venue-images")
    .upload(pathA, bytes("owner-a-v1"), {
      contentType: "image/png",
      upsert: false,
    });
  if (ownUpload.error) throw new Error("same-tenant upload failed");
  await assertObject(pathA, "owner-a-v1");

  const ownUpdate = await ownerA.client.storage
    .from("venue-images")
    .upload(pathA, bytes("owner-a-v2"), {
      contentType: "image/png",
      upsert: true,
    });
  if (ownUpdate.error) throw new Error("same-tenant update failed");
  await assertObject(pathA, "owner-a-v2");

  const ownerBUpload = await ownerB.client.storage
    .from("venue-images")
    .upload(pathB, bytes("owner-b-v1"), {
      contentType: "image/png",
      upsert: false,
    });
  if (ownerBUpload.error)
    throw new Error("second-tenant fixture upload failed");

  await assertDenied(
    await ownerA.client.storage
      .from("venue-images")
      .upload(pathB, bytes("cross-update"), {
        contentType: "image/png",
        upsert: true,
      }),
    "cross-tenant update",
  );
  await assertObject(pathB, "owner-b-v1");

  const crossDelete = await ownerA.client.storage
    .from("venue-images")
    .remove([pathB]);
  if (crossDelete.error) {
    // A policy error is acceptable. Some Storage API versions report zero-row deletes as success.
  }
  await assertObject(pathB, "owner-b-v1");

  const customerPath = `${venueA.organization_id}/${venueA.id}/ci-${runId}-customer.png`;
  cleanup.add(customerPath);
  await assertDenied(
    await customer.client.storage
      .from("venue-images")
      .upload(customerPath, bytes("customer"), {
        contentType: "image/png",
        upsert: false,
      }),
    "non-member upload",
  );

  const publicUrl = ownerB.client.storage
    .from("venue-images")
    .getPublicUrl(pathB).data.publicUrl;
  const publicResponse = await fetch(publicUrl);
  if (!publicResponse.ok) throw new Error("public venue-media read failed");

  const serviceUpload = await service.storage
    .from("venue-images")
    .upload(servicePath, bytes("service-role"), {
      contentType: "image/png",
      upsert: false,
    });
  if (serviceUpload.error)
    throw new Error("service-role bypass verification failed");
  await assertObject(servicePath, "service-role");

  const ownDelete = await ownerA.client.storage
    .from("venue-images")
    .remove([pathA]);
  if (ownDelete.error) throw new Error("same-tenant delete failed");
  cleanup.delete(pathA);
  const { data: deletedObject } = await service.storage
    .from("venue-images")
    .download(pathA);
  if (deletedObject)
    throw new Error("same-tenant delete did not remove object");

  const outputRoot = join(root, "artifacts", "ci");
  mkdirSync(outputRoot, { recursive: true });
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    environmentClass: "staging",
    status: "PASS",
    assertions: {
      sameTenantUpload: true,
      sameTenantUpdate: true,
      sameTenantDelete: true,
      crossTenantUpdateDenied: true,
      crossTenantDeleteDenied: true,
      nonMemberUploadDenied: true,
      publicReadAllowed: true,
      serviceRoleBypassSeparatelyVerified: true,
    },
  };
  writeFileSync(
    join(outputRoot, "hosted-storage-rls.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(
    "Hosted venue-media RLS passed: same-tenant writes allowed; cross-tenant and non-member writes denied.",
  );
} catch (error) {
  console.error(
    `Hosted venue-media RLS failed: ${error instanceof Error ? error.message : "unknown error"}`,
  );
  process.exitCode = 1;
} finally {
  if (cleanup.size > 0) {
    await service.storage.from("venue-images").remove([...cleanup]);
  }
}
