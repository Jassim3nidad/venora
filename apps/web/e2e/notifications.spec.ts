import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const email = process.env.E2E_CUSTOMER_EMAIL;
const password = process.env.E2E_CUSTOMER_PASSWORD;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

test.describe("Notification Platform E2E", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !email || !password || !supabase,
      "Missing test credentials or DB URL",
    );

    // Setup login
    await page.goto("/login");
    // Depending on the UI, fill inputs
    await page.fill('input[type="email"]', email!);
    await page.fill('input[type="password"]', password!);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 10000,
    });
  });

  test("should subscribe to web push notifications and verify in DB", async ({
    page,
  }) => {
    // Navigate to settings
    await page.goto("/settings");

    const { data: usersData, error: userError } = await supabase!.auth.admin.listUsers();
    expect(userError).toBeNull();
    const user = usersData.users.find(u => u.email === email);
    expect(user).toBeDefined();

    const { data: existingSubscriptions, error: existingError } =
      await supabase!
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", user!.id);
    expect(existingError).toBeNull();
    const existingIds = new Set(
      (existingSubscriptions ?? []).map(({ id }) => id),
    );

    try {
      // Look for Push switch or button
      const pushSwitch = page
        .locator('button[role="switch"]')
        .filter({ hasText: /push/i })
        .first();

      // If not found, look for generic button
      const pushButton = page
        .locator("button")
        .filter({ hasText: /Enable device push/i });

      if (await pushSwitch.isVisible()) {
        const isChecked = await pushSwitch.getAttribute("aria-checked");
        if (isChecked === "false") {
          await pushSwitch.click();
        }
      } else if (await pushButton.isVisible()) {
        await pushButton.click();
      }

      await expect
        .poll(
          async () => {
            const { data: subscriptions } = await supabase!
              .from("push_subscriptions")
              .select("*")
              .eq("user_id", user!.id);
            return subscriptions ?? [];
          },
          { timeout: 10000 },
        )
        .toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              endpoint: expect.any(String),
              p256dh: expect.any(String),
              auth: expect.any(String),
            }),
          ]),
        );
    } finally {
      const { data: currentSubscriptions } = await supabase!
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", user!.id);
      const createdIds = (currentSubscriptions ?? [])
        .map(({ id }) => id)
        .filter((id) => !existingIds.has(id));
      if (createdIds.length > 0) {
        await supabase!
          .from("push_subscriptions")
          .delete()
          .in("id", createdIds);
      }
    }
  });

  test("should receive realtime notifications in-app", async ({ page }) => {
    // Navigate to dashboard
    await page.goto("/dashboard");

    // Get user id
    const { data: usersData, error: userError } = await supabase!.auth.admin.listUsers();
    expect(userError).toBeNull();
    const user = usersData.users.find(u => u.email === email);
    expect(user).toBeDefined();

    // Trigger a backend notification via Supabase
    const { data: notification, error: insertError } = await supabase!
      .from("notifications")
      .insert({
        user_id: user!.id,
        channel: "in_app",
        title: "E2E Test Notification",
        body: "This notification tests realtime UI updates",
        kind: "system",
        priority: "high",
        is_read: false,
      })
      .select("id")
      .single();
    expect(insertError).toBeNull();
    expect(notification).not.toBeNull();

    try {
      const bell = page.locator("button").filter({ hasText: /notification/i });
      await expect(bell).toBeVisible();
      await bell.click();

      const notificationItem = page
        .locator('text="E2E Test Notification"')
        .first();
      await expect(notificationItem).toBeVisible();
      await notificationItem.click();

      await expect
        .poll(
          async () => {
            const { data: updatedNotification } = await supabase!
              .from("notifications")
              .select("read_at, is_read")
              .eq("id", notification!.id)
              .single();
            return updatedNotification;
          },
          { timeout: 10000 },
        )
        .toEqual(
          expect.objectContaining({
            is_read: true,
            read_at: expect.any(String),
          }),
        );
    } finally {
      await supabase!.from("notifications").delete().eq("id", notification!.id);
    }
  });
});
