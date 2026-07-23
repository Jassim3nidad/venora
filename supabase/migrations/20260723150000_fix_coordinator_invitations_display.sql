-- Allow users with a pending invitation to view the organization name.
CREATE POLICY "organizations.select.pending_invite"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_member_invitations inv
      WHERE inv.organization_id = organizations.id
        AND inv.email = public.current_auth_email()
        AND inv.status = 'pending'
        AND inv.expires_at >= now()
    )
  );
