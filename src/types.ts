export interface Quiz {
  id: number;
  title: string;
  questions: Question[];
  createdBy: string;
}

export type QuestionType = 'multiple_choice' | 'true_false' | 'fill_blank';

export interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
  type: QuestionType;
}

export interface User {
  id: string;
  name: string;
  role: 'teacher' | 'student';
}

export interface QuizAttempt {
  quizId: number;
  studentId: string;
  score: number;
  completed: boolean;
}

export interface NewQuestion {
  text: string;
  options: string[];
  correctAnswer: number;
  type: QuestionType;
}