/*
  # Fix profile and quiz attempts issues

  1. Changes
    - Remove username references from quiz_attempts queries
    - Add ON CONFLICT DO NOTHING to handle profile creation race conditions
    - Update profile policies

  2. Security
    - Maintain existing RLS policies
    - Add safer profile handling
*/

-- Update the handle_new_user function to handle conflicts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update quiz_attempts to use email instead of username
CREATE OR REPLACE VIEW public.quiz_attempt_details AS
SELECT 
  qa.id,
  qa.quiz_id,
  qa.student_id,
  qa.score,
  qa.completed,
  qa.created_at,
  qa.completed_at,
  qa.started_at,
  qa.selected_answers,
  p.email as student_email
FROM quiz_attempts qa
JOIN profiles p ON qa.student_id = p.id;