import React, { useState, useEffect } from 'react';
import { verifyToken, loadFromGist, saveToGist } from '../services/githubSyncService';
import { Task } from '../types';
import { SettingsIcon, CloseIcon, CheckIcon, SyncIcon } from './Icons';

interface SettingsPanelProps {
  tasks: Task[];
  onLoadTasks: (tasks: Task[]) => void;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ tasks, onLoadTasks, onClose }) => {
  const [token, setToken] = useState<string>('');
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    // Load saved token and last sync time from localStorage
    const savedToken = localStorage.getItem('github-token');
    const savedSyncTime = localStorage.getItem('last-sync-time');
    if (savedToken) {
      setToken(savedToken);
      verifyToken(savedToken).then(setIsTokenValid);
    }
    if (savedSyncTime) {
      setLastSyncTime(savedSyncTime);
    }
  }, []);

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setToken(e.target.value);
    setIsTokenValid(null);
    setMessage(null);
  };

  const handleVerifyToken = async () => {
    if (!token.trim()) {
      setMessage({ type: 'error', text: 'Please enter a token' });
      return;
    }

    setIsLoading(true);
    setMessage(null);
    
    const isValid = await verifyToken(token);
    setIsTokenValid(isValid);
    
    if (isValid) {
      localStorage.setItem('github-token', token);
      setMessage({ type: 'success', text: 'Token verified successfully!' });
    } else {
      setMessage({ type: 'error', text: 'Invalid token. Please check and try again.' });
    }
    
    setIsLoading(false);
  };

  const handleSyncToGithub = async () => {
    if (!isTokenValid) {
      setMessage({ type: 'error', text: 'Please verify your token first' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const gistId = localStorage.getItem('github-gist-id');
    const result = await saveToGist(token, tasks, gistId);

    if (result.success) {
      const syncTime = result.lastSyncTime || new Date().toISOString();
      setLastSyncTime(syncTime);
      localStorage.setItem('last-sync-time', syncTime);
      setMessage({ type: 'success', text: 'Tasks synced to GitHub successfully!' });
    } else {
      setMessage({ type: 'error', text: `Sync failed: ${result.error}` });
    }

    setIsSaving(false);
  };

  const handleLoadFromGithub = async () => {
    if (!isTokenValid) {
      setMessage({ type: 'error', text: 'Please verify your token first' });
      return;
    }

    if (!confirm('This will replace your current tasks with data from GitHub. Continue?')) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    const result = await loadFromGist(token);

    if (result.success && result.data) {
      if (result.data.length > 0) {
        onLoadTasks(result.data);
        const syncTime = result.lastSyncTime || new Date().toISOString();
        setLastSyncTime(syncTime);
        localStorage.setItem('last-sync-time', syncTime);
        setMessage({ type: 'success', text: 'Tasks loaded from GitHub successfully!' });
      } else {
        setMessage({ type: 'error', text: 'No saved data found on GitHub' });
      }
    } else {
      setMessage({ type: 'error', text: `Load failed: ${result.error}` });
    }

    setIsLoading(false);
  };

  const handleRemoveToken = () => {
    if (confirm('Remove GitHub token? You can add it back anytime.')) {
      localStorage.removeItem('github-token');
      localStorage.removeItem('github-gist-id');
      setToken('');
      setIsTokenValid(null);
      setMessage(null);
    }
  };

  const formatSyncTime = (isoString: string | null) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <SettingsIcon className="w-6 h-6" />
            GitHub Sync Settings
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Close settings"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Token Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              GitHub Personal Access Token
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={token}
                onChange={handleTokenChange}
                placeholder="ghp_xxxxxxxxxxxx"
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleVerifyToken}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded transition-colors flex items-center gap-2"
              >
                {isLoading ? 'Verifying...' : 'Verify'}
                {isTokenValid && <CheckIcon className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Need a token? <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Create one here</a> (requires 'gist' permission)
            </p>
          </div>

          {/* Status Messages */}
          {message && (
            <div className={`p-3 rounded ${
              message.type === 'success' ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'
            }`}>
              {message.text}
            </div>
          )}

          {/* Sync Actions */}
          {isTokenValid && (
            <div className="space-y-3 pt-4 border-t border-slate-700">
              <div className="flex items-center justify-between text-sm text-slate-400">
                <span>Last synced:</span>
                <span className="font-mono">{formatSyncTime(lastSyncTime)}</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSyncToGithub}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 text-white rounded transition-colors flex items-center justify-center gap-2"
                >
                  <SyncIcon className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save to GitHub'}
                </button>
                <button
                  onClick={handleLoadFromGithub}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded transition-colors flex items-center justify-center gap-2"
                >
                  <SyncIcon className="w-4 h-4" />
                  {isLoading ? 'Loading...' : 'Load from GitHub'}
                </button>
              </div>

              <button
                onClick={handleRemoveToken}
                className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors text-sm"
              >
                Remove Token
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
