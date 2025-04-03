/*
  # Add teacher permissions and indexes

  1. New Policies
    - Allow teachers to view all attempts for their quizzes
    - Allow teachers to view all student responses
  
  2. Performance
    - Add indexes for faster quiz attempt lookups
    - Add index for quiz creator lookups
*/

-- Add policy for teachers to view attempts
CREATE POLICY "Teachers can view attempts for their quizzes"
  ON quiz_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quizzes
      WHERE quizzes.id = quiz_attempts.quiz_id
      AND quizzes.created_by = auth.uid()
    )
  );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts (quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id ON quiz_attempts (student_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_by ON quizzes (created_by);