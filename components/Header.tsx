import React from 'react';

interface HeaderProps {
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onClearCompleted: () => void;
  onReset: () => void;
}

const Header: React.FC<HeaderProps> = ({ onExpandAll, onCollapseAll, onClearCompleted, onReset }) => {
  return (
    <header className="bg-slate-800/50 p-6 rounded-xl mb-6 shadow-lg border border-slate-700">
      <h1 className="text-3xl font-bold mb-4 text-sky-400">Habit & Todo Tracker</h1>
      <div className="flex flex-wrap gap-2">
        <button onClick={onExpandAll} className="px-3 py-1.5 text-sm font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition-colors">Expand All</button>
        <button onClick={onCollapseAll} className="px-3 py-1.5 text-sm font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition-colors">Collapse All</button>
        <button onClick={onClearCompleted} className="px-3 py-1.5 text-sm font-semibold bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-md transition-colors">Clear Completed</button>
        <button onClick={onReset} className="px-3 py-1.5 text-sm font-semibold bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 rounded-md transition-colors">Reset Data</button>
      </div>
    </header>
  );
};

export default Header;