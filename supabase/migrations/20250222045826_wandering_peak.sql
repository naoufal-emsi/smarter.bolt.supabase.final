/*
  # Add RLS policies for student scores

  1. Changes
    - Add RLS policies for student_scores table to allow:
      - Students to insert their own scores
      - Teachers to view scores for their quizzes
      - Students to view their own scores

  2. Security
    - Enable RLS on student_scores table
    - Add policies for authenticated users
*/

-- Enable RLS for student_scores if not already enabled
ALTER TABLE student_scores ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Students can insert their own scores" ON student_scores;
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

CREATE POLICY "Students can view their own scores"
ON student_scores
FOR SELECT
TO authenticated
USING (
  auth.uid() = student_id
);

CREATE POLICY "Teachers can view scores for their quizzes"
ON student_scores
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM quizzes
    WHERE quizzes.id = student_scores.quiz_id
    AND quizzes.created_by = auth.uid()
  )
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_scores_quiz_student
ON student_scores (quiz_id, student_id);