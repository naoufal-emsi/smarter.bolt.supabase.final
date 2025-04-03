/*
  # Fix Teacher Authentication and Authorization

  1. Changes
    - Update teacher authentication policies
    - Add role-based access control
    - Fix profile handling for teachers
    - Add teacher-specific indexes

  2. Security
    - Strengthen RLS policies for teachers
    - Add proper role validation
*/

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Teachers can manage their quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Teachers can manage questions" ON public.questions;

-- Create stronger policies for teachers
CREATE POLICY "Teachers can view all quizzes"
ON public.quizzes
FOR SELECT
TO authenticated
USING (
  (
    SELECT role FROM public.profiles 
    WHERE id = auth.uid()
  ) = 'teacher'
);

CREATE POLICY "Teachers can manage own quizzes"
ON public.quizzes
FOR ALL
TO authenticated
USING (
  (
    SELECT role FROM public.profiles 
    WHERE id = auth.uid()
  ) = 'teacher'
  AND created_by = auth.uid()
)
WITH CHECK (
  (
    SELECT role FROM public.profiles 
    WHERE id = auth.uid()
  ) = 'teacher'
  AND created_by = auth.uid()
);

-- Update questions policies
CREATE POLICY "Teachers can manage own questions"
ON public.questions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.quizzes
    JOIN public.profiles ON quizzes.created_by = profiles.id
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'teacher'
    AND quizzes.id = quiz_id
  )
);

-- Create function to validate teacher role
CREATE OR REPLACE FUNCTION is_teacher()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'teacher'
  );
$$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_teacher_role ON public.profiles(id) WHERE role = 'teacher';
CREATE INDEX IF NOT EXISTS idx_quizzes_teacher ON public.quizzes(created_by, id);