-- ============================================================
-- Migration 017 — Partner Applications & Verification Storage
-- ============================================================

-- 1. Create Application Status Enum
CREATE TYPE public.application_status AS ENUM (
  'pending',
  'approved',
  'denied'
);

-- 2. Create the Table
CREATE TABLE public.partner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_applied_for public.user_role NOT NULL,
  status public.application_status NOT NULL DEFAULT 'pending',
  category text NOT NULL,
  address_country text,
  address_unit text,
  address_building text,
  address_street text,
  address_district text,
  address_city text,
  address_zip text,
  documents_json jsonb DEFAULT '[]'::jsonb,
  denial_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Add Updated At Trigger
CREATE TRIGGER partner_applications_updated_at
  BEFORE UPDATE ON public.partner_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Enable Row Level Security
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for partner_applications
CREATE POLICY "Users can insert their own applications"
ON public.partner_applications FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own applications"
ON public.partner_applications FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all applications"
ON public.partner_applications FOR SELECT TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can update applications"
ON public.partner_applications FOR UPDATE TO authenticated
USING (public.is_admin());

-- 6. Setup Storage Bucket for Verification Documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('verification-documents', 'verification-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 7. RLS Policies for the verification-documents bucket
CREATE POLICY "Users can upload their own verification documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'verification-documents' AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own verification documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'verification-documents' AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins can view all verification documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'verification-documents' AND public.is_admin()
);
