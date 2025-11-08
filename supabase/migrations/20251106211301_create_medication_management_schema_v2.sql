/*
  # Medication Management System Schema

  ## Overview
  This migration creates the complete database schema for a medication management system
  that supports Arabic/English bilingual interface with role-based access control.

  ## New Tables

  ### 1. profiles
  - `id` (uuid, FK to auth.users) - User identifier
  - `full_name` (text) - User's full name
  - `role` (text) - User role: 'doctor', 'primary_caregiver', 'backup_caregiver'
  - `language_preference` (text) - 'ar' or 'en'
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ### 2. patients
  - `id` (uuid, PK) - Patient unique identifier
  - `name` (text) - Patient's name
  - `date_of_birth` (date) - Patient's birth date
  - `medical_notes` (text) - General medical notes
  - `created_by` (uuid, FK to profiles) - Creator user ID
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ### 3. patient_team
  - `id` (uuid, PK) - Team member record identifier
  - `patient_id` (uuid, FK to patients) - Associated patient
  - `user_id` (uuid, FK to profiles) - Team member user ID
  - `role` (text) - Role in team: 'doctor', 'primary_caregiver', 'backup_caregiver'
  - `assigned_at` (timestamptz) - When user was assigned to patient
  - `assigned_by` (uuid, FK to profiles) - Who assigned this team member

  ### 4. medications
  - `id` (uuid, PK) - Medication record identifier
  - `patient_id` (uuid, FK to patients) - Patient receiving medication
  - `name` (text) - Medication name
  - `dosage` (text) - Dosage amount (e.g., "500mg")
  - `frequency_per_day` (integer) - Number of doses per day
  - `minimum_interval_hours` (numeric) - Minimum hours between doses
  - `instructions` (text) - Additional instructions
  - `is_active` (boolean) - Whether medication is currently active
  - `prescribed_by` (uuid, FK to profiles) - Prescribing doctor
  - `prescribed_at` (timestamptz) - When medication was prescribed
  - `last_dose_at` (timestamptz) - Timestamp of last confirmed dose
  - `next_dose_due_at` (timestamptz) - Calculated next dose time

  ### 5. dose_logs
  - `id` (uuid, PK) - Dose log identifier
  - `medication_id` (uuid, FK to medications) - Related medication
  - `patient_id` (uuid, FK to patients) - Patient who received dose
  - `administered_at` (timestamptz) - When dose was given
  - `administered_by` (uuid, FK to profiles) - Who administered/confirmed the dose
  - `notes` (text) - Any notes about this dose
  - `was_on_time` (boolean) - Whether dose was given within expected window

  ### 6. adherence_scores
  - `id` (uuid, PK) - Score record identifier
  - `patient_id` (uuid, FK to patients) - Patient being scored
  - `period_start` (date) - Start of measurement period
  - `period_end` (date) - End of measurement period
  - `total_expected_doses` (integer) - Expected doses in period
  - `total_confirmed_doses` (integer) - Confirmed doses in period
  - `on_time_doses` (integer) - Doses given on time
  - `adherence_percentage` (numeric) - Calculated adherence score (0-100)
  - `calculated_at` (timestamptz) - When score was calculated

  ## Security
  - Enable RLS on all tables
  - Doctors can view/manage all patients in their team
  - Caregivers can view/manage only their assigned patients
  - Users can only update their own profiles
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('doctor', 'primary_caregiver', 'backup_caregiver')),
  language_preference text NOT NULL DEFAULT 'ar' CHECK (language_preference IN ('ar', 'en')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  date_of_birth date,
  medical_notes text DEFAULT '',
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Create patient_team table
CREATE TABLE IF NOT EXISTS patient_team (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('doctor', 'primary_caregiver', 'backup_caregiver')),
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES profiles(id) NOT NULL,
  UNIQUE(patient_id, user_id, role)
);

ALTER TABLE patient_team ENABLE ROW LEVEL SECURITY;

-- Create medications table
CREATE TABLE IF NOT EXISTS medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  dosage text NOT NULL,
  frequency_per_day integer NOT NULL CHECK (frequency_per_day > 0),
  minimum_interval_hours numeric NOT NULL CHECK (minimum_interval_hours > 0),
  instructions text DEFAULT '',
  is_active boolean DEFAULT true,
  prescribed_by uuid REFERENCES profiles(id) NOT NULL,
  prescribed_at timestamptz DEFAULT now(),
  last_dose_at timestamptz,
  next_dose_due_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

-- Create dose_logs table
CREATE TABLE IF NOT EXISTS dose_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id uuid REFERENCES medications(id) ON DELETE CASCADE NOT NULL,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  administered_at timestamptz DEFAULT now(),
  administered_by uuid REFERENCES profiles(id) NOT NULL,
  notes text DEFAULT '',
  was_on_time boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dose_logs ENABLE ROW LEVEL SECURITY;

-- Create adherence_scores table
CREATE TABLE IF NOT EXISTS adherence_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_expected_doses integer DEFAULT 0,
  total_confirmed_doses integer DEFAULT 0,
  on_time_doses integer DEFAULT 0,
  adherence_percentage numeric DEFAULT 0 CHECK (adherence_percentage >= 0 AND adherence_percentage <= 100),
  calculated_at timestamptz DEFAULT now(),
  UNIQUE(patient_id, period_start, period_end)
);

ALTER TABLE adherence_scores ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Patients policies
CREATE POLICY "Team members can view their patients"
  ON patients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patient_team
      WHERE patient_team.patient_id = patients.id
      AND patient_team.user_id = auth.uid()
    )
  );

CREATE POLICY "Doctors can create patients"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'doctor'
    )
  );

CREATE POLICY "Doctors can update their patients"
  ON patients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patient_team
      WHERE patient_team.patient_id = patients.id
      AND patient_team.user_id = auth.uid()
      AND patient_team.role = 'doctor'
    )
  );

-- Patient team policies
CREATE POLICY "Team members can view team"
  ON patient_team FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM patient_team pt
      WHERE pt.patient_id = patient_team.patient_id
      AND pt.user_id = auth.uid()
    )
  );

CREATE POLICY "Doctors can insert team members"
  ON patient_team FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'doctor'
    )
  );

CREATE POLICY "Doctors can update team members"
  ON patient_team FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patient_team pt
      WHERE pt.patient_id = patient_team.patient_id
      AND pt.user_id = auth.uid()
      AND pt.role = 'doctor'
    )
  );

CREATE POLICY "Doctors can delete team members"
  ON patient_team FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patient_team pt
      WHERE pt.patient_id = patient_team.patient_id
      AND pt.user_id = auth.uid()
      AND pt.role = 'doctor'
    )
  );

-- Medications policies
CREATE POLICY "Team members can view medications"
  ON medications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patient_team
      WHERE patient_team.patient_id = medications.patient_id
      AND patient_team.user_id = auth.uid()
    )
  );

CREATE POLICY "Doctors can insert medications"
  ON medications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'doctor'
    )
  );

CREATE POLICY "Doctors can update medications"
  ON medications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patient_team
      WHERE patient_team.patient_id = medications.patient_id
      AND patient_team.user_id = auth.uid()
      AND patient_team.role = 'doctor'
    )
  );

CREATE POLICY "Doctors can delete medications"
  ON medications FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patient_team
      WHERE patient_team.patient_id = medications.patient_id
      AND patient_team.user_id = auth.uid()
      AND patient_team.role = 'doctor'
    )
  );

-- Dose logs policies
CREATE POLICY "Team members can view dose logs"
  ON dose_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patient_team
      WHERE patient_team.patient_id = dose_logs.patient_id
      AND patient_team.user_id = auth.uid()
    )
  );

CREATE POLICY "Caregivers can log doses"
  ON dose_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patient_team
      WHERE patient_team.patient_id = dose_logs.patient_id
      AND patient_team.user_id = auth.uid()
    ) AND administered_by = auth.uid()
  );

-- Adherence scores policies
CREATE POLICY "Team members can view adherence scores"
  ON adherence_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patient_team
      WHERE patient_team.patient_id = adherence_scores.patient_id
      AND patient_team.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patient_team_patient ON patient_team(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_team_user ON patient_team(user_id);
CREATE INDEX IF NOT EXISTS idx_medications_patient ON medications(patient_id);
CREATE INDEX IF NOT EXISTS idx_medications_active ON medications(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_dose_logs_medication ON dose_logs(medication_id);
CREATE INDEX IF NOT EXISTS idx_dose_logs_patient ON dose_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_dose_logs_administered_at ON dose_logs(administered_at);
CREATE INDEX IF NOT EXISTS idx_adherence_patient ON adherence_scores(patient_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_patients_updated_at ON patients;
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_medications_updated_at ON medications;
CREATE TRIGGER update_medications_updated_at BEFORE UPDATE ON medications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();