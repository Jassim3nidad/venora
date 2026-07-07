-- ============================================================
-- Migration 018 - Booking payment-pending status
-- ============================================================

ALTER TYPE public.booking_status
  ADD VALUE IF NOT EXISTS 'payment_pending';
