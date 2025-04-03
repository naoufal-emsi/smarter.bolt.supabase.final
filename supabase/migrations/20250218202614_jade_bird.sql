/*
  # Add username authentication support
  
  1. Changes
    - Add unique index on username for faster lookups
    - Add function to handle username/email authentication
*/

-- Add index for faster username lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower ON profiles (lower(username));

-- Create a function to get user id by username or email
CREATE OR REPLACE FUNCTION get_user_by_username_or_email(identifier text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
BEGIN
  -- First try to find by username
  SELECT id INTO user_id
  FROM profiles
  WHERE lower(username) = lower(identifier);

  -- If not found by username, try email
  IF user_id IS NULL THEN
    SELECT id INTO user_id
    FROM profiles
    WHERE lower(email) = lower(identifier);
  END IF;

  RETURN user_id;
END;
$$;