import React, { useState } from 'react';
import { Save, Moon, Sun, Mail, KeyRound, X } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../lib/supabase';
import { User as UserType } from '../types';

interface Props {
  user: UserType;
  onClose: () => void;
  onUpdate: (updatedUser: UserType) => void;
}

const SettingsPage: React.FC<Props> = ({ user, onClose, onUpdate }) => {
  const { theme, setTheme } = useTheme();
  const [email, setEmail] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      let hasChanges = false;
      let successMessage = '';

      // Update email if changed
      if (email !== user.name) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ email })
          .eq('id', user.id);

        if (updateError) throw updateError;

        onUpdate({ ...user, name: email });
        hasChanges = true;
        successMessage = 'Email updated successfully';
      }

      // Update password if provided
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          setError('New passwords do not match');
          return;
        }

        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (passwordError) throw passwordError;

        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        hasChanges = true;
        successMessage = successMessage 
          ? `${successMessage} and password updated` 
          : 'Password updated successfully';
      }

      if (hasChanges) {
        setSuccess(successMessage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Theme Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Theme
              </label>
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => handleThemeChange('light')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md ${
                    theme === 'light'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Sun className="w-5 h-5" />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleThemeChange('dark')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md ${
                    theme === 'dark'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Moon className="w-5 h-5" />
                  <span>Dark</span>
                </button>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                <Mail className="w-4 h-4 inline-block mr-2" />
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
                disabled={loading}
              />
            </div>

            {/* Password Change */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                <KeyRound className="w-4 h-4 inline-block mr-2" />
                Change Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New Password"
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={loading}
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm New Password"
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={loading}
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
            {success && (
              <p className="text-green-500 text-sm">{success}</p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
              >
                <Save className="w-5 h-5 mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;