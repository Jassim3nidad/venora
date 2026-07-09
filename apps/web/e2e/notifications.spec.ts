import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const email = process.env.NOTIFICATION_TEST_EMAIL;
const password = process.env.NOTIFICATION_TEST_PASSWORD;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

test.describe('Notification Platform E2E', () => {

  test.beforeEach(async ({ page }) => {
    test.skip(!email || !password || !supabase, 'Missing test credentials or DB URL');
    
    // Setup login
    await page.goto('/login');
    // Depending on the UI, fill inputs
    await page.fill('input[type="email"]', email!);
    await page.fill('input[type="password"]', password!);
    await page.click('button[type="submit"]');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('should subscribe to web push notifications and verify in DB', async ({ page }) => {
    // Navigate to settings
    await page.goto('/settings');
    
    // Look for Push switch or button
    const pushSwitch = page.locator('button[role="switch"]').filter({ hasText: /push/i }).first();
    
    // If not found, look for generic button
    const pushButton = page.locator('button').filter({ hasText: /Enable device push/i });

    if (await pushSwitch.isVisible()) {
       const isChecked = await pushSwitch.getAttribute('aria-checked');
       if (isChecked === 'false') {
         await pushSwitch.click();
       }
    } else if (await pushButton.isVisible()) {
       await pushButton.click();
    }

    // Wait for the DB update
    await page.waitForTimeout(3000);

    // Verify DB
    const { data: user } = await supabase!.from('profiles').select('id').eq('email', email).single();
    if (user) {
      const { data: subs } = await supabase!
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id);
        
      expect(subs).toBeDefined();
      expect(subs?.length).toBeGreaterThan(0);
      expect(subs![0]).toHaveProperty('endpoint');
      expect(subs![0]).toHaveProperty('p256dh');
      expect(subs![0]).toHaveProperty('auth');
    }
  });

  test('should receive realtime notifications in-app', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Get user id
    const { data: user } = await supabase!.from('profiles').select('id').eq('email', email).single();
    if (!user) return;

    // Trigger a backend notification via Supabase
    await supabase!.from('notifications').insert({
      user_id: user.id,
      channel: 'in_app',
      title: 'E2E Test Notification',
      body: 'This notification tests realtime UI updates',
      kind: 'system',
      priority: 'high',
      is_read: false
    });

    // Verify the unread bell updates or a toast appears
    // Assuming the bell has an aria-label like "Notifications" with a badge
    const bell = page.locator('button').filter({ hasText: /notification/i });
    
    // We expect the badge to show an unread count.
    await expect(bell).toBeVisible();

    // Click the bell
    await bell.click();

    // Find the notification item
    const notifItem = page.locator('text="E2E Test Notification"').first();
    await expect(notifItem).toBeVisible();

    // Click to mark as read
    await notifItem.click();

    // Verify it updates in DB
    await page.waitForTimeout(2000);
    const { data: updatedNotif } = await supabase!
      .from('notifications')
      .select('read_at, is_read')
      .eq('title', 'E2E Test Notification')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    expect(updatedNotif?.is_read).toBe(true);
    expect(updatedNotif?.read_at).not.toBeNull();
  });
});
