-- ============================================================
-- Migration 019 - Booking confirmed status
-- ============================================================

ALTER TYPE public.booking_status
  ADD VALUE IF NOT EXISTS 'confirmed';
