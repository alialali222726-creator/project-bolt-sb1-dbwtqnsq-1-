/*
  # Create Storage Bucket for Profile Images

  1. Storage
    - Create 'profiles' bucket for storing user avatars
    - Set bucket to public for easy access to profile images
    
  2. Security
    - Enable RLS on storage objects
    - Users can upload their own profile images
    - Everyone can view profile images (public bucket)
*/

-- Create storage bucket for profiles
INSERT INTO storage.buckets (id, name, public)
VALUES ('profiles', 'profiles', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload to profiles bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload own profile image'
  ) THEN
    CREATE POLICY "Users can upload own profile image"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'profiles');
  END IF;
END $$;

-- Policy: Users can update profiles bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update own profile image'
  ) THEN
    CREATE POLICY "Users can update own profile image"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'profiles');
  END IF;
END $$;

-- Policy: Everyone can view profile images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public can view profile images'
  ) THEN
    CREATE POLICY "Public can view profile images"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'profiles');
  END IF;
END $$;

-- Policy: Users can delete from profiles bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete own profile image'
  ) THEN
    CREATE POLICY "Users can delete own profile image"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'profiles');
  END IF;
END $$;
