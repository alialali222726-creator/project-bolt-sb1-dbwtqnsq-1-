/*
  # Fix Security and Performance Issues

  This migration addresses all reported security and performance issues:

  1. **Missing Indexes on Foreign Keys**
     - Adds indexes for all foreign key columns to improve query performance

  2. **RLS Policy Performance Optimization**
     - Wraps all auth.uid() calls in (select auth.uid()) to prevent re-evaluation per row

  3. **Enable RLS on Public Tables**
     - Enables RLS on dose_note_types table

  4. **Fix Function Search Path**
     - Sets proper search_path for functions

  5. **Consolidate Duplicate Policies**
     - Removes redundant permissive policies
*/

-- ====================================================================
-- PART 1: Add Missing Indexes on Foreign Keys
-- ====================================================================

-- Connection Requests
CREATE INDEX IF NOT EXISTS idx_connection_requests_patient_id
  ON public.connection_requests(patient_id);

-- Cupping Medication Requests
CREATE INDEX IF NOT EXISTS idx_cupping_medication_requests_cupper_id
  ON public.cupping_medication_requests(cupper_id);
CREATE INDEX IF NOT EXISTS idx_cupping_medication_requests_medication_id
  ON public.cupping_medication_requests(medication_id);

-- Dose Logs
CREATE INDEX IF NOT EXISTS idx_dose_logs_administered_by
  ON public.dose_logs(administered_by);

-- Dose Notes
CREATE INDEX IF NOT EXISTS idx_dose_notes_note_type
  ON public.dose_notes(note_type);

-- Invitations
CREATE INDEX IF NOT EXISTS idx_invitations_invited_user_id
  ON public.invitations(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_inviter_id
  ON public.invitations(inviter_id);

-- Medications
CREATE INDEX IF NOT EXISTS idx_medications_prescribed_by
  ON public.medications(prescribed_by);

-- Patient Team
CREATE INDEX IF NOT EXISTS idx_patient_team_assigned_by
  ON public.patient_team(assigned_by);

-- Patients
CREATE INDEX IF NOT EXISTS idx_patients_created_by
  ON public.patients(created_by);

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_specialization_id
  ON public.profiles(specialization_id);

-- ====================================================================
-- PART 2: Fix RLS Policies for Profiles Table
-- ====================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Recreate with optimized auth.uid() calls
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

-- ====================================================================
-- PART 3: Fix RLS Policies for Patients Table
-- ====================================================================

DROP POLICY IF EXISTS "Team members can view their patients" ON public.patients;
DROP POLICY IF EXISTS "Doctors can create patients" ON public.patients;
DROP POLICY IF EXISTS "Doctors can update their patients" ON public.patients;

CREATE POLICY "Team members can view their patients"
  ON public.patients
  FOR SELECT
  TO authenticated
  USING (
    created_by = (select auth.uid())
    OR id IN (
      SELECT patient_id
      FROM patient_team
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Doctors can create patients"
  ON public.patients
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

CREATE POLICY "Doctors can update their patients"
  ON public.patients
  FOR UPDATE
  TO authenticated
  USING (
    created_by = (select auth.uid())
    OR id IN (
      SELECT patient_id
      FROM patient_team
      WHERE user_id = (select auth.uid()) AND role IN ('doctor', 'primary_caregiver')
    )
  );

-- ====================================================================
-- PART 4: Fix RLS Policies for Patient Team Table
-- ====================================================================

DROP POLICY IF EXISTS "Team members can view team" ON public.patient_team;
DROP POLICY IF EXISTS "Doctors can manage team members" ON public.patient_team;

CREATE POLICY "Team members can view team"
  ON public.patient_team
  FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR patient_id IN (
      SELECT patient_id
      FROM patient_team
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Doctors can manage team members"
  ON public.patient_team
  FOR ALL
  TO authenticated
  USING (
    patient_id IN (
      SELECT patient_id
      FROM patient_team
      WHERE user_id = (select auth.uid()) AND role = 'doctor'
    )
  );

-- ====================================================================
-- PART 5: Fix RLS Policies for Medications Table
-- ====================================================================

-- Remove duplicate policies and consolidate
DROP POLICY IF EXISTS "Team members can view medications" ON public.medications;
DROP POLICY IF EXISTS "Doctors and caregivers can insert medications" ON public.medications;
DROP POLICY IF EXISTS "Team members can manage medications" ON public.medications;

CREATE POLICY "Team members can view and manage medications"
  ON public.medications
  FOR ALL
  TO authenticated
  USING (
    patient_id IN (
      SELECT patient_id
      FROM patient_team
      WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    patient_id IN (
      SELECT patient_id
      FROM patient_team
      WHERE user_id = (select auth.uid()) AND role IN ('doctor', 'primary_caregiver')
    )
  );

-- ====================================================================
-- PART 6: Fix RLS Policies for Connection Requests Table
-- ====================================================================

DROP POLICY IF EXISTS "Users can view their connection requests" ON public.connection_requests;
DROP POLICY IF EXISTS "Users can create connection requests" ON public.connection_requests;
DROP POLICY IF EXISTS "Users can update requests they are part of" ON public.connection_requests;

CREATE POLICY "Users can view their connection requests"
  ON public.connection_requests
  FOR SELECT
  TO authenticated
  USING (
    requester_id = (select auth.uid())
    OR target_id = (select auth.uid())
  );

CREATE POLICY "Users can create connection requests"
  ON public.connection_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = (select auth.uid()));

CREATE POLICY "Users can update requests they are part of"
  ON public.connection_requests
  FOR UPDATE
  TO authenticated
  USING (
    requester_id = (select auth.uid())
    OR target_id = (select auth.uid())
  );

-- ====================================================================
-- PART 7: Fix RLS Policies for Dose Logs Table
-- ====================================================================

DROP POLICY IF EXISTS "Team members can view dose logs" ON public.dose_logs;
DROP POLICY IF EXISTS "Caregivers can log doses" ON public.dose_logs;

CREATE POLICY "Team members can view dose logs"
  ON public.dose_logs
  FOR SELECT
  TO authenticated
  USING (
    patient_id IN (
      SELECT patient_id
      FROM patient_team
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Caregivers can log doses"
  ON public.dose_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    patient_id IN (
      SELECT patient_id
      FROM patient_team
      WHERE user_id = (select auth.uid())
        AND role IN ('primary_caregiver', 'backup_caregiver')
    )
  );

-- ====================================================================
-- PART 8: Fix RLS Policies for Adherence Scores Table
-- ====================================================================

DROP POLICY IF EXISTS "Team members can view adherence scores" ON public.adherence_scores;

CREATE POLICY "Team members can view adherence scores"
  ON public.adherence_scores
  FOR SELECT
  TO authenticated
  USING (
    patient_id IN (
      SELECT patient_id
      FROM patient_team
      WHERE user_id = (select auth.uid())
    )
  );

-- ====================================================================
-- PART 9: Fix RLS Policies for Dose Notes Table
-- ====================================================================

DROP POLICY IF EXISTS "Team members can view notes" ON public.dose_notes;
DROP POLICY IF EXISTS "Caregivers can create notes" ON public.dose_notes;

CREATE POLICY "Team members can view notes"
  ON public.dose_notes
  FOR SELECT
  TO authenticated
  USING (
    dose_log_id IN (
      SELECT id
      FROM dose_logs
      WHERE patient_id IN (
        SELECT patient_id
        FROM patient_team
        WHERE user_id = (select auth.uid())
      )
    )
  );

CREATE POLICY "Caregivers can create notes"
  ON public.dose_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    dose_log_id IN (
      SELECT id
      FROM dose_logs
      WHERE patient_id IN (
        SELECT patient_id
        FROM patient_team
        WHERE user_id = (select auth.uid())
      )
    )
  );

-- ====================================================================
-- PART 10: Fix RLS Policies for Dose Images Table
-- ====================================================================

DROP POLICY IF EXISTS "Team members can view images" ON public.dose_images;
DROP POLICY IF EXISTS "Caregivers can upload images" ON public.dose_images;

CREATE POLICY "Team members can view images"
  ON public.dose_images
  FOR SELECT
  TO authenticated
  USING (
    dose_log_id IN (
      SELECT id
      FROM dose_logs
      WHERE patient_id IN (
        SELECT patient_id
        FROM patient_team
        WHERE user_id = (select auth.uid())
      )
    )
  );

CREATE POLICY "Caregivers can upload images"
  ON public.dose_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    dose_log_id IN (
      SELECT id
      FROM dose_logs
      WHERE patient_id IN (
        SELECT patient_id
        FROM patient_team
        WHERE user_id = (select auth.uid())
      )
    )
  );

-- ====================================================================
-- PART 11: Fix RLS Policies for Chronic Conditions Table
-- ====================================================================

DROP POLICY IF EXISTS "Users can view chronic conditions of their patients" ON public.chronic_conditions;
DROP POLICY IF EXISTS "Users can add chronic conditions for their patients" ON public.chronic_conditions;
DROP POLICY IF EXISTS "Users can update chronic conditions of their patients" ON public.chronic_conditions;
DROP POLICY IF EXISTS "Users can delete chronic conditions of their patients" ON public.chronic_conditions;

CREATE POLICY "Users can view chronic conditions of their patients"
  ON public.chronic_conditions
  FOR SELECT
  TO authenticated
  USING (
    patient_id IN (
      SELECT patient_id
      FROM patient_team
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can add chronic conditions for their patients"
  ON public.chronic_conditions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    patient_id IN (
      SELECT patient_id
      FROM patient_team
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update chronic conditions of their patients"
  ON public.chronic_conditions
  FOR UPDATE
  TO authenticated
  USING (
    patient_id IN (
      SELECT patient_id
      FROM patient_team
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete chronic conditions of their patients"
  ON public.chronic_conditions
  FOR DELETE
  TO authenticated
  USING (
    patient_id IN (
      SELECT patient_id
      FROM patient_team
      WHERE user_id = (select auth.uid())
    )
  );

-- ====================================================================
-- PART 12: Fix RLS Policies for Medication Allergies Table
-- ====================================================================

DROP POLICY IF EXISTS "Users can view allergies of their patients" ON public.medication_allergies;
DROP POLICY IF EXISTS "Users can add allergies for their patients" ON public.medication_allergies;
DROP POLICY IF EXISTS "Users can update allergies of their patients" ON public.medication_allergies;
DROP POLICY IF EXISTS "Users can delete allergies of their patients" ON public.medication_allergies;

CREATE POLICY "Users can view allergies of their patients"
  ON public.medication_allergies
  FOR SELECT
  TO authenticated
  USING (
    patient_id IN (
      SELECT patient_id
      FROM patient_team
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can add allergies for their patients"
  ON public.medication_allergies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    patient_id IN (
      SELECT patient_id
      FROM patient_team
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update allergies of their patients"
  ON public.medication_allergies
  FOR UPDATE
  TO authenticated
  USING (
    patient_id IN (
      SELECT patient_id
      FROM patient_team
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete allergies of their patients"
  ON public.medication_allergies
  FOR DELETE
  TO authenticated
  USING (
    patient_id IN (
      SELECT patient_id
      FROM patient_team
      WHERE user_id = (select auth.uid())
    )
  );

-- ====================================================================
-- PART 13: Fix RLS Policies for QR Codes Table
-- ====================================================================

DROP POLICY IF EXISTS "Users can view their own QR code" ON public.qr_codes;
DROP POLICY IF EXISTS "Users can create their own QR code" ON public.qr_codes;
DROP POLICY IF EXISTS "Users can update their own QR code" ON public.qr_codes;

-- Keep the public policy for scanning
-- Consolidate other policies
CREATE POLICY "Users can manage their own QR code"
  ON public.qr_codes
  FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ====================================================================
-- PART 14: Fix RLS Policies for Invitations Table
-- ====================================================================

DROP POLICY IF EXISTS "Users can view their own invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can create invitations for their patients" ON public.invitations;
DROP POLICY IF EXISTS "Users can update invitations they received" ON public.invitations;

CREATE POLICY "Users can view their own invitations"
  ON public.invitations
  FOR SELECT
  TO authenticated
  USING (
    inviter_id = (select auth.uid())
    OR invited_user_id = (select auth.uid())
  );

CREATE POLICY "Users can create invitations for their patients"
  ON public.invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (inviter_id = (select auth.uid()));

CREATE POLICY "Users can update invitations they received"
  ON public.invitations
  FOR UPDATE
  TO authenticated
  USING (invited_user_id = (select auth.uid()));

-- ====================================================================
-- PART 15: Fix RLS Policies for Cupping Medication Requests Table
-- ====================================================================

-- Remove duplicate policies and consolidate
DROP POLICY IF EXISTS "Cuppers can view their own requests" ON public.cupping_medication_requests;
DROP POLICY IF EXISTS "Doctors can view requests for their patients" ON public.cupping_medication_requests;
DROP POLICY IF EXISTS "Patients can view their cupping requests" ON public.cupping_medication_requests;
DROP POLICY IF EXISTS "Cuppers can create requests" ON public.cupping_medication_requests;
DROP POLICY IF EXISTS "Doctors can update requests for their patients" ON public.cupping_medication_requests;
DROP POLICY IF EXISTS "Cuppers can update their own requests" ON public.cupping_medication_requests;

CREATE POLICY "View cupping requests"
  ON public.cupping_medication_requests
  FOR SELECT
  TO authenticated
  USING (
    cupper_id = (select auth.uid())
    OR doctor_id = (select auth.uid())
    OR patient_id IN (
      SELECT id
      FROM patients
      WHERE created_by = (select auth.uid())
    )
  );

CREATE POLICY "Cuppers can create requests"
  ON public.cupping_medication_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (cupper_id = (select auth.uid()));

CREATE POLICY "Update cupping requests"
  ON public.cupping_medication_requests
  FOR UPDATE
  TO authenticated
  USING (
    cupper_id = (select auth.uid())
    OR doctor_id = (select auth.uid())
  );

-- ====================================================================
-- PART 16: Enable RLS on dose_note_types Table
-- ====================================================================

ALTER TABLE public.dose_note_types ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read dose note types (reference data)
CREATE POLICY "Authenticated users can view dose note types"
  ON public.dose_note_types
  FOR SELECT
  TO authenticated
  USING (true);

-- ====================================================================
-- PART 17: Fix Function Search Paths
-- ====================================================================

-- Fix calculate_age function
CREATE OR REPLACE FUNCTION public.calculate_age(birth_date date)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN date_part('year', age(birth_date));
END;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;