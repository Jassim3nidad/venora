-- Migration to enhance supplier_portfolio_items to support the new builder

ALTER TABLE public.supplier_portfolio_items
  ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'hidden')),
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.supplier_services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS venue_name text;

-- Drop NOT NULL on image_url to allow drafts without a cover photo
ALTER TABLE public.supplier_portfolio_items
  ALTER COLUMN image_url DROP NOT NULL;

-- Drop NOT NULL on title to allow drafts without a title
ALTER TABLE public.supplier_portfolio_items
  ALTER COLUMN title DROP NOT NULL;
