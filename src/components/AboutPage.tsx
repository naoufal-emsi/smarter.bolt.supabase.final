import React from 'react';
import { GraduationCap, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/" className="flex items-center">
                <ArrowLeft className="h-5 w-5 text-gray-500 dark:text-gray-300 mr-2" />
                <GraduationCap className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">QuizMaster</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-8">About QuizMaster</h2>
            
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-500 dark:text-gray-300 text-lg mb-6">
                QuizMaster is an innovative educational platform designed to make learning and assessment more engaging and effective. Our mission is to provide teachers and students with powerful tools for interactive learning.
              </p>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">Our Mission</h3>
              <p className="text-gray-500 dark:text-gray-300 mb-6">
                We believe in the power of interactive learning and immediate feedback. Our platform enables educators to create engaging quizzes while providing students with a user-friendly interface to test their knowledge and track their progress.
              </p>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">Why Choose QuizMaster?</h3>
              <ul className="list-disc pl-6 text-gray-500 dark:text-gray-300 space-y-2">
                <li>User-friendly interface for both teachers and students</li>
                <li>Multiple question types to suit different learning objectives</li>
                <li>Instant feedback and detailed performance analytics</li>
                <li>Secure and reliable platform for educational assessment</li>
                <li>Continuous platform improvements based on user feedback</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AboutPage;