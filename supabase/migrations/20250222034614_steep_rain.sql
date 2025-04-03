/*
  # Fix teacher registration and authentication

  1. Changes
    - Add policy for teachers to create and manage quizzes
    - Update handle_new_user function to properly handle teacher registration
    - Add policy for teachers to view their own quizzes
    - Add policy for teachers to manage questions

  2. Security
    - Ensure proper role-based access control
    - Maintain data integrity for teacher accounts
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Teachers can create quizzes" ON quizzes;
DROP POLICY IF EXISTS "Teachers can delete their own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Teachers can create questions" ON questions;

-- Update the handle_new_user function to properly handle teacher role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    role,
    provider
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'provider', 'email')
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    provider = EXCLUDED.provider;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new policies for teachers
CREATE POLICY "Teachers can create quizzes"
ON public.quizzes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'teacher'
  )
);

CREATE POLICY "Teachers can manage their quizzes"
ON public.quizzes
FOR ALL
TO authenticated
USING (
  CASE 
    WHEN (
      SELECT role FROM public.profiles 
      WHERE id = auth.uid()
    ) = 'teacher' THEN created_by = auth.uid()
    ELSE false
  END
)
WITH CHECK (
  (
    SELECT role FROM public.profiles 
    WHERE id = auth.uid()
  ) = 'teacher' 
  AND created_by = auth.uid()
);

CREATE POLICY "Teachers can manage questions"
ON public.questions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes
    JOIN public.profiles ON quizzes.created_by = profiles.id
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'teacher'
    AND quizzes.id = quiz_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quizzes
    JOIN public.profiles ON quizzes.created_by = profiles.id
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'teacher'
    AND quizzes.id = quiz_id
  )
);

-- Ensure RLS is enabled
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_by ON public.quizzes(created_by);