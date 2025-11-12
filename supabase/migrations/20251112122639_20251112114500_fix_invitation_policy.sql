/*
  # Fix Invitation Policy

  Simplifies the invitation creation policy to allow all authenticated users
  to send invitations, not just those with patients.
*/

-- Drop the old policy
DROP POLICY IF EXISTS "Users can create invitations for their patients" ON public.invitations;

-- Create a simplified policy that allows all authenticated users to create invitations
CREATE POLICY "Authenticated users can create invitations"
  ON public.invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (inviter_id = (select auth.uid()));