-- ============================================================
-- Migration 035 — Profile setup tracking & preferences
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_setup_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.profile_setup_completed_at IS
  'When the user completed or skipped the post-registration profile setup flow.';
COMMENT ON COLUMN public.profiles.preferences IS
  'Customer notification and browsing preferences set during profile setup.';

-- Existing accounts should not be forced through setup.
UPDATE public.profiles
SET profile_setup_completed_at = COALESCE(updated_at, created_at, now())
WHERE profile_setup_completed_at IS NULL;
