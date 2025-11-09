export enum TaskType {
  Todo = 'todo',
  Habit = 'habit',
}

export enum TimerState {
  Idle = 'idle',
  Running = 'running',
  Paused = 'paused',
  Finished = 'finished',
}

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  completed: boolean;
  collapsed: boolean;
  children: Task[];
  timerDuration?: number; // in seconds
  timerRemaining?: number; // in seconds
  timerState?: TimerState;
  connections?: string[]; // Array of task IDs it connects to
}

export type ViewMode = 'list' | 'mindmap';