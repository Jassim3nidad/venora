-- ============================================================
-- Migration 001 — PostgreSQL Extensions
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Vector similarity search (AI semantic search)
CREATE EXTENSION IF NOT EXISTS "vector";

-- Full-text trigram search (venue name / city fuzzy match)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Accent-insensitive search
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Cube + earthdistance: enables ll_to_earth() GiST index on venues
CREATE EXTENSION IF NOT EXISTS "cube";
CREATE EXTENSION IF NOT EXISTS "earthdistance";

-- Scheduled jobs (analytics refresh, auto-complete bookings)
CREATE EXTENSION IF NOT EXISTS "pg_cron";
