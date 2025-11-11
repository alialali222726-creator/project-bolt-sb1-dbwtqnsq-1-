/*
  # Add Profile Image and Country Fields

  1. Changes to profiles table
    - Add `avatar_url` column for profile image URL
    - Add `country_code` column for country selection (e.g., 'SA', 'US', 'AE')
    - Add `phone_country_code` column for phone prefix (e.g., '+966', '+1')
    
  2. Notes
    - All new columns are nullable to maintain compatibility with existing data
    - avatar_url will store Supabase Storage URLs
    - country_code uses ISO 3166-1 alpha-2 standard
*/

-- Add new columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN avatar_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'country_code'
  ) THEN
    ALTER TABLE profiles ADD COLUMN country_code text DEFAULT 'SA';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone_country_code'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_country_code text DEFAULT '+966';
  END IF;
END $$;
