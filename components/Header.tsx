import React from 'react';
import { ViewMode } from '../types';

interface HeaderProps {
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onClearCompleted: () => void;
  onReset: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const Header: React.FC<HeaderProps> = ({ onExpandAll, onCollapseAll, onClearCompleted, onReset, viewMode, onViewModeChange }) => {
  
  const baseButtonClass = "px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200";
  const activeViewClass = "bg-sky-600 text-white shadow-lg";
  const inactiveViewClass = "bg-slate-700/50 hover:bg-slate-700 text-slate-300";

  return (
    <div className="bg-slate-800/60 p-4 rounded-xl mb-6 shadow-2xl border border-slate-700/80">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-sky-400">Habit & Todo Tracker</h1>
        <div className="flex bg-slate-900/50 border border-slate-700 p-1 rounded-lg">
             <button onClick={() => onViewModeChange('list')} className={`${baseButtonClass} ${viewMode === 'list' ? activeViewClass : inactiveViewClass}`}>List</button>
             <button onClick={() => onViewModeChange('mindmap')} className={`${baseButtonClass} ${viewMode === 'mindmap' ? activeViewClass : inactiveViewClass}`}>Mindmap</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <button onClick={onExpandAll} className="px-4 py-2 text-sm font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition-colors">Expand All</button>
        <button onClick={onCollapseAll} className="px-4 py-2 text-sm font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition-colors">Collapse All</button>
        <button onClick={onClearCompleted} className="px-4 py-2 text-sm font-semibold bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-md transition-colors">Clear Completed</button>
        <button onClick={onReset} className="px-4 py-2 text-sm font-semibold bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 rounded-md transition-colors">Reset Data</button>
      </div>
    </div>
  );
};

export default Header;