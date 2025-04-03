/*
  # Update RLS policies for quiz application

  1. Security Updates
    - Enable RLS on all tables
    - Add policies for profile creation and management
    - Add policies for quiz management
    - Add policies for question management
    - Add policies for quiz attempts

  2. Changes
    - Adds INSERT policy for profiles table
    - Updates existing policies for better security
*/

-- Enable Row Level Security (if not already enabled)
DO $$ 
BEGIN
    EXECUTE 'ALTER TABLE profiles ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE questions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY';
EXCEPTION 
    WHEN OTHERS THEN NULL;
END $$;

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update own profile" ON profiles';
    EXECUTE 'DROP POLICY IF EXISTS "Quizzes are viewable by everyone" ON quizzes';
    EXECUTE 'DROP POLICY IF EXISTS "Teachers can create quizzes" ON quizzes';
    EXECUTE 'DROP POLICY IF EXISTS "Questions are viewable by everyone" ON questions';
    EXECUTE 'DROP POLICY IF EXISTS "Teachers can create questions" ON questions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their own attempts" ON quiz_attempts';
    EXECUTE 'DROP POLICY IF EXISTS "Students can create attempts" ON quiz_attempts';
EXCEPTION 
    WHEN OTHERS THEN NULL;
END $$;

-- Recreate policies with proper permissions
-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Quizzes policies
CREATE POLICY "Quizzes are viewable by everyone"
  ON quizzes FOR SELECT
  USING (true);

CREATE POLICY "Teachers can create quizzes"
  ON quizzes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );

CREATE POLICY "Teachers can manage their quizzes"
  ON quizzes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );

-- Questions policies
CREATE POLICY "Questions are viewable by everyone"
  ON questions FOR SELECT
  USING (true);

CREATE POLICY "Teachers can create questions"
  ON questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );

-- Quiz attempts policies
CREATE POLICY "Users can view their own attempts"
  ON quiz_attempts FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can create attempts"
  ON quiz_attempts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'student'
    )
  );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id ON quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);