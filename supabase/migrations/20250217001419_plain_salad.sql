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

-- Create tables
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  username text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('teacher', 'student')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE quizzes (
  id int PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title text NOT NULL,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id int REFERENCES quizzes(id) ON DELETE CASCADE,
  text text NOT NULL,
  options text[] NOT NULL,
  correct_answer int NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id int REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id uuid REFERENCES profiles(id),
  score int NOT NULL DEFAULT 0,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

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