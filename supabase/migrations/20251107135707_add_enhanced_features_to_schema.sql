/*
  # Enhanced Roles, Permissions, and Features

  ## Overview
  Add support for expanded caregiver permissions, dose notes, image uploads,
  and patient role with read-only access.

  ## New Tables

  ### 1. dose_note_types (Enum-like table)
  - `id` (uuid, PK) - Identifier
  - `name` (text) - Type name: 'vomit', 'delayed', 'refused', 'notes'
  - `display_name_ar` (text) - Arabic display name
  - `display_name_en` (text) - English display name

  ### 2. dose_notes
  - `id` (uuid, PK) - Note identifier
  - `dose_log_id` (uuid, FK to dose_logs) - Related dose
  - `note_type` (text) - Type: vomit, delayed, refused, or notes
  - `content` (text) - Note content
  - `created_by` (uuid, FK to profiles) - Note creator
  - `created_at` (timestamptz) - When note was created

  ### 3. dose_images
  - `id` (uuid, PK) - Image identifier
  - `dose_log_id` (uuid, FK to dose_logs) - Related dose
  - `image_path` (text) - Path in Supabase Storage
  - `uploaded_by` (uuid, FK to profiles) - Who uploaded
  - `uploaded_at` (timestamptz) - When uploaded

  ## Modified Tables

  ### 1. profiles
  - Added `phone` (text) - For notifications
  - Added `is_active` (boolean) - Account status

  ### 2. dose_logs
  - Added `status` (text) - 'pending', 'confirmed', 'missed'
  - Added `reminder_sent` (boolean) - Whether reminder was sent

  ## Security Changes
  - Caregivers now have full medication management permissions
  - Patient role can only view their own schedule
  - Enhanced RLS policies for notes and images
*/

-- Add columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

-- Add columns to dose_logs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dose_logs' AND column_name = 'status'
  ) THEN
    ALTER TABLE dose_logs ADD COLUMN status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'missed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dose_logs' AND column_name = 'reminder_sent'
  ) THEN
    ALTER TABLE dose_logs ADD COLUMN reminder_sent boolean DEFAULT false;
  END IF;
END $$;

-- Create dose_note_types table
CREATE TABLE IF NOT EXISTS dose_note_types (
  id text PRIMARY KEY,
  display_name_ar text NOT NULL,
  display_name_en text NOT NULL
);

INSERT INTO dose_note_types (id, display_name_ar, display_name_en)
VALUES
  ('vomit', 'تقيء', 'Vomiting'),
  ('delayed', 'تأجيل', 'Delayed'),
  ('refused', 'رفض', 'Refused'),
  ('notes', 'ملاحظات', 'Notes')
ON CONFLICT (id) DO NOTHING;

-- Create dose_notes table
CREATE TABLE IF NOT EXISTS dose_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dose_log_id uuid REFERENCES dose_logs(id) ON DELETE CASCADE NOT NULL,
  note_type text REFERENCES dose_note_types(id) NOT NULL,
  content text,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dose_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view notes"
  ON dose_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dose_logs dl
      JOIN patient_team pt ON dl.patient_id = pt.patient_id
      WHERE dl.id = dose_notes.dose_log_id
      AND pt.user_id = auth.uid()
    )
  );

CREATE POLICY "Caregivers can create notes"
  ON dose_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM dose_logs dl
      JOIN patient_team pt ON dl.patient_id = pt.patient_id
      WHERE dl.id = dose_notes.dose_log_id
      AND pt.user_id = auth.uid()
      AND pt.role IN ('primary_caregiver', 'backup_caregiver', 'doctor')
    )
  );

-- Create dose_images table
CREATE TABLE IF NOT EXISTS dose_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dose_log_id uuid REFERENCES dose_logs(id) ON DELETE CASCADE NOT NULL,
  image_path text NOT NULL,
  uploaded_by uuid REFERENCES profiles(id) NOT NULL,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE dose_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view images"
  ON dose_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dose_logs dl
      JOIN patient_team pt ON dl.patient_id = pt.patient_id
      WHERE dl.id = dose_images.dose_log_id
      AND pt.user_id = auth.uid()
    )
  );

CREATE POLICY "Caregivers can upload images"
  ON dose_images FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM dose_logs dl
      JOIN patient_team pt ON dl.patient_id = pt.patient_id
      WHERE dl.id = dose_images.dose_log_id
      AND pt.user_id = auth.uid()
      AND pt.role IN ('primary_caregiver', 'backup_caregiver', 'doctor')
    )
  );

-- Update RLS policies for enhanced caregiver permissions
DROP POLICY IF EXISTS "Doctors can insert team members" ON patient_team;
DROP POLICY IF EXISTS "Doctors can update team members" ON patient_team;
DROP POLICY IF EXISTS "Doctors can delete team members" ON patient_team;

CREATE POLICY "Doctors can manage team members"
  ON patient_team FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patient_team pt
      WHERE pt.patient_id = patient_team.patient_id
      AND pt.user_id = auth.uid()
      AND pt.role = 'doctor'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'doctor'
    )
  );

-- Drop old medication policies and create enhanced ones
DROP POLICY IF EXISTS "Doctors can insert medications" ON medications;
DROP POLICY IF EXISTS "Doctors can update medications" ON medications;
DROP POLICY IF EXISTS "Doctors can delete medications" ON medications;

CREATE POLICY "Doctors and caregivers can insert medications"
  ON medications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('doctor', 'primary_caregiver', 'backup_caregiver')
    )
  );

CREATE POLICY "Team members can manage medications"
  ON medications FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patient_team
      WHERE patient_team.patient_id = medications.patient_id
      AND patient_team.user_id = auth.uid()
      AND patient_team.role IN ('doctor', 'primary_caregiver', 'backup_caregiver')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('doctor', 'primary_caregiver', 'backup_caregiver')
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dose_notes_dose_log ON dose_notes(dose_log_id);
CREATE INDEX IF NOT EXISTS idx_dose_notes_created_by ON dose_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_dose_images_dose_log ON dose_images(dose_log_id);
CREATE INDEX IF NOT EXISTS idx_dose_images_uploaded_by ON dose_images(uploaded_by);