import React, { useState, useEffect } from 'react';
import { 
  LogOut, Plus, Trash2, PlusCircle, Users, ChevronDown, ChevronUp, 
  Edit2, X, Settings, Clock, CheckCircle, AlertCircle, Search,
  BarChart2, BookOpen, Award, TrendingUp, Calendar
} from 'lucide-react';
import { User, Quiz, NewQuestion, QuestionType } from '../types';
import { supabase } from '../lib/supabase';
import SettingsPage from './SettingsPage';

interface Props {
  user: User;
  onLogout: () => void;
}

interface QuizStatistics {
  total_students: number;
  average_score: number;
  total_attempts: number;
  first_attempt_date: string;
  last_attempt_date: string;
}

interface QuizAttemptSummary {
  student_email: string;
  attempt_count: number;
  highest_score: number;
  first_attempt: string;
  last_attempt: string;
}

interface QuizWithSummary extends Quiz {
  attempts?: QuizAttemptSummary[];
  statistics?: QuizStatistics;
}

const TeacherDashboard: React.FC<Props> = ({ user, onLogout }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [quizzes, setQuizzes] = useState<QuizWithSummary[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [title, setTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [questions, setQuestions] = useState<NewQuestion[]>([
    {
      text: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      type: 'multiple_choice',
    },
  ]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedQuiz, setExpandedQuiz] = useState<number | null>(null);

  const loadQuizzes = async () => {
    try {
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select(`
          id,
          title,
          created_by,
          questions (
            id,
            text,
            options,
            correct_answer,
            type
          )
        `)
        .eq('created_by', user.id);

      if (quizError) throw quizError;

      const { data: statsData, error: statsError } = await supabase
        .from('quiz_statistics')
        .select('*');

      if (statsError) throw statsError;

      const { data: attemptData, error: attemptError } = await supabase
        .from('quiz_attempt_summary')
        .select('*');

      if (attemptError) throw attemptError;

      const enrichedQuizzes = quizData.map(quiz => ({
        ...quiz,
        statistics: statsData.find(s => s.quiz_id === quiz.id),
        attempts: attemptData.filter(a => a.quiz_id === quiz.id)
      }));

      setQuizzes(enrichedQuizzes);
    } catch (err) {
      console.error('Error loading quizzes:', err);
      setError('Failed to load quizzes');
    }
  };

  useEffect(() => {
    loadQuizzes();
  }, [user.id]);

  const filteredQuizzes = quizzes.filter(quiz => {
    const searchLower = searchQuery.toLowerCase();
    return (
      quiz.title.toLowerCase().includes(searchLower) ||
      quiz.id.toString().includes(searchLower) ||
      quiz.attempts?.some(attempt => 
        attempt.student_email.toLowerCase().includes(searchLower) ||
        attempt.highest_score.toString().includes(searchLower)
      )
    );
  });

  const deleteQuiz = async (quizId: number) => {
    if (!confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizId);

      if (error) throw error;

      await loadQuizzes();
    } catch (err) {
      console.error('Error deleting quiz:', err);
      setError('Failed to delete quiz');
    }
  };

  const startEditingQuiz = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setTitle(quiz.title);
    setQuestions(
      quiz.questions.map(q => ({
        text: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        type: q.type,
      }))
    );
    setShowCreateForm(true);
    setExpandedQuiz(null);
  };

  const cancelEditing = () => {
    setEditingQuiz(null);
    setShowCreateForm(false);
    setTitle('');
    setQuestions([
      {
        text: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        type: 'multiple_choice',
      },
    ]);
    setError('');
  };

  const addQuestion = (type: QuestionType = 'multiple_choice') => {
    const newQuestion: NewQuestion = {
      text: '',
      options: type === 'true_false' ? ['True', 'False'] : ['', '', '', ''],
      correctAnswer: 0,
      type,
    };

    if (type === 'fill_blank') {
      newQuestion.options = [''];
    }

    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestionText = (index: number, text: string) => {
    const newQuestions = [...questions];
    newQuestions[index].text = text;
    setQuestions(newQuestions);
  };

  const updateQuestionOption = (questionIndex: number, optionIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options[optionIndex] = value;
    setQuestions(newQuestions);
  };

  const updateCorrectAnswer = (questionIndex: number, value: number) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].correctAnswer = value;
    setQuestions(newQuestions);
  };

  const updateQuestionType = (index: number, type: QuestionType) => {
    const newQuestions = [...questions];
    const question = newQuestions[index];
    
    question.type = type;
    question.correctAnswer = 0;

    if (type === 'true_false') {
      question.options = ['True', 'False'];
    } else if (type === 'fill_blank') {
      question.options = [''];
    } else {
      question.options = ['', '', '', ''];
    }

    setQuestions(newQuestions);
  };

  const saveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!title.trim()) {
        setError('Quiz title is required');
        setLoading(false);
        return;
      }

      for (const question of questions) {
        if (!question.text.trim()) {
          setError('All questions must have text');
          setLoading(false);
          return;
        }

        if (question.type === 'multiple_choice') {
          if (question.options.some(opt => !opt.trim())) {
            setError('All options must be filled out');
            setLoading(false);
            return;
          }
        } else if (question.type === 'true_false') {
          if (question.options.length !== 2 || 
              question.options[0].toLowerCase() !== 'true' || 
              question.options[1].toLowerCase() !== 'false') {
            setError('True/False questions must have exactly two options: True and False');
            setLoading(false);
            return;
          }
        } else if (question.type === 'fill_blank') {
          if (!question.options[0] || !question.options[0].trim()) {
            setError('Fill in the blank questions must have an answer');
            setLoading(false);
            return;
          }
          if (!question.text.includes('___')) {
            setError('Fill in the blank questions must contain "___" to indicate the blank');
            setLoading(false);
            return;
          }
        }
      }

      if (editingQuiz) {
        const { error: quizError } = await supabase
          .from('quizzes')
          .update({ 
            title: title.trim()
          })
          .eq('id', editingQuiz.id)
          .eq('created_by', user.id);

        if (quizError) throw quizError;

        const { error: deleteError } = await supabase
          .from('questions')
          .delete()
          .eq('quiz_id', editingQuiz.id);

        if (deleteError) throw deleteError;

        const { error: questionsError } = await supabase
          .from('questions')
          .insert(
            questions.map(q => ({
              quiz_id: editingQuiz.id,
              text: q.text.trim(),
              options: q.options.map(opt => opt.trim()),
              correct_answer: q.correctAnswer,
              type: q.type,
            }))
          );

        if (questionsError) throw questionsError;
      } else {
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .insert([
            {
              title: title.trim(),
              created_by: user.id,
            },
          ])
          .select()
          .single();

        if (quizError || !quizData) throw quizError || new Error('Failed to create quiz');

        const { error: questionsError } = await supabase
          .from('questions')
          .insert(
            questions.map(q => ({
              quiz_id: quizData.id,
              text: q.text.trim(),
              options: q.options.map(opt => opt.trim()),
              correct_answer: q.correctAnswer,
              type: q.type,
            }))
          );

        if (questionsError) throw questionsError;
      }

      setShowCreateForm(false);
      setEditingQuiz(null);
      setTitle('');
      setQuestions([
        {
          text: '',
          options: ['', '', '', ''],
          correctAnswer: 0,
          type: 'multiple_choice',
        },
      ]);
      
      await loadQuizzes();
    } catch (err) {
      console.error('Error saving quiz:', err);
      setError(err instanceof Error ? err.message : 'Failed to save quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  const handleUserUpdate = (updatedUser: User) => {
    // Update the user state in the parent component
    // For now, we'll just update the name since that's what can be changed in settings
    user.name = updatedUser.name;
  };

  const toggleQuizExpansion = (quizId: number) => {
    setExpandedQuiz(expandedQuiz === quizId ? null : quizId);
  };

  const renderQuizForm = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {editingQuiz ? 'Edit Quiz' : 'Create New Quiz'}
            </h2>
            <button
              onClick={cancelEditing}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={saveQuiz} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Quiz Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter quiz title"
                className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                required
              />
            </div>

            <div className="space-y-6">
              {questions.map((question, index) => (
                <div
                  key={index}
                  className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 relative"
                >
                  <div className="absolute top-4 right-4 flex space-x-2">
                    <button
                      type="button"
                      onClick={() => removeQuestion(index)}
                      className="p-2 text-red-500 hover:text-red-600 transition-colors"
                      disabled={questions.length === 1}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                        Question Type
                      </label>
                      <select
                        value={question.type}
                        onChange={(e) => updateQuestionType(index, e.target.value as QuestionType)}
                        className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      >
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="true_false">True/False</option>
                        <option value="fill_blank">Fill in the Blank</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                        Question Text
                      </label>
                      <input
                        type="text"
                        value={question.text}
                        onChange={(e) => updateQuestionText(index, e.target.value)}
                        placeholder={
                          question.type === 'fill_blank'
                            ? 'Enter question with ___ for blank'
                            : 'Enter question text'
                        }
                        className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                        required
                      />
                    </div>

                    {question.type === 'multiple_choice' && (
                      <div className="space-y-3">
                        {question.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center space-x-4">
                            <input
                              type="radio"
                              name={`correct-${index}`}
                              checked={question.correctAnswer === optionIndex}
                              onChange={() => updateCorrectAnswer(index, optionIndex)}
                              className="w-4 h-4 text-blue-600"
                            />
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => updateQuestionOption(index, optionIndex, e.target.value)}
                              placeholder={`Option ${optionIndex + 1}`}
                              className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                              required
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {question.type === 'true_false' && (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-4">
                          <input
                            type="radio"
                            name={`correct-${index}`}
                            checked={question.correctAnswer === 0}
                            onChange={() => updateCorrectAnswer(index, 0)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-gray-700 dark:text-gray-200">True</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <input
                            type="radio"
                            name={`correct-${index}`}
                            checked={question.correctAnswer === 1}
                            onChange={() => updateCorrectAnswer(index, 1)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-gray-700 dark:text-gray-200">False</span>
                        </div>
                      </div>
                    )}

                    {question.type === 'fill_blank' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                          Correct Answer
                        </label>
                        <input
                          type="text"
                          value={question.options[0]}
                          onChange={(e) => updateQuestionOption(index, 0, e.target.value)}
                          placeholder="Enter the correct answer"
                          className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => addQuestion()}
                className="flex items-center px-4 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                <PlusCircle className="w-5 h-5 mr-2" />
                Add Question
              </button>

              {error && (
                <p className="text-red-500 text-sm flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="flex items-center px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center">
                    <Clock className="animate-spin w-5 h-5 mr-2" />
                    Saving...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    {editingQuiz ? 'Update Quiz' : 'Create Quiz'}
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  const renderAttempts = (quiz: QuizWithSummary) => {
    if (!quiz.attempts || quiz.attempts.length === 0) {
      return (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          No attempts yet
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Student Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Attempts
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Highest Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                First Attempt
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Last Attempt
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {quiz.attempts.map((attempt, index) => (
              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {attempt.student_email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {attempt.attempt_count}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 rounded-full ${
                    attempt.highest_score >= 70 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    attempt.highest_score >= 50 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {attempt.highest_score}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(attempt.first_attempt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(attempt.last_attempt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl shadow-lg">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Teacher Dashboard
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Welcome back, {user.name}
                </p>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Quizzes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{quizzes.length}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl">
                <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Students</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {quizzes.reduce((acc, quiz) => acc + (quiz.statistics?.total_students || 0), 0)}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-xl">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Average Score</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.round(quizzes.reduce((acc, quiz) => acc + (quiz.statistics?.average_score || 0), 0) / quizzes.length || 0)}%
                </p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-xl">
                <Award className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Attempts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {quizzes.reduce((acc, quiz) => acc + (quiz.statistics?.total_attempts || 0), 0)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-xl">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-blue -500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Quiz
            </button>
            
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search quizzes..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>

          <div className="space-y-4">
            {filteredQuizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div 
                      className="cursor-pointer hover:bg-white dark:hover:bg-gray-700 p-2 rounded-lg transition-all duration-300"
                      onClick={() => toggleQuizExpansion(quiz.id)}
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg font-mono text-sm">
                          Quiz ID: {quiz.id}
                        </span>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {quiz.title}
                        </h3>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center">
                          <BookOpen className="w-4 h-4 mr-1" />
                          {quiz.questions?.length || 0} questions
                        </span>
                        <span className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {quiz.statistics?.total_students || 0} students
                        </span>
                        <span className="flex items-center">
                          <BarChart2 className="w-4 h-4 mr-1" />
                          Avg: {Math.round(quiz.statistics?.average_score || 0)}%
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          Last attempt: {quiz.statistics?.last_attempt_date ? 
                            new Date(quiz.statistics.last_attempt_date).toLocaleDateString() : 
                            'No attempts'
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => startEditingQuiz(quiz)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit Quiz"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteQuiz(quiz.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete Quiz"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => toggleQuizExpansion(quiz.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {expandedQuiz === quiz.id ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {expandedQuiz === quiz.id && (
                  <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                      <p className="text-blue-700 dark:text-blue-300 font-mono">
                        Share this Quiz ID with your students: <span className="font-bold">{quiz.id}</span>
                      </p>
                    </div>
                    {renderAttempts(quiz)}
                  </div>
                )}
              </div>
            ))}

            {filteredQuizzes.length === 0 && (
              <div className="text-center py-12">
                <div className="inline-block p-3 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                  <AlertCircle className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  {searchQuery ? 
                    `No quizzes found matching "${searchQuery}"` : 
                    'No quizzes created yet'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {showSettings && (
        <SettingsPage
          user={user}
          onClose={() => setShowSettings(false)}
          onUpdate={handleUserUpdate}
        />
      )}

      {showCreateForm && renderQuizForm()}
    </div>
  );
};

export default TeacherDashboard;