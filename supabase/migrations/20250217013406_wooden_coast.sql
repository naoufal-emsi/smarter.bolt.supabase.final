/*
  # Enhance quiz scoring system

  1. New Columns
    - Add detailed_responses to track individual question responses
    - Add question_scores to track per-question scoring
  
  2. Updates
    - Modify score calculation to be more precise
*/

-- Add columns for detailed scoring
ALTER TABLE quiz_attempts 
ADD COLUMN IF NOT EXISTS detailed_responses jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS question_scores jsonb DEFAULT '{}'::jsonb;

-- Add index for faster scoring queries
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_completed ON quiz_attempts (completed) WHERE completed = true;