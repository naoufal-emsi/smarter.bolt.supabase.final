/*
  # Add question types and quiz deletion

  1. Changes
    - Add `type` column to questions table with types:
      - 'multiple_choice' (default)
      - 'true_false'
      - 'fill_blank'
    - Add cascade deletion for quizzes
    - Add new RLS policies for quiz deletion

  2. Security
    - Add policy for teachers to delete their own quizzes
*/

-- Add question type column
ALTER TABLE questions ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'multiple_choice'
  CHECK (type IN ('multiple_choice', 'true_false', 'fill_blank'));

-- Add delete policy for quizzes
CREATE POLICY "Teachers can delete their own quizzes"
  ON quizzes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
      AND quizzes.created_by = profiles.id
    )
  );