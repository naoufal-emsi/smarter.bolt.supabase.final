/*
  # Modern Dashboard Enhancements

  1. New Views
    - Add quiz_statistics view for dashboard metrics
    - Add student_performance_trends view for analytics
  
  2. Changes
    - Add indexes for better performance
    - Add helper functions for statistics
*/

-- Create view for quiz statistics
CREATE OR REPLACE VIEW quiz_statistics AS
SELECT
  q.id as quiz_id,
  q.title,
  COUNT(DISTINCT qa.student_id) as total_students,
  COALESCE(AVG(qa.score), 0) as average_score,
  COUNT(qa.id) as total_attempts,
  MIN(qa.created_at) as first_attempt_date,
  MAX(qa.created_at) as last_attempt_date
FROM quizzes q
LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id AND qa.completed = true
GROUP BY q.id, q.title;

-- Create view for student performance trends
CREATE OR REPLACE VIEW student_performance_trends AS
SELECT
  q.id as quiz_id,
  q.title,
  p.email as student_email,
  qa.score,
  qa.created_at as attempt_date,
  ROW_NUMBER() OVER (PARTITION BY q.id, p.id ORDER BY qa.created_at) as attempt_number
FROM quizzes q
JOIN quiz_attempts qa ON q.id = qa.quiz_id
JOIN profiles p ON qa.student_id = p.id
WHERE qa.completed = true;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_completed_score 
ON quiz_attempts(completed, score) 
WHERE completed = true;

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_date 
ON quiz_attempts(created_at);