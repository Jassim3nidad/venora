import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { credentialsFor, loginAs } from "./helpers/auth";

const isHostedStaging =
  process.env.VENORA_TEST_ENVIRONMENT === "confirmed" &&
  process.env.VENORA_ENVIRONMENT_CLASS === "staging";

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required hosted E2E variable: ${name}`);
  return value;
}

async function findUserByEmail(
  service: SupabaseClient,
  email: string,
): Promise<User> {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (error) throw error;
    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === email.toLowerCase(),
    );
    if (user) return user;
    if (data.users.length < 100) break;
  }
  throw new Error(`Hosted fixture user was not found: ${email}`);
}

async function createAuthenticatedClient(email: string, password: string) {
  const client = createClient(
    requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnvironment("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) {
    throw error ?? new Error(`Could not sign in hosted fixture: ${email}`);
  }
  return { client, user: data.user };
}

async function createPendingBooking(
  service: SupabaseClient,
  customerId: string,
  venueId: string,
) {
  for (let day = 1; day <= 28; day += 1) {
    const eventDate = `2099-12-${String(day).padStart(2, "0")}`;
    const { data, error } = await service
      .from("bookings")
      .insert({
        venue_id: venueId,
        customer_id: customerId,
        package_id: null,
        event_date: eventDate,
        guest_count: 25,
        status: "pending",
      })
      .select("id")
      .single();
    if (!error && data) return { id: String(data.id), eventDate };
    if (error?.code !== "23505") throw error;
  }
  throw new Error("No unused hosted booking fixture date is available.");
}

async function cleanupBooking(
  service: SupabaseClient,
  bookingId: string,
  venueId: string,
  eventDate: string,
) {
  await service.from("ai_action_requests").delete().contains("arguments", {
    bookingId,
  });
  await service.from("notifications").delete().ilike("link", `%${bookingId}%`);
  await service
    .from("booking_status_history")
    .delete()
    .eq("booking_id", bookingId);
  await service.from("audit_logs").delete().eq("entity_id", bookingId);
  await service.from("bookings").delete().eq("id", bookingId);
  await service
    .from("venue_availability")
    .delete()
    .eq("venue_id", venueId)
    .eq("date", eventDate);
}

async function fillPlanningTask(
  page: Page,
  title: string,
  dependency?: string,
) {
  await page.getByRole("button", { name: "Add task" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Task title").fill(title);
  await dialog.getByLabel("Priority").selectOption("high");
  await dialog.getByLabel("Owner").fill("Hosted QA");
  await dialog.getByLabel("Start").fill("2099-10-01T09:00");
  await dialog.getByLabel("End").fill("2099-10-01T10:00");
  if (dependency) {
    await dialog.getByLabel("Depends on").selectOption({ label: dependency });
  }
  await dialog.getByRole("button", { name: "Save task" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
}

test.describe.serial("Phase 3-4 hosted acceptance", () => {
  test.skip(
    !isHostedStaging,
    "Runs only after the fail-closed hosted staging guard succeeds.",
  );

  let service: SupabaseClient;
  let customerId: string;
  let venue: { id: string; slug: string; name: string };
  const runId = `Hosted${Date.now()}`;

  test.beforeAll(async () => {
    service = createClient(
      requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
      requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const customer = await findUserByEmail(
      service,
      credentialsFor("customer").email,
    );
    customerId = customer.id;

    const { data: venueRow, error: venueError } = await service
      .from("venues")
      .select("id,slug,name")
      .eq("status", "published")
      .not("slug", "is", null)
      .limit(1)
      .single();
    if (venueError || !venueRow?.slug) {
      throw (
        venueError ??
        new Error("Staging needs one published venue with a slug.")
      );
    }
    venue = {
      id: String(venueRow.id),
      slug: String(venueRow.slug),
      name: String(venueRow.name),
    };
  });

  test.afterAll(async () => {
    if (!service || !customerId) return;
    const { data: guests } = await service
      .from("event_guests")
      .select("id")
      .eq("user_id", customerId)
      .ilike("first_name", `${runId}%`);
    const guestIds = (guests ?? []).map((guest) => guest.id);
    if (guestIds.length) {
      await service
        .from("event_seating_assignments")
        .delete()
        .in("guest_id", guestIds);
      await service.from("event_guests").delete().in("id", guestIds);
    }
    await service
      .from("event_seating_tables")
      .delete()
      .eq("user_id", customerId)
      .ilike("table_name", `${runId}%`);
    await service
      .from("event_timeline_tasks")
      .delete()
      .eq("user_id", customerId)
      .ilike("title", `${runId}%`);
  });

  test("planning tables enforce cross-account RLS", async () => {
    const tenantA = await createAuthenticatedClient(
      requiredEnvironment("RLS_TENANT_A_EMAIL"),
      requiredEnvironment("RLS_TENANT_A_PASSWORD"),
    );
    const tenantB = await createAuthenticatedClient(
      requiredEnvironment("RLS_TENANT_B_EMAIL"),
      requiredEnvironment("RLS_TENANT_B_PASSWORD"),
    );
    const marker = `${runId}Rls`;

    const { data: guest, error: guestError } = await tenantA.client
      .from("event_guests")
      .insert({
        user_id: tenantA.user.id,
        first_name: marker,
        last_name: "Guest",
      })
      .select("id")
      .single();
    if (guestError || !guest) throw guestError;

    const { data: table, error: tableError } = await tenantA.client
      .from("event_seating_tables")
      .insert({
        user_id: tenantA.user.id,
        table_name: marker,
        capacity: 2,
      })
      .select("id")
      .single();
    if (tableError || !table) throw tableError;

    const { data: assignment, error: assignmentError } = await tenantA.client
      .from("event_seating_assignments")
      .insert({ table_id: table.id, guest_id: guest.id })
      .select("id")
      .single();
    if (assignmentError || !assignment) throw assignmentError;

    const { data: task, error: taskError } = await tenantA.client
      .from("event_timeline_tasks")
      .insert({
        user_id: tenantA.user.id,
        title: marker,
        status: "todo",
        priority: "medium",
      })
      .select("id")
      .single();
    if (taskError || !task) throw taskError;

    for (const [tableName, id] of [
      ["event_guests", guest.id],
      ["event_seating_tables", table.id],
      ["event_seating_assignments", assignment.id],
      ["event_timeline_tasks", task.id],
    ] as const) {
      const { data, error } = await tenantB.client
        .from(tableName)
        .select("id")
        .eq("id", id);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    }

    const { error: forgedInsertError } = await tenantB.client
      .from("event_timeline_tasks")
      .insert({
        user_id: tenantA.user.id,
        title: `${marker}Forged`,
        status: "todo",
        priority: "medium",
      });
    expect(forgedInsertError).not.toBeNull();

    await tenantA.client
      .from("event_seating_assignments")
      .delete()
      .eq("id", assignment.id);
    await tenantA.client
      .from("event_seating_tables")
      .delete()
      .eq("id", table.id);
    await tenantA.client
      .from("event_timeline_tasks")
      .delete()
      .eq("id", task.id);
    await tenantA.client.from("event_guests").delete().eq("id", guest.id);
  });

  test("guest CRUD, CSV, filters, statistics, and public RSVP work", async ({
    browser,
    page,
  }) => {
    const firstName = `${runId}Guest`;
    const importedFirstName = `${runId}Csv`;

    await loginAs(page, "customer");
    await page.goto("/account/guests");
    await expect(
      page.getByRole("heading", { name: "Guest list" }),
    ).toBeVisible();
    await expect(
      page.getByText("Guest management is being prepared"),
    ).toHaveCount(0);
    const totalGuestsCard = page
      .getByText("Total guests", { exact: true })
      .locator("..");
    const initialTotalGuests = Number(
      await totalGuestsCard.locator("p").nth(1).textContent(),
    );

    await page.getByRole("button", { name: "Add guest" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("First name *").fill(firstName);
    await dialog.getByLabel("Last name *").fill("Primary");
    await dialog.getByLabel("Email").fill(credentialsFor("customer").email);
    await dialog.getByLabel("Group").fill("Hosted QA");
    await dialog.getByLabel("Plus-ones allowed").fill("1");
    await dialog.getByRole("button", { name: "Save guest" }).click();
    await expect(
      page.getByRole("heading", { name: `${firstName} Primary` }),
    ).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles({
      name: "hosted-guests.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        `first_name,last_name,guest_group,rsvp_status\n${importedFirstName},Imported,Hosted CSV,pending\n`,
      ),
    });
    await expect(
      page.getByRole("heading", { name: `${importedFirstName} Imported` }),
    ).toBeVisible();
    await expect(totalGuestsCard.locator("p").nth(1)).toHaveText(
      String(initialTotalGuests + 2),
    );

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV" }).click();
    expect((await downloadPromise).suggestedFilename()).toMatch(
      /venora-guests-\d{4}-\d{2}-\d{2}\.csv/,
    );

    await page
      .getByPlaceholder("Search guest or group")
      .fill(`${firstName}Guest`);
    await expect(page.getByText("No matching guests")).toBeVisible();
    await page.getByPlaceholder("Search guest or group").fill(firstName);
    await expect(
      page.getByRole("heading", { name: `${firstName} Primary` }),
    ).toBeVisible();

    const guestArticle = page
      .getByRole("article")
      .filter({ hasText: `${firstName} Primary` });
    await guestArticle.getByRole("button", { name: "Edit" }).click();
    await dialog.getByLabel("RSVP status").selectOption("tentative");
    await dialog.getByRole("button", { name: "Save guest" }).click();
    await expect(guestArticle.getByText("tentative")).toBeVisible();

    const reminderDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    page.once("dialog", (prompt) => prompt.accept(reminderDate));
    await guestArticle.getByRole("button", { name: "Create RSVP" }).click();
    await expect(
      guestArticle.getByRole("button", { name: "Copy RSVP" }),
    ).toBeVisible();

    const { data: guest, error: guestError } = await service
      .from("event_guests")
      .select(
        "id,rsvp_token,invitation_sent_at,rsvp_invitation_delivered_at,rsvp_delivery_error",
      )
      .eq("user_id", customerId)
      .eq("first_name", firstName)
      .single();
    if (
      guestError ||
      !guest?.rsvp_token ||
      !guest.invitation_sent_at ||
      !guest.rsvp_invitation_delivered_at ||
      guest.rsvp_delivery_error
    ) {
      throw guestError ?? new Error("Hosted RSVP invitation was not issued.");
    }

    const reminderResponse = await fetch(
      `${requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL")}/functions/v1/rsvp-notifications`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${requiredEnvironment("NEXT_PUBLIC_SUPABASE_ANON_KEY")}`,
          apikey: requiredEnvironment("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
          "Content-Type": "application/json",
          "x-rsvp-reminder-secret": requiredEnvironment("RSVP_REMINDER_SECRET"),
        },
        body: JSON.stringify({
          mode: "reminders",
          limit: 1,
          guestId: guest.id,
        }),
      },
    );
    expect(reminderResponse.ok).toBe(true);
    expect(await reminderResponse.json()).toMatchObject({
      success: true,
      processed: 1,
      sent: 1,
      failed: 0,
    });
    const { data: remindedGuest } = await service
      .from("event_guests")
      .select("rsvp_reminder_sent_at,rsvp_delivery_error")
      .eq("id", guest.id)
      .single();
    expect(remindedGuest?.rsvp_reminder_sent_at).toBeTruthy();
    expect(remindedGuest?.rsvp_delivery_error).toBeNull();

    const anonymousContext = await browser.newContext();
    const anonymousPage = await anonymousContext.newPage();
    await anonymousPage.goto(`/rsvp/${guest.rsvp_token}`);
    await expect(
      anonymousPage.getByRole("heading", {
        name: `Hello, ${firstName} Primary`,
      }),
    ).toBeVisible();
    await anonymousPage.getByLabel("Attending").check();
    await anonymousPage.getByLabel("Plus-ones attending").selectOption("1");
    await anonymousPage.getByRole("button", { name: "Save RSVP" }).click();
    await expect(
      anonymousPage.getByText("Your RSVP response has been saved."),
    ).toBeVisible();

    const { data: response } = await service
      .from("event_guests")
      .select("rsvp_status,plus_ones_attending,rsvp_responded_at")
      .eq("id", guest.id)
      .single();
    expect(response).toMatchObject({
      rsvp_status: "attending",
      plus_ones_attending: 1,
    });
    expect(response?.rsvp_responded_at).toBeTruthy();

    page.once("dialog", (confirmation) => confirmation.accept());
    await guestArticle.getByRole("button", { name: "Revoke" }).click();
    await expect(
      guestArticle.getByRole("button", { name: "Create RSVP" }),
    ).toBeVisible();
    await anonymousPage.reload();
    await expect(
      anonymousPage.getByRole("heading", { name: "Invitation unavailable" }),
    ).toBeVisible();
    await anonymousContext.close();

    await page.getByPlaceholder("Search guest or group").fill("");
    for (const fullName of [
      `${firstName} Primary`,
      `${importedFirstName} Imported`,
    ]) {
      const article = page.getByRole("article").filter({ hasText: fullName });
      page.once("dialog", (confirmation) => confirmation.accept());
      await article.getByRole("button", { name: "Delete" }).click();
      await expect(page.getByRole("heading", { name: fullName })).toHaveCount(
        0,
      );
    }
  });

  test("seating planner enforces capacity through the live UI", async ({
    page,
  }) => {
    const guestName = `${runId}Seat`;
    const tableName = `${runId}Table`;
    const { data: guest, error: guestError } = await service
      .from("event_guests")
      .insert({
        user_id: customerId,
        first_name: guestName,
        last_name: "Guest",
      })
      .select("id")
      .single();
    if (guestError || !guest) throw guestError;

    await loginAs(page, "customer");
    await page.goto("/account/seating");
    await expect(
      page.getByRole("heading", { name: "Seating planner" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Add table" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Table name").fill(tableName);
    await dialog.getByLabel("Capacity").fill("1");
    await dialog.getByRole("button", { name: "Save table" }).click();

    const table = page
      .getByRole("region")
      .filter({ has: page.getByRole("heading", { name: tableName }) });
    await table
      .getByLabel("Assign an unseated guest")
      .selectOption({ label: `${guestName} Guest` });
    await expect(table.getByText(`${guestName} Guest`)).toBeVisible();
    await expect(table.getByLabel("Assign an unseated guest")).toBeDisabled();
    await expect(table.getByText("1 of 1 seats filled")).toBeVisible();

    page.once("dialog", (confirmation) => confirmation.accept());
    await table.getByRole("button", { name: `Delete ${tableName}` }).click();
    await expect(page.getByRole("heading", { name: tableName })).toHaveCount(0);
    await service.from("event_guests").delete().eq("id", guest.id);
  });

  test("timeline scheduling, owners, filters, and dependencies work", async ({
    page,
  }) => {
    const firstTask = `${runId}TimelineA`;
    const secondTask = `${runId}TimelineB`;

    await loginAs(page, "customer");
    await page.goto("/account/timeline");
    await expect(
      page.getByRole("heading", { name: "Event timeline" }),
    ).toBeVisible();
    await fillPlanningTask(page, firstTask);
    await fillPlanningTask(page, secondTask, firstTask);
    await expect(
      page.getByText(`Depends on: ${firstTask} (To do)`),
    ).toBeVisible();

    await page.getByLabel("Filter timeline status").selectOption("completed");
    await expect(page.getByRole("heading", { name: firstTask })).toHaveCount(0);
    await page.getByLabel("Filter timeline status").selectOption("all");

    await page.getByRole("button", { name: `Edit ${firstTask}` }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Status").selectOption("completed");
    await dialog.getByRole("button", { name: "Save task" }).click();
    await expect(
      page
        .getByRole("listitem")
        .filter({ hasText: firstTask })
        .getByText("Completed"),
    ).toBeVisible();

    for (const title of [secondTask, firstTask]) {
      page.once("dialog", (confirmation) => confirmation.accept());
      await page.getByRole("button", { name: `Delete ${title}` }).click();
      await expect(page.getByRole("heading", { name: title })).toHaveCount(0);
    }
  });

  test("AI planner, budget advisor, and supplier matcher use hosted data", async ({
    page,
  }) => {
    const { data: supplier, error: supplierError } = await service
      .from("supplier_profiles")
      .select("business_name,slug")
      .eq("accreditation_status", "accredited")
      .limit(1)
      .single();
    if (supplierError || !supplier) {
      throw (
        supplierError ??
        new Error("Staging needs one accredited supplier for matching.")
      );
    }

    await loginAs(page, "customer");
    await page.goto("/account/event-planner");
    await page.getByLabel("Event type").selectOption("Wedding");
    await page.getByLabel("Guest count").fill("80");
    await page.getByLabel("Total budget (PHP)").fill("300000");
    await page.getByLabel("Preferred city").fill("Tagaytay");
    await page.getByRole("button", { name: "Generate event plan" }).click();
    await expect(
      page.getByRole("heading", { name: "Recommended milestones" }),
    ).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText("Live AI guidance is unavailable")).toHaveCount(
      0,
    );

    await page.goto(`/venues/${venue.slug}`);
    await page.getByRole("button", { name: "Estimate Event Cost" }).click();
    const costDialog = page.getByRole("dialog");
    await costDialog.getByLabel("Guest Count").fill("80");
    await costDialog.getByLabel("Duration (hours)").fill("5");
    await costDialog.getByLabel("Event Type").selectOption("Wedding");
    await costDialog.getByRole("button", { name: "Estimate Cost" }).click();
    await expect(
      costDialog.getByText(`AI Estimate for ${venue.name}`),
    ).toBeVisible({ timeout: 30_000 });
    await expect(costDialog.getByText("Estimated Total")).toBeVisible();

    await page.goto("/suppliers");
    await page
      .getByLabel("Keyword supplier search")
      .fill(String(supplier.business_name));
    await expect(
      page.getByRole("heading", {
        name: String(supplier.business_name),
      }),
    ).toBeVisible();
    await expect(page.getByText("Showing 1 of 1 suppliers")).toBeVisible();
  });

  test("AI Concierge streams and executes only a confirmed action", async ({
    page,
  }) => {
    const booking = await createPendingBooking(service, customerId, venue.id);
    try {
      await loginAs(page, "customer");
      await page.goto("/account");
      await page.getByRole("button", { name: "Open assistant" }).click();
      const input = page.getByPlaceholder(
        "Ask about a venue or your booking...",
      );

      await input.fill("What can you help me plan?");
      await input.press("Enter");
      await expect(input).toBeEnabled({ timeout: 45_000 });

      const { data: conversation, error: conversationError } = await service
        .from("ai_conversations")
        .select("id")
        .eq("user_id", customerId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (conversationError || !conversation) throw conversationError;
      const { data: assistantMessages, error: messagesError } = await service
        .from("ai_messages")
        .select("content")
        .eq("conversation_id", conversation.id)
        .eq("role", "assistant")
        .order("created_at", { ascending: false })
        .limit(1);
      if (messagesError) throw messagesError;
      expect(assistantMessages?.[0]?.content?.trim().length).toBeGreaterThan(0);

      await input.fill(`cancel booking ${booking.id}`);
      await input.press("Enter");
      await expect(
        page.getByRole("button", { name: "Keep booking" }),
      ).toBeVisible({ timeout: 30_000 });
      await page.getByRole("button", { name: "Keep booking" }).click();
      await expect(input).toBeEnabled();

      const { data: rejected } = await service
        .from("ai_action_requests")
        .select("status")
        .eq("user_id", customerId)
        .contains("arguments", { bookingId: booking.id })
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      expect(rejected?.status).toBe("rejected");

      await input.fill(`cancel booking ${booking.id}`);
      await input.press("Enter");
      await expect(
        page.getByRole("button", { name: "Confirm cancellation" }),
      ).toBeVisible({ timeout: 30_000 });
      await page.getByRole("button", { name: "Confirm cancellation" }).click();
      await expect(input).toBeEnabled({ timeout: 30_000 });

      const { data: cancelledBooking } = await service
        .from("bookings")
        .select("status")
        .eq("id", booking.id)
        .single();
      expect(cancelledBooking?.status).toBe("cancelled");

      const { data: executed } = await service
        .from("ai_action_requests")
        .select("status,confirmed_at,executed_at")
        .eq("user_id", customerId)
        .contains("arguments", { bookingId: booking.id })
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      expect(executed?.status).toBe("executed");
      expect(executed?.confirmed_at).toBeTruthy();
      expect(executed?.executed_at).toBeTruthy();
    } finally {
      await cleanupBooking(service, booking.id, venue.id, booking.eventDate);
    }
  });
});
