/*
  # Update Quiz Attempts Structure

  1. Changes
    - Add student_scores table to store individual scores
    - Create view for simplified quiz attempts display
    - Add policies for score management

  2. Security
    - Enable RLS on student_scores table
    - Add policies for teachers to manage scores
*/

-- Create student_scores table
CREATE TABLE IF NOT EXISTS public.student_scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id int REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.profiles(id),
  score int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(quiz_id, student_id)
);

-- Enable RLS
ALTER TABLE public.student_scores ENABLE ROW LEVEL SECURITY;

-- Create policies for student_scores
CREATE POLICY "Teachers can view scores for their quizzes"
ON public.student_scores
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes
    WHERE quizzes.id = student_scores.quiz_id
    AND quizzes.created_by = auth.uid()
  )
);

CREATE POLICY "Students can view their own scores"
ON public.student_scores
FOR SELECT
TO authenticated
USING (
  student_id = auth.uid()
);

-- Create view for simplified quiz attempts
CREATE OR REPLACE VIEW public.quiz_attempt_summary AS
SELECT DISTINCT ON (qa.quiz_id, qa.student_id)
  qa.quiz_id,
  qa.student_id,
  p.email as student_email,
  COUNT(*) OVER (PARTITION BY qa.quiz_id, qa.student_id) as attempt_count,
  MAX(qa.score) OVER (PARTITION BY qa.quiz_id, qa.student_id) as highest_score,
  MIN(qa.created_at) OVER (PARTITION BY qa.quiz_id, qa.student_id) as first_attempt,
  MAX(qa.created_at) OVER (PARTITION BY qa.quiz_id, qa.student_id) as last_attempt
FROM quiz_attempts qa
JOIN profiles p ON qa.student_id = p.id
WHERE qa.completed = true
ORDER BY qa.quiz_id, qa.student_id, qa.created_at DESC;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_scores_quiz_id ON public.student_scores(quiz_id);
CREATE INDEX IF NOT EXISTS idx_student_scores_student_id ON public.student_scores(student_id);