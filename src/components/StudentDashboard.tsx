import React, { useState, useEffect } from 'react';
import { LogOut, Search, Settings, Clock, CheckCircle, XCircle, ChevronRight, Trophy, Star, Calendar, Award, BookOpen, BarChart } from 'lucide-react';
import { User, Quiz, QuizAttempt } from '../types';
import { supabase } from '../lib/supabase';
import SettingsPage from './SettingsPage';

interface Props {
  user: User;
  onLogout: () => void;
}

const StudentDashboard: React.FC<Props> = ({ user, onLogout }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [quizId, setQuizId] = useState('');
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: number }>({});
  const [quizResult, setQuizResult] = useState<{
    score: number;
    total: number;
    showResult: boolean;
  }>({ score: 0, total: 0, showResult: false });
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAttempts();
  }, [user.id]);

  const loadAttempts = async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select(`
          id,
          quiz_id,
          score,
          completed,
          created_at,
          quizzes (
            title,
            questions (count)
          )
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setAttempts(data.map(attempt => ({
          ...attempt,
          quizId: attempt.quiz_id,
          studentId: user.id,
        })));
      }
    } catch (err) {
      console.error('Error loading attempts:', err);
      setError('Failed to load quiz attempts');
    }
  };

  const joinQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setQuizResult({ score: 0, total: 0, showResult: false });
    setSelectedAnswers({});

    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          id,
          title,
          questions (
            id,
            text,
            options,
            correct_answer,
            type
          )
        `)
        .eq('id', parseInt(quizId))
        .single();

      if (error) throw error;

      if (!data) {
        setError('Quiz not found');
        return;
      }

      const { data: existingAttempts, error: attemptError } = await supabase
        .from('quiz_attempts')
        .select('id, completed')
        .eq('quiz_id', data.id)
        .eq('student_id', user.id)
        .eq('completed', true);

      if (attemptError) throw attemptError;

      if (existingAttempts && existingAttempts.length > 0) {
        setError('You have already completed this quiz');
        return;
      }

      const { data: newAttempt, error: createError } = await supabase
        .from('quiz_attempts')
        .insert([
          {
            quiz_id: data.id,
            student_id: user.id,
            score: 0,
            completed: false,
            selected_answers: {},
            started_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (createError) throw createError;

      setCurrentAttemptId(newAttempt.id);

      const transformedQuiz = {
        ...data,
        questions: data.questions.map(q => ({
          ...q,
          correctAnswer: q.correct_answer,
        })),
      };

      setCurrentQuiz(transformedQuiz);
    } catch (err) {
      console.error('Error joining quiz:', err);
      setError('Failed to join quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = async (questionId: string, answerIndex: number) => {
    if (!currentAttemptId) return;

    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));

    try {
      const { error } = await supabase
        .from('quiz_attempts')
        .update({
          selected_answers: {
            ...selectedAnswers,
            [questionId]: answerIndex
          }
        })
        .eq('id', currentAttemptId);

      if (error) throw error;
    } catch (err) {
      console.error('Error saving answer:', err);
    }
  };

  const submitQuiz = async () => {
    if (!currentQuiz || !currentQuiz.questions || !currentAttemptId) return;
    setLoading(true);

    try {
      let correctAnswers = 0;
      currentQuiz.questions.forEach(question => {
        const selectedAnswer = selectedAnswers[question.id];
        const correctAnswer = question.correctAnswer;
        
        if (question.type === 'fill_blank') {
          const selectedText = question.options[selectedAnswer] || '';
          const correctText = question.options[correctAnswer] || '';
          if (selectedText.toLowerCase() === correctText.toLowerCase()) {
            correctAnswers++;
          }
        } else {
          if (selectedAnswer === correctAnswer) {
            correctAnswers++;
          }
        }
      });

      const score = Math.round((correctAnswers / currentQuiz.questions.length) * 100);

      // Update quiz attempt
      const { error: updateError } = await supabase
        .from('quiz_attempts')
        .update({
          score,
          completed: true,
          completed_at: new Date().toISOString(),
          selected_answers: selectedAnswers
        })
        .eq('id', currentAttemptId);

      if (updateError) throw updateError;

      // Update student scores
      const { error: scoreError } = await supabase
        .from('student_scores')
        .upsert({
          quiz_id: currentQuiz.id,
          student_id: user.id,
          score
        });

      if (scoreError) throw scoreError;

      setQuizResult({
        score: correctAnswers,
        total: currentQuiz.questions.length,
        showResult: true
      });

      await loadAttempts();
    } catch (err) {
      console.error('Error submitting quiz:', err);
      setError('Failed to submit quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      onLogout();
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  const handleUserUpdate = (updatedUser: User) => {
    user.name = updatedUser.name;
  };

  const filteredAttempts = attempts.filter(attempt => {
    const searchLower = searchQuery.toLowerCase();
    return (
      attempt.quizzes?.title.toLowerCase().includes(searchLower) ||
      attempt.score.toString().includes(searchLower) ||
      new Date(attempt.created_at).toLocaleDateString().toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <header className="bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-lg sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl shadow-lg">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  Student Dashboard
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">Welcome back, {user.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {showSettings && (
        <SettingsPage
          user={user}
          onClose={() => setShowSettings(false)}
          onUpdate={handleUserUpdate}
        />
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Quizzes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{attempts.length}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl">
                <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Average Score</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {attempts.length > 0
                    ? Math.round(attempts.reduce((acc, curr) => acc + curr.score, 0) / attempts.length)
                    : 0}%
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-xl">
                <BarChart className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Best Score</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {attempts.length > 0
                    ? Math.max(...attempts.map(a => a.score))
                    : 0}%
                </p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-xl">
                <Award className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 transform hover:scale-[1.01] transition-all duration-300">
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl shadow-md">
              <Search className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Join a Quiz</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Enter a quiz ID to start your assessment</p>
            </div>
          </div>
          <form onSubmit={joinQuiz} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="number"
                  value={quizId}
                  onChange={(e) => setQuizId(e.target.value)}
                  placeholder="Enter Quiz ID"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 pl-12"
                  required
                  disabled={loading}
                />
                <Star className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
              </div>
              {error && (
                <p className="mt-2 text-red-500 text-sm flex items-center">
                  <XCircle className="w-4 h-4 mr-1" />
                  {error}
                </p>
              )}
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px]"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <Clock className="animate-spin w-5 h-5 mr-2" />
                  Joining...
                </span>
              ) : (
                <span className="flex items-center">
                  Join Quiz
                  <ChevronRight className="w-5 h-5 ml-2" />
                </span>
              )}
            </button>
          </form>
        </div>

        {currentQuiz && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">{currentQuiz.title}</h2>
            {quizResult.showResult ? (
              <div className="text-center py-8">
                <div className="inline-block p-4 rounded-full bg-gradient-to-r from-green-500 to-blue-500 mb-6">
                  <Trophy className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Quiz Results</h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 mb-6 inline-block">
                  <p className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-2">
                    {quizResult.score} / {quizResult.total}
                  </p>
                  <p className="text-xl text-gray-600 dark:text-gray-300">
                    Score: {Math.round((quizResult.score / quizResult.total) * 100)}%
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCurrentQuiz(null);
                    setQuizId('');
                    setSelectedAnswers({});
                    setQuizResult({ score: 0, total: 0, showResult: false });
                    setCurrentAttemptId(null);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Take Another Quiz
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {currentQuiz.questions?.map((question, index) => (
                  <div key={question.id} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                    <p className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
                      <span className="text-blue-600 dark:text-blue-400 mr-2">Q{index + 1}.</span>
                      {question.text}
                    </p>
                    <div className="space-y-3">
                      {question.type === 'fill_blank' ? (
                        <input
                          type="text"
                          value={selectedAnswers[question.id] !== undefined ? question.options[selectedAnswers[question.id]] : ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            const optionIndex = question.options.findIndex(opt => opt.toLowerCase() === value.toLowerCase());
                            if (optionIndex !== -1) {
                              handleAnswerSelect(question.id, optionIndex);
                            } else {
                              handleAnswerSelect(question.id, -1);
                            }
                          }}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                          placeholder="Type your answer"
                          required
                          disabled={loading}
                        />
                      ) : (
                        question.options.map((option, optionIndex) => (
                          <label
                            key={optionIndex}
                            className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                              selectedAnswers[question.id] === optionIndex
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${question.id}`}
                              value={optionIndex}
                              checked={selectedAnswers[question.id] === optionIndex}
                              onChange={() => handleAnswerSelect(question.id, optionIndex)}
                              className="sr-only"
                              required
                              disabled={loading}
                            />
                            <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                              selectedAnswers[question.id] === optionIndex
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}>
                              {selectedAnswers[question.id] === optionIndex && (
                                <div className="w-2 h-2 rounded-full bg-white" />
                              )}
                            </div>
                            <span className="text-gray-700 dark:text-gray-200">{option}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex justify-end">
                  <button
                    onClick={submitQuiz}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    disabled={currentQuiz.questions?.length !== Object.keys(selectedAnswers).length || loading}
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <Clock className="animate-spin w-5 h-5 mr-2" />
                        Submitting...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        Submit Quiz
                        <CheckCircle className="w-5 h-5 ml-2" />
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl shadow-md">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Quiz History</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Track your progress and performance</p>
              </div>
            </div>
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search history..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>

          {filteredAttempts.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
              <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                {searchQuery ? `No attempts found matching "${searchQuery}"` : 'No quiz attempts yet'}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                {searchQuery ? 'Try a different search term' : 'Join a quiz to get started'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="group bg-gray-50 dark:bg-gray-700 rounded-xl p-6 transform hover:scale-[1.02] transition-all duration-300 border-2 border-transparent hover:border-blue-500/20"
                >
                  <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-4">
                    {attempt.quizzes?.title}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Score</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{attempt.score}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Date</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(attempt.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${attempt.score}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;