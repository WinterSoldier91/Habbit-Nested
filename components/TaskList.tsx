import React from 'react';
import { Task, TaskType } from '../types';
import TaskItem from './TaskItem';

type DropPosition = 'top' | 'bottom' | 'child';

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

interface TaskListProps extends TaskHandlers {
  tasks: Task[];
}

const TaskList: React.FC<TaskListProps> = ({ tasks, ...handlers }) => {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-16 px-6 bg-slate-800/50 border border-slate-700 rounded-xl">
        <h3 className="text-xl font-semibold text-slate-400">No tasks yet!</h3>
        <p className="text-slate-500 mt-2">Use the input above to add your first task or break down a goal with AI.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 p-2 sm:p-4 rounded-xl border border-slate-700">
      {tasks.map(task => (
        <TaskItem
          key={task.id}
          task={task}
          depth={0}
          {...handlers}
        />
      ))}
    </div>
  );
};

export default TaskList;