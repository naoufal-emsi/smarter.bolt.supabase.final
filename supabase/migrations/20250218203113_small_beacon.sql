-- Add unique constraint for email if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_email_key'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
  END IF;
END $$;

-- Create or replace function to handle user authentication
CREATE OR REPLACE FUNCTION authenticate_user(identifier text, password text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Try to find user by email
  IF position('@' in identifier) > 0 THEN
    SELECT id INTO user_id
    FROM auth.users
    WHERE email = identifier
    AND encrypted_password = crypt(password, auth.users.encrypted_password);
  ELSE
    -- Try to find user by username
    SELECT p.id INTO user_id
    FROM profiles p
    JOIN auth.users u ON p.id = u.id
    WHERE lower(p.username) = lower(identifier)
    AND u.encrypted_password = crypt(password, u.encrypted_password);
  END IF;

  RETURN user_id;
END;
$$;