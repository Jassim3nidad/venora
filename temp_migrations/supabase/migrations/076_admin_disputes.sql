-- 076_admin_disputes.sql

-- Add new dispute permissions
INSERT INTO public.admin_permissions (key, description) VALUES
  ('disputes.view',      'View platform disputes and their evidence'),
  ('disputes.manage',    'Manage and update dispute status and notes'),
  ('disputes.resolve',   'Formally resolve or reject disputes')
ON CONFLICT (key) DO NOTHING;

-- Assign permissions to roles based on existing conventions from 054
INSERT INTO public.admin_role_permissions (role_name, permission_key) VALUES
  ('admin', 'disputes.view'),
  ('admin', 'disputes.manage'),
  ('admin', 'disputes.resolve'),
  
  ('finance_admin', 'disputes.view'),
  ('finance_admin', 'disputes.manage'),
  ('finance_admin', 'disputes.resolve'),
  
  ('operations_admin', 'disputes.view'),
  ('operations_admin', 'disputes.manage'),
  
  ('compliance_admin', 'disputes.view'),
  
  ('analyst', 'disputes.view')
ON CONFLICT (role_name, permission_key) DO NOTHING;

-- Dispute Status Enum
CREATE TYPE public.dispute_status AS ENUM ('open', 'under_review', 'resolved', 'rejected', 'cancelled');
CREATE TYPE public.dispute_category AS ENUM ('refund_request', 'service_not_rendered', 'damage_claim', 'other');

CREATE TABLE public.disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    raised_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    status public.dispute_status NOT NULL DEFAULT 'open',
    category public.dispute_category NOT NULL DEFAULT 'other',
    reason TEXT NOT NULL,
    evidence_urls TEXT[] DEFAULT '{}',
    resolution_notes TEXT,
    
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Duplicate control: Only one active dispute per booking and category
CREATE UNIQUE INDEX idx_disputes_single_active ON public.disputes(booking_id, category) 
WHERE status IN ('open', 'under_review');

-- Indexes for efficient querying
CREATE INDEX idx_disputes_booking ON public.disputes(booking_id);
CREATE INDEX idx_disputes_venue ON public.disputes(venue_id);
CREATE INDEX idx_disputes_org ON public.disputes(organization_id);
CREATE INDEX idx_disputes_raised_by ON public.disputes(raised_by);
CREATE INDEX idx_disputes_status ON public.disputes(status);
CREATE INDEX idx_disputes_transaction ON public.disputes(transaction_id);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- RLS: Read Policies
CREATE POLICY "Admins can view disputes" ON public.disputes
    FOR SELECT TO authenticated USING (public.has_admin_permission('disputes.view'));

CREATE POLICY "Customers can view own disputes" ON public.disputes
    FOR SELECT TO authenticated USING (raised_by = auth.uid());

CREATE POLICY "Org members can view disputes" ON public.disputes
    FOR SELECT TO authenticated USING (public.is_org_member(organization_id));

-- RLS: Insert Policies
CREATE POLICY "Customers can create disputes for their bookings" ON public.disputes
    FOR INSERT TO authenticated WITH CHECK (
        raised_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = booking_id AND b.customer_id = auth.uid()
        )
    );

-- RLS: Update/Delete (Blocked for direct mutation, handled by RPC)
CREATE POLICY "Deny direct updates" ON public.disputes
    FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny direct deletes" ON public.disputes
    FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_disputes_updated_at
    BEFORE UPDATE ON public.disputes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.disputes IS 'Admin dispute resolution records, linking bookings and transactions.';

-- RPC for managing dispute state transitions
CREATE OR REPLACE FUNCTION public.update_dispute_status(
  p_dispute_id UUID,
  p_new_status public.dispute_status,
  p_resolution_notes TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status public.dispute_status;
  v_booking_id UUID;
  v_raised_by UUID;
BEGIN
  -- Authorization checks
  IF p_new_status IN ('resolved', 'rejected') THEN
    IF NOT public.has_admin_permission('disputes.resolve') THEN
      RAISE EXCEPTION 'Unauthorized: Requires disputes.resolve permission';
    END IF;
  ELSIF p_new_status = 'under_review' THEN
    IF NOT public.has_admin_permission('disputes.manage') THEN
      RAISE EXCEPTION 'Unauthorized: Requires disputes.manage permission';
    END IF;
  ELSIF p_new_status = 'cancelled' THEN
    SELECT raised_by INTO v_raised_by FROM public.disputes WHERE id = p_dispute_id;
    IF v_raised_by != auth.uid() AND NOT public.has_admin_permission('disputes.manage') THEN
      RAISE EXCEPTION 'Unauthorized: Only the creator or manager can cancel a dispute';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid target status requested';
  END IF;

  SELECT status, booking_id INTO v_old_status, v_booking_id 
  FROM public.disputes WHERE id = p_dispute_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dispute not found';
  END IF;

  -- Validate Transitions
  IF v_old_status IN ('resolved', 'rejected', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot update a closed dispute';
  END IF;

  IF p_new_status = 'open' THEN
    RAISE EXCEPTION 'Cannot transition back to open';
  END IF;

  IF p_new_status IN ('resolved', 'rejected') AND v_old_status != 'under_review' THEN
    RAISE EXCEPTION 'Dispute must be under_review before it can be closed';
  END IF;

  -- Perform the update
  UPDATE public.disputes
  SET status = p_new_status,
      resolution_notes = COALESCE(p_resolution_notes, resolution_notes),
      resolved_at = CASE WHEN p_new_status IN ('resolved', 'rejected') THEN now() ELSE resolved_at END,
      resolved_by = CASE WHEN p_new_status IN ('resolved', 'rejected') THEN auth.uid() ELSE resolved_by END
  WHERE id = p_dispute_id;

  -- Audit Integration
  PERFORM public.log_admin_audit(
    'update_dispute_status',
    'dispute',
    p_dispute_id,
    COALESCE(p_resolution_notes, 'Status transition: ' || v_old_status || ' -> ' || p_new_status),
    jsonb_build_object('status', v_old_status, 'booking_id', v_booking_id),
    jsonb_build_object('status', p_new_status, 'resolution_notes', p_resolution_notes)
  );
END;
$$;
