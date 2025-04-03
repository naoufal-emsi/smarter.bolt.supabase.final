-- Add case-insensitive indexes for username and email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower ON profiles (lower(username));
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON profiles (lower(email));

-- Add unique constraint for case-insensitive username
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique_lower ON profiles (lower(username));

-- Add RLS policy for username lookup
CREATE POLICY "Anyone can lookup usernames"
  ON profiles FOR SELECT
  USING (true);

-- Update or create function to normalize usernames
CREATE OR REPLACE FUNCTION normalize_username()
RETURNS TRIGGER AS $$
BEGIN
  -- Remove leading/trailing whitespace and convert to lowercase
  NEW.username = trim(lower(NEW.username));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for username normalization
DROP TRIGGER IF EXISTS normalize_username_trigger ON profiles;
CREATE TRIGGER normalize_username_trigger
  BEFORE INSERT OR UPDATE OF username ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION normalize_username();