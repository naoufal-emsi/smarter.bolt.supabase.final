import React from 'react';
import { GraduationCap, School } from 'lucide-react';

interface Props {
  onSelect: (role: 'teacher' | 'student') => void;
  isLoading: boolean;
}

const RoleSelectionModal: React.FC<Props> = ({ onSelect, isLoading }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 transform transition-all">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-6">
          Choose Your Role
        </h2>
        <p className="text-gray-600 dark:text-gray-300 text-center mb-8">
          Select your role to complete your registration
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => onSelect('teacher')}
            disabled={isLoading}
            className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-700 rounded-xl border-2 border-transparent hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <School className="w-16 h-16 text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              I'm a Teacher
            </h3>
          </button>
          
          <button
            onClick={() => onSelect('student')}
            disabled={isLoading}
            className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-700 rounded-xl border-2 border-transparent hover:border-green-500 dark:hover:border-green-400 transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <GraduationCap className="w-16 h-16 text-green-600 dark:text-green-400 mb-4 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              I'm a Student
            </h3>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelectionModal;