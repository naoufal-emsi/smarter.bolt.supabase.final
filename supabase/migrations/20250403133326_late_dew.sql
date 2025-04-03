/*
  # Initial Schema Setup

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key)
      - `username` (text, unique)
      - `role` (text)
      - `created_at` (timestamp)
    - `quizzes`
      - `id` (int, primary key)
      - `title` (text)
      - `created_by` (uuid, references profiles)
      - `created_at` (timestamp)
    - `questions`
      - `id` (uuid, primary key)
      - `quiz_id` (int, references quizzes)
      - `text` (text)
      - `options` (text array)
      - `correct_answer` (int)
    - `quiz_attempts`
      - `id` (uuid, primary key)
      - `quiz_id` (int, references quizzes)
      - `student_id` (uuid, references profiles)
      - `score` (int)
      - `completed` (boolean)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create tables if they don't exist
DO $$ 
BEGIN
  -- Create profiles table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('teacher', 'student');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'profiles') THEN
    CREATE TABLE profiles (
      id uuid PRIMARY KEY REFERENCES auth.users(id),
      username text UNIQUE NOT NULL,
      role user_role NOT NULL,
      created_at timestamptz DEFAULT now()
    );
  END IF;

  -- Create quizzes table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'quizzes') THEN
    CREATE TABLE quizzes (
      id int PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      title text NOT NULL,
      created_by uuid REFERENCES profiles(id),
      created_at timestamptz DEFAULT now()
    );
  END IF;

  -- Create questions table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'questions') THEN
    CREATE TABLE questions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      quiz_id int REFERENCES quizzes(id) ON DELETE CASCADE,
      text text NOT NULL,
      options text[] NOT NULL,
      correct_answer int NOT NULL,
      created_at timestamptz DEFAULT now()
    );
  END IF;

  -- Create quiz_attempts table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'quiz_attempts') THEN
    CREATE TABLE quiz_attempts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      quiz_id int REFERENCES quizzes(id) ON DELETE CASCADE,
      student_id uuid REFERENCES profiles(id),
      score int NOT NULL DEFAULT 0,
      completed boolean DEFAULT false,
      created_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
  -- Profiles policies
  DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  
  -- Quizzes policies
  DROP POLICY IF EXISTS "Quizzes are viewable by everyone" ON quizzes;
  DROP POLICY IF EXISTS "Teachers can create quizzes" ON quizzes;
  
  -- Questions policies
  DROP POLICY IF EXISTS "Questions are viewable by everyone" ON questions;
  DROP POLICY IF EXISTS "Teachers can create questions" ON questions;
  
  -- Quiz attempts policies
  DROP POLICY IF EXISTS "Users can view their own attempts" ON quiz_attempts;
  DROP POLICY IF EXISTS "Students can create attempts" ON quiz_attempts;
END $$;

-- Recreate policies
-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

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

-- Questions policies
CREATE POLICY "Questions are viewable by everyone"
  ON questions FOR SELECT
  USING (true);

CREATE POLICY "Teachers can create questions"
  ON questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quizzes
      JOIN profiles ON quizzes.created_by = profiles.id
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
      AND quizzes.id = quiz_id
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
CREATE INDEX IF NOT EXISTS idx_quizzes_created_by ON quizzes(created_by);
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id ON quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);