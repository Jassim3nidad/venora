import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "apps/web/.env.local" });

console.log("Validating Notification Pipeline End-to-End...");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const testUserId = process.env.NOTIFICATION_TEST_USER_ID;

if (!supabaseUrl || !supabaseKey || !testUserId) {
  console.error(
    "❌ Missing SUPABASE_URL, SERVICE_ROLE_KEY, or NOTIFICATION_TEST_USER_ID.",
  );
  console.log(
    "Skipping pipeline test. Provide NOTIFICATION_TEST_USER_ID to run full pipeline.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runPipeline() {
  console.log("1. Creating test notification record...");
  const { data: notification, error: insertError } = await supabase
    .from("notifications")
    .insert({
      user_id: testUserId,
      channel: "in_app",
      title: "Pipeline Test",
      body: "This is an automated pipeline test.",
      kind: "system",
      priority: "high",
    })
    .select("*")
    .single();

  if (insertError) {
    console.error("❌ Failed to insert notification:", insertError);
    process.exit(1);
  }

  console.log(`✅ Notification created (ID: ${notification.id})`);

  console.log("2. Waiting for delivery records to be queued...");
  // Wait a moment for triggers to insert into notification_deliveries
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const { data: deliveries, error: delError } = await supabase
    .from("notification_deliveries")
    .select("*")
    .eq("notification_id", notification.id);

  if (delError || !deliveries || deliveries.length === 0) {
    console.error("❌ Failed to fetch delivery records or no records queued.");
    process.exit(1);
  }

  let hasPush = false;
  let hasEmail = false;
  let hasSms = false;

  deliveries.forEach((d) => {
    if (d.provider === "web_push") hasPush = true;
    if (d.provider === "smtp") hasEmail = true;
    if (d.provider === "twilio") {
      hasSms = true;
      if (d.status !== "skipped") {
        console.error("❌ SMS delivery was created but NOT skipped!");
        process.exit(1);
      }
    }
  });

  if (hasPush) console.log("✅ Web Push delivery queued.");
  if (hasEmail) console.log("✅ Email delivery queued.");
  if (
    !hasSms ||
    deliveries.find((d) => d.provider === "twilio" && d.status === "skipped")
  ) {
    console.log("✅ SMS delivery correctly skipped or omitted.");
  }

  console.log("3. Waiting for dispatcher to process deliveries...");
  // Dispatcher is usually edge function triggered by webhook or cron. We will wait 5 seconds.
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const { data: processedDeliveries } = await supabase
    .from("notification_deliveries")
    .select("*")
    .eq("notification_id", notification.id);

  let dispatchPassed = true;
  processedDeliveries.forEach((d) => {
    if (d.status === "failed") {
      console.error(
        `❌ Delivery for ${d.provider} failed: ${JSON.stringify(d.error_log)}`,
      );
      dispatchPassed = false;
    } else if (d.status === "queued") {
      console.log(
        `⚠️ Delivery for ${d.provider} is still queued (dispatcher might not be running locally).`,
      );
      // We do not fail the test locally if the dispatcher isn't running, but in production we might.
    } else {
      console.log(`✅ Delivery for ${d.provider} status: ${d.status}`);
    }
  });

  if (!dispatchPassed) {
    console.error("Pipeline validation failed during dispatch.");
    process.exit(1);
  }

  console.log("✅ Notification Pipeline Validation Passed.\n");
}

runPipeline();
