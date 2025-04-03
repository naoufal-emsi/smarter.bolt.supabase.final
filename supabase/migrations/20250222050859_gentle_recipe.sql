/*
  # Fix student scores and quiz attempts

  1. Changes
    - Add policies for student scores table
    - Add policies for quiz attempts table
    - Add indexes for better performance

  2. Security
    - Enable RLS for all tables
    - Add proper policies for student and teacher access
*/

-- Enable RLS
ALTER TABLE student_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Students can insert their own scores" ON student_scores;
DROP POLICY IF EXISTS "Students can update their own scores" ON student_scores;
DROP POLICY IF EXISTS "Students can view their own scores" ON student_scores;
DROP POLICY IF EXISTS "Teachers can view scores for their quizzes" ON student_scores;

-- Create policies for student_scores table
CREATE POLICY "Students can insert their own scores"
ON student_scores
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = student_id
);

CREATE POLICY "Students can update their own scores"
ON student_scores
FOR UPDATE
TO authenticated
USING (
  auth.uid() = student_id
)
WITH CHECK (
  auth.uid() = student_id
);

CREATE POLICY "Students can view their own scores"
ON student_scores
FOR SELECT
TO authenticated
USING (
  auth.uid() = student_id OR
  EXISTS (
    SELECT 1 FROM quizzes
    WHERE quizzes.id = student_scores.quiz_id
    AND quizzes.created_by = auth.uid()
  )
);

-- Update quiz_attempts policies
CREATE POLICY "Students can update their own attempts"
ON quiz_attempts
FOR UPDATE
TO authenticated
USING (
  auth.uid() = student_id
)
WITH CHECK (
  auth.uid() = student_id
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_scores_quiz_student
ON student_scores (quiz_id, student_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_completed
ON quiz_attempts (student_id, completed);