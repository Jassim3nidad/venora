-- ============================================================
-- Migration 020 - Booking reviewed status
-- ============================================================

ALTER TYPE public.booking_status
  ADD VALUE IF NOT EXISTS 'reviewed';
