import React, { useState, useEffect, useRef } from 'react';
import { Task, TaskType, TimerState } from '../types';
import { ChevronRightIcon, PlusIcon, PencilIcon, TrashIcon, TimerIcon, PlayIcon, PauseIcon, RotateCcwIcon, PlusCircleIcon, DragHandleIcon } from './Icons';
import CircularProgress from './CircularProgress';
import Checkbox from './Checkbox';

type DropPosition = 'top' | 'bottom' | 'child';

// Define all handler props in a single interface for clarity
interface TaskHandlers {
  onToggleComplete: (id: string, completed: boolean) => void;
  onToggleCollapse: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, title: string, type: TaskType) => void;
  onAddSubtask: (parentId: string, title: string, type: TaskType) => void;
  onSetTimer: (id: string, duration: number) => void;
  onTimerControl: (id: string, control: 'start' | 'pause' | 'reset' | 'extend') => void;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetTask: Task, position: DropPosition) => void;
}

interface TaskItemProps extends TaskHandlers {
  task: Task;
  depth: number;
}


const computeProgress = (task: Task): { done: number; total: number } => {
  if (!task.children || task.children.length === 0) {
    return { done: task.completed ? 1 : 0, total: 1 };
  }
  const childrenProgress = task.children.reduce(
    (acc, child) => {
      const childProgress = computeProgress(child);
      acc.done += childProgress.done;
      acc.total += childProgress.total;
      return acc;
    },
    { done: 0, total: 0 }
  );
  return {
    done: childrenProgress.done,
    total: childrenProgress.total,
  };
};

const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
};


const TaskItem: React.FC<TaskItemProps> = ({ task, depth, ...handlers }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [dropPosition, setDropPosition] = useState<DropPosition | null>(null);
  const itemRef = useRef<HTMLDivElement>(null);

  const progress = task.children.length > 0 ? computeProgress(task) : null;
  const progressPercent = progress ? Math.round((progress.done / progress.total) * 100) : 0;
  
  const isCompleted = progress ? progress.done === progress.total : task.completed;

  const handleToggleComplete = () => {
    handlers.onToggleComplete(task.id, !isCompleted);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!itemRef.current) return;
    const rect = itemRef.current.getBoundingClientRect();
    const hoverY = e.clientY - rect.top;
    const hoverThreshold = rect.height / 3;

    if (hoverY < hoverThreshold) {
        setDropPosition('top');
    } else if (hoverY > rect.height - hoverThreshold) {
        setDropPosition('bottom');
    } else {
        setDropPosition('child');
    }
  };

  const timerProgress = (task.timerDuration && task.timerRemaining != null) 
    ? 100 - (task.timerRemaining / task.timerDuration * 100) 
    : 0;

  return (
    <div className="relative">
        <div 
            className="my-1.5 relative" 
            style={{ marginLeft: `${depth * 1.5}rem`, maxWidth: `calc(100% - ${depth * 1.5}rem)` }}
            onDragOver={handleDragOver}
            onDragLeave={() => setDropPosition(null)}
            onDrop={(e) => {
                if (dropPosition) handlers.onDrop(e, task, dropPosition);
                setDropPosition(null);
            }}
        >
            {dropPosition && (
                <div className={`absolute left-0 right-0 h-1 bg-sky-500 rounded-full z-10 ${
                    dropPosition === 'top' ? '-top-1' : 'bottom-0'
                }`} />
            )}
            <div 
                ref={itemRef}
                className={`group flex items-start gap-2 p-3 rounded-lg transition-all duration-200 
                    ${isCompleted ? 'bg-slate-800/60' : 'bg-slate-800 hover:bg-slate-700/80'}
                    ${dropPosition === 'child' ? 'outline outline-2 outline-sky-500' : ''}`}
            >
                <div className="flex items-center flex-shrink-0 mt-0.5">
                    <div
                        draggable="true"
                        onDragStart={(e) => handlers.onDragStart(e, task)}
                        onDragEnd={handlers.onDragEnd}
                        className="text-slate-500 hover:text-slate-300 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Drag to reorder"
                    >
                        <DragHandleIcon className="w-5 h-5 -ml-1" />
                    </div>
                    <button
                        onClick={() => handlers.onToggleCollapse(task.id)}
                        className={`text-slate-500 hover:text-slate-300 ${task.children.length === 0 ? 'invisible' : ''}`}
                        aria-label={task.collapsed ? 'Expand subtasks' : 'Collapse subtasks'}
                    >
                        <ChevronRightIcon className={`w-5 h-5 transition-transform ${task.collapsed ? '' : 'rotate-90'}`} />
                    </button>
                </div>
                
                <Checkbox 
                    checked={isCompleted}
                    onChange={handleToggleComplete}
                />
                
                <div className="flex-grow">
                    <p className={`text-slate-200 ${isCompleted ? 'line-through text-slate-500' : ''}`}>{task.title}</p>
                     <div className="flex items-center gap-3 mt-1.5">
                        <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${task.type === 'habit' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'}`}>
                            {task.type}
                        </span>
                        {progress && (
                            <div className="flex items-center gap-2">
                                <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-teal-500 transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
                                </div>
                                <span className="text-xs text-slate-400">{progress.done}/{progress.total}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-shrink-0 flex items-center gap-1">
                    <TimerWidget task={task} onSetTimer={handlers.onSetTimer} onTimerControl={handlers.onTimerControl} progress={timerProgress} />
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setIsAddingSubtask(true)} className="p-1 text-slate-400 hover:text-white hover:bg-slate-600 rounded"><PlusIcon className="w-4 h-4" /></button>
                      <button onClick={() => setIsEditing(true)} className="p-1 text-slate-400 hover:text-white hover:bg-slate-600 rounded"><PencilIcon className="w-4 h-4" /></button>
                      <button onClick={() => handlers.onDelete(task.id)} className="p-1 text-red-400 hover:text-white hover:bg-red-500 rounded"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>
            
            {isEditing && <Editor isSubtask={false} onSave={(title, type) => handlers.onUpdate(task.id, title, type)} onCancel={() => setIsEditing(false)} task={task} />}
            {isAddingSubtask && <Editor isSubtask={true} onSave={(title, type) => handlers.onAddSubtask(task.id, title, type)} onCancel={() => setIsAddingSubtask(false)} task={task} />}
        </div>
        
        {!task.collapsed && task.children.length > 0 && (
            <div className="border-l-2 border-slate-700/50">
                {task.children.map(child => (
                    <TaskItem key={child.id} task={child} depth={depth + 1} {...handlers} />
                ))}
            </div>
        )}
    </div>
  );
};

const Editor: React.FC<{
    isSubtask: boolean;
    onSave: (title: string, type: TaskType) => void;
    onCancel: () => void;
    task: Task;
   }> = ({ isSubtask, onSave, onCancel, task }) => {
    const [title, setTitle] = useState(isSubtask ? '' : task.title);
    const [type, setType] = useState<TaskType>(isSubtask ? TaskType.Todo : task.type);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { inputRef.current?.focus(); }, []);
    
    const handleSave = () => { if (title.trim()) { onSave(title, type); onCancel(); }};
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') onCancel();
    };
    
    return (
        <div className="mt-2 ml-14 flex items-center gap-2 p-2 bg-slate-900/50 rounded-md">
            <input 
                ref={inputRef} value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={handleKeyDown}
                className="flex-grow bg-slate-700 text-sm border border-slate-500 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder={isSubtask ? "New subtask title..." : "Edit task title..."}
            />
             <select value={type} onChange={(e) => setType(e.target.value as TaskType)}
                className="bg-slate-700 text-sm border border-slate-500 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-sky-500" >
                <option value={TaskType.Todo}>Todo</option>
                <option value={TaskType.Habit}>Habit</option>
            </select>
            <button onClick={handleSave} className="px-2 py-1 text-xs font-semibold bg-sky-600 hover:bg-sky-500 rounded text-white">Save</button>
            <button onClick={onCancel} className="px-2 py-1 text-xs font-semibold bg-slate-600 hover:bg-slate-500 rounded">Cancel</button>
        </div>
    );
};

const TimerWidget: React.FC<{
    task: Task;
    progress: number;
    onSetTimer: (id: string, duration: number) => void;
    onTimerControl: (id: string, control: 'start' | 'pause' | 'reset' | 'extend') => void;
}> = ({ task, progress, onSetTimer, onTimerControl }) => {
    const [isPopoverOpen, setPopoverOpen] = useState(false);
    const [customMinutes, setCustomMinutes] = useState('');
    const customInputRef = useRef<HTMLInputElement>(null);

    const presets = [ {label: '5m', seconds: 300}, {label: '15m', seconds: 900}, {label: '30m', seconds: 1800}, {label: '1hr', seconds: 3600}];
    const hasTimer = task.timerDuration !== undefined;
    
    useEffect(() => {
      if (isPopoverOpen) {
        setTimeout(() => customInputRef.current?.focus(), 50);
      }
    }, [isPopoverOpen]);

    const handleSetTimer = (seconds: number) => {
        onSetTimer(task.id, seconds);
        setPopoverOpen(false);
    }

    const handleCustomSet = () => {
        const minutes = parseInt(customMinutes, 10);
        if (!isNaN(minutes) && minutes > 0) {
            handleSetTimer(minutes * 60);
            setCustomMinutes('');
        }
    };

    const handleCustomKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleCustomSet();
        }
    };

    if (!hasTimer) {
        return (
            <div className="relative">
                <button onClick={() => setPopoverOpen(!isPopoverOpen)} className="p-1 text-slate-400 hover:text-white hover:bg-slate-600 rounded">
                    <TimerIcon className="w-5 h-5" />
                </button>
                {isPopoverOpen && (
                    <div className="absolute top-full right-0 mt-2 z-20 bg-slate-700 p-2 rounded-md shadow-lg w-auto text-sm">
                        <p className="px-1 pb-2 text-xs text-slate-400">Set Timer</p>
                        <div className="flex gap-1">
                            {presets.map(p => (
                                <button key={p.seconds} onClick={() => handleSetTimer(p.seconds)} className="px-3 py-1 text-xs font-semibold bg-slate-600 hover:bg-slate-500 rounded">{p.label}</button>
                            ))}
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-600 flex gap-2">
                            <input
                                ref={customInputRef}
                                type="number"
                                value={customMinutes}
                                onChange={(e) => setCustomMinutes(e.target.value)}
                                onKeyDown={handleCustomKeyDown}
                                placeholder="Mins"
                                className="w-20 bg-slate-800 border border-slate-600 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button 
                                onClick={handleCustomSet}
                                className="flex-grow px-3 py-1 text-xs font-semibold bg-sky-600 hover:bg-sky-500 rounded text-white"
                            >
                                Set Custom
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }
    
    return (
        <div className="flex items-center gap-2">
            <div className="relative w-7 h-7">
                <CircularProgress progress={progress} />
                <div className="absolute inset-0 flex items-center justify-center">
                    {task.timerState === TimerState.Running ? (
                        <button onClick={() => onTimerControl(task.id, 'pause')} className="text-slate-300 hover:text-white"><PauseIcon className="w-4 h-4" /></button>
                    ) : (
                        <button onClick={() => onTimerControl(task.id, 'start')} className="text-slate-300 hover:text-white"><PlayIcon className="w-4 h-4" /></button>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <span className={`font-mono text-sm ${task.timerState === TimerState.Finished ? 'text-teal-400' : 'text-slate-300'}`}>{formatTime(task.timerRemaining ?? 0)}</span>
                {task.timerState === TimerState.Finished ? (
                     <button onClick={() => onTimerControl(task.id, 'extend')} className="text-teal-400 hover:text-teal-300" title="Extend Timer"><PlusCircleIcon className="w-5 h-5" /></button>
                ) : (
                     <button onClick={() => onTimerControl(task.id, 'reset')} className="text-slate-400 hover:text-white" title="Reset Timer"><RotateCcwIcon className="w-5 h-5" /></button>
                )}
            </div>
        </div>
    );
};

export default TaskItem;