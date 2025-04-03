import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GraduationCap, School, AlertCircle, Mail, Lock, ArrowRight, CheckCircle } from 'lucide-react';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import LandingPage from './components/LandingPage';
import AboutPage from './components/AboutPage';
import ContactPage from './components/ContactPage';
import Footer from './components/Footer';
import { User } from './types';
import { supabase } from './lib/supabase';
import { ThemeContext, Theme } from './lib/theme';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string[]>([]);
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    return savedTheme || 'light';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    checkUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, role')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profile) {
            setUser({
              id: session.user.id,
              name: profile.email,
              role: profile.role as 'teacher' | 'student',
            });
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile) {
          setUser({
            id: session.user.id,
            name: profile.email,
            role: profile.role as 'teacher' | 'student',
          });
        }
      }
    } catch (err) {
      console.error('Error checking user:', err);
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Include at least one lowercase letter');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Include at least one uppercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Include at least one number');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?/~`]/.test(password)) {
      errors.push('Include at least one special character');
    }

    return errors;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    if (!isLogin) {
      setPasswordError(validatePassword(newPassword));
    }
  };

  const handleAuth = async (role?: 'teacher' | 'student') => {
    try {
      setError('');
      setLoading(true);

      if (!email.trim() || !password.trim()) {
        setError('Email and password are required');
        return;
      }

      if (!validateEmail(email)) {
        setError('Please enter a valid email address');
        return;
      }

      if (!isLogin) {
        const passwordErrors = validatePassword(password);
        if (passwordErrors.length > 0) {
          setPasswordError(passwordErrors);
          setError('Please fix the password issues');
          return;
        }
      }

      if (isLogin) {
        const { data: { user: authUser }, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            setError('Invalid email or password');
          } else {
            setError(signInError.message);
          }
          return;
        }

        if (!authUser) {
          setError('Login failed');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email, role')
          .eq('id', authUser.id)
          .maybeSingle();

        if (profileError || !profile) {
          setError('Profile not found');
          return;
        }

        setUser({
          id: authUser.id,
          name: profile.email,
          role: profile.role as 'teacher' | 'student',
        });
      } else {
        if (!role) {
          setError('Please select a role');
          return;
        }

        // Check if email exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('email', email)
          .maybeSingle();

        if (existingProfile) {
          setError('Email already exists');
          return;
        }

        const { data: { user: authUser }, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role
            }
          }
        });

        if (signUpError) {
          if (signUpError.message.includes('User already registered')) {
            setError('This email is already registered');
          } else {
            setError(signUpError.message);
          }
          return;
        }

        if (!authUser) {
          setError('Registration failed');
          return;
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authUser.id,
              email,
              role,
            },
          ]);

        if (profileError) {
          if (profileError.message.includes('profiles_email_key')) {
            setError('Email already exists');
          } else {
            setError('Failed to create profile');
          }
          return;
        }

        setUser({
          id: authUser.id,
          name: email,
          role,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const renderAuthContent = () => (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-md w-full space-y-8 relative">
        {/* Decorative elements */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-xl" />
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-xl" />
        
        {/* Main content */}
        <div className="relative bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl backdrop-blur-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl shadow-lg">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
          </div>

          <h2 className="mt-6 text-center text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {isLogin ? 'Welcome Back!' : 'Create Account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {isLogin ? "Let's continue your learning journey" : 'Join our learning community today'}
          </p>

          <div className="mt-8 space-y-6">
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  setIsLogin(true);
                  setError('');
                  setPasswordError([]);
                }}
                className={`relative px-4 py-2 rounded-lg transition-all duration-300 ${
                  isLogin
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Login
                {isLogin && (
                  <span className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-b-lg" />
                )}
              </button>
              <button
                onClick={() => {
                  setIsLogin(false);
                  setError('');
                  setPasswordError([]);
                }}
                className={`relative px-4 py-2 rounded-lg transition-all duration-300 ${
                  !isLogin
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Register
                {!isLogin && (
                  <span className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-b-lg" />
                )}
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <label className="sr-only">Email address</label>
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  disabled={loading}
                />
              </div>
              <div className="relative">
                <label className="sr-only">Password</label>
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Enter your password"
                  className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  disabled={loading}
                />
              </div>
            </div>

            {!isLogin && passwordError.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Password requirements:</p>
                <div className="space-y-1">
                  {passwordError.map((err, index) => (
                    <div key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <CheckCircle className="w-4 h-4 mr-2 text-red-500" />
                      {err}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            {isLogin ? (
              <button
                onClick={() => handleAuth()}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-white bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Logging in...
                  </span>
                ) : (
                  <span className="flex items-center">
                    Login
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </button>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() => handleAuth('teacher')}
                  className="group relative flex flex-col items-center justify-center p-6 border border-transparent rounded-xl text-white bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
                  disabled={loading}
                >
                  <School className="w-12 h-12 mb-3" />
                  <span className="text-lg font-medium">Register as Teacher</span>
                </button>
                <button
                  onClick={() => handleAuth('student')}
                  className="group relative flex flex-col items-center justify-center p-6 border border-transparent rounded-xl text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
                  disabled={loading}
                >
                  <GraduationCap className="w-12 h-12 mb-3" />
                  <span className="text-lg font-medium">Register as Student</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <Router>
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors flex flex-col">
          <div className="flex-grow">
            <Routes>
              <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route
                path="/auth"
                element={
                  user ? (
                    <Navigate to="/dashboard" />
                  ) : (
                    renderAuthContent()
                  )
                }
              />
              <Route
                path="/dashboard"
                element={
                  user ? (
                    user.role === 'teacher' ? (
                      <TeacherDashboard user={user} onLogout={handleLogout} />
                    ) : (
                      <StudentDashboard user={user} onLogout={handleLogout} />
                    )
                  ) : (
                    <Navigate to="/auth" />
                  )
                }
              />
            </Routes>
          </div>
          <Footer />
        </div>
      </Router>
    </ThemeContext.Provider>
  );
}

export default App;