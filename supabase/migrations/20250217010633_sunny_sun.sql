/*
  # Add timestamps and selected answers to quiz attempts

  1. Changes
    - Add `completed_at` timestamp column to track when quizzes are completed
    - Add `started_at` timestamp column to track when quizzes are started
    - Add `selected_answers` JSONB column to store student answers
    - Update existing attempts with default values

  2. Notes
    - All new columns are nullable to maintain compatibility with existing data
    - `selected_answers` uses JSONB for flexible answer storage
*/

-- Add new columns to quiz_attempts table
ALTER TABLE quiz_attempts 
ADD COLUMN IF NOT EXISTS completed_at timestamptz,
ADD COLUMN IF NOT EXISTS started_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS selected_answers jsonb DEFAULT '{}'::jsonb;

-- Update existing completed attempts
UPDATE quiz_attempts
SET 
  completed_at = created_at,
  started_at = created_at
WHERE completed = true
  AND completed_at IS NULL;