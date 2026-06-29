-- ============================================================
-- Migration 002 — Enums (Complete Unified Set)
-- ============================================================

-- ── Identity & Access ────────────────────────────────────────

CREATE TYPE public.user_role AS ENUM (
  'customer',
  'venue_owner',
  'event_coordinator',
  'supplier',
  'admin'
);

CREATE TYPE public.org_member_role AS ENUM (
  'owner',
  'coordinator',
  'staff'
);

CREATE TYPE public.account_status AS ENUM (
  'active',
  'pending_verification',
  'suspended',
  'banned'
);

-- ── Venue Domain ─────────────────────────────────────────────

CREATE TYPE public.venue_status AS ENUM (
  'draft',
  'pending_approval',
  'published',
  'suspended',
  'archived'
);

CREATE TYPE public.price_unit AS ENUM (
  'per_event',
  'per_hour',
  'per_pax',
  'per_day'
);

CREATE TYPE public.indoor_outdoor AS ENUM (
  'indoor',
  'outdoor',
  'both'
);

CREATE TYPE public.media_type AS ENUM (
  'image',
  'video'
);

-- ── Calendar & Booking Domain ────────────────────────────────

CREATE TYPE public.availability_status AS ENUM (
  'available',
  'reserved',
  'tentative',
  'maintenance',
  'blackout'
);

CREATE TYPE public.booking_status AS ENUM (
  'pending',
  'approved',
  'declined',
  'cancelled',
  'completed',
  'expired'
);

CREATE TYPE public.inquiry_status AS ENUM (
  'new',
  'responded',
  'closed'
);

-- ── Supplier Domain ──────────────────────────────────────────

CREATE TYPE public.accreditation_status AS ENUM (
  'pending',
  'accredited',
  'rejected',
  'suspended'
);

-- ── Reviews Domain ───────────────────────────────────────────

CREATE TYPE public.review_status AS ENUM (
  'published',
  'flagged',
  'removed'
);

-- ── Payments & Admin ─────────────────────────────────────────

CREATE TYPE public.payment_provider AS ENUM (
  'paymongo',
  'maya',
  'stripe'
);

CREATE TYPE public.transaction_status AS ENUM (
  'pending',
  'paid',
  'failed',
  'refunded',
  'partially_refunded'
);

CREATE TYPE public.verification_type AS ENUM (
  'venue_owner',
  'supplier',
  'venue'
);

CREATE TYPE public.verification_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

-- ── Notifications ────────────────────────────────────────────

CREATE TYPE public.notification_channel AS ENUM (
  'email',
  'sms',
  'push',
  'in_app'
);
