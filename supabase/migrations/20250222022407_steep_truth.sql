/*
  # Add Google OAuth Support

  1. Changes
    - Add provider column to profiles table to track auth method
    - Add avatar_url column for Google profile pictures
    - Update handle_new_user function to handle Google OAuth

  2. Security
    - Maintain existing RLS policies
    - Ensure proper handling of OAuth data
*/

-- Add new columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS provider text DEFAULT 'email',
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Update the trigger function to handle Google OAuth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    role,
    provider,
    avatar_url
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    CASE 
      WHEN NEW.raw_user_meta_data->>'provider' IS NOT NULL THEN NEW.raw_user_meta_data->>'provider'
      ELSE 'email'
    END,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    provider = EXCLUDED.provider,
    avatar_url = EXCLUDED.avatar_url;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;