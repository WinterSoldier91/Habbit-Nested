import React, { useCallback, useState, useEffect } from 'react';
import { Task, TaskType, TimerState, ViewMode } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import useSound from './hooks/useSound';
import Header from './components/Header';
import TaskInput from './components/TaskInput';
import TaskList from './components/TaskList';

const sampleData: Task[] = [
    {
      id: "sample-1",
      title: 'Morning Routine',
      type: TaskType.Habit,
      completed: false,
      collapsed: false,
      children: [
        { id: "sample-2", title: 'Hydrate (500ml)', type: TaskType.Habit, completed: false, collapsed: false, children: [] },
        { id: "sample-3", title: 'Meditation (10m)', type: TaskType.Habit, completed: false, collapsed: false, children: [] },
      ]
    },
    {
      id: "sample-4",
      title: 'Build personal dashboard',
      type: TaskType.Todo,
      completed: false,
      collapsed: true,
      children: [
        { id: "sample-5", title: 'Set up project structure', type: TaskType.Todo, completed: true, collapsed: false, children: [] },
        { id: "sample-6", title: 'Implement data layer', type: TaskType.Todo, completed: false, collapsed: false, children: [] },
      ]
    }
];
const sampleConnections: { [sourceId: string]: string[] } = {
    "sample-3": ["sample-6"]
};


// Recursive helper to apply mutations to the task tree immutably
const mapTaskTree = (tasks: Task[], id: string, mutation: (task: Task) => Task): Task[] => {
    return tasks.map(task => {
        if (task.id === id) {
            return mutation(task);
        }
        if (task.children.length > 0) {
            return { ...task, children: mapTaskTree(task.children, id, mutation) };
        }
        return task;
    });
};

type DropPosition = 'top' | 'bottom' | 'child';

const App: React.FC = () => {
    const [tasks, setTasks] = useLocalStorage<Task[]>('nested-tasks-v4-nordic', sampleData);
    const [connections, setConnections] = useLocalStorage<{ [sourceId: string]: string[] }>('nested-tasks-connections-v1', sampleConnections);
    const [draggedTask, setDraggedTask] = useState<Task | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('mindmap');
    // FIX: Replaced invalid Base64 string with a valid one for a simple chime sound.
    const playTimerSound = useSound('data:audio/wav;base64,UklGRjQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');

    // --- Timer Logic ---
    useEffect(() => {
        const interval = setInterval(() => {
            setTasks(currentTasks => {
                let changed = false;
                const tick = (tasks: Task[]): Task[] => {
                    return tasks.map(task => {
                        let newSubtask = { ...task, children: tick(task.children) };
                        if (newSubtask.timerState === TimerState.Running && newSubtask.timerRemaining != null && newSubtask.timerRemaining > 0) {
                            changed = true;
                            const newRemaining = newSubtask.timerRemaining - 1;
                            if (newRemaining <= 0) {
                                playTimerSound();
                                return { ...newSubtask, timerRemaining: 0, timerState: TimerState.Finished };
                            }
                            return { ...newSubtask, timerRemaining: newRemaining };
                        }
                        return newSubtask;
                    });
                };
                const newTasks = tick(currentTasks);
                return changed ? newTasks : currentTasks;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [setTasks, playTimerSound]);

    const handleSetTimer = useCallback((id: string, duration: number) => {
        setTasks(prev => mapTaskTree(prev, id, task => ({
            ...task,
            timerDuration: duration,
            timerRemaining: duration,
            timerState: TimerState.Idle,
        })));
    }, [setTasks]);

    const handleTimerControl = useCallback((id: string, control: 'start' | 'pause' | 'reset' | 'extend') => {
        setTasks(prev => mapTaskTree(prev, id, task => {
            switch(control) {
                case 'start': return { ...task, timerState: TimerState.Running };
                case 'pause': return { ...task, timerState: TimerState.Paused };
                case 'reset': return { ...task, timerDuration: undefined, timerRemaining: undefined, timerState: TimerState.Idle };
                case 'extend': 
                    // FIX: Ensure timerDuration is not undefined before using it
                    if (task.timerDuration !== undefined) {
                        return { ...task, timerRemaining: task.timerDuration, timerState: TimerState.Running };
                    }
                    return task;
                default: return task;
            }
        }));
    }, [setTasks]);


    // --- Core Task Logic ---
    const handleAddTask = useCallback((title: string, type: TaskType, parentId: string | null = null) => {
        const newTask: Task = {
            id: crypto.randomUUID(),
            title,
            type,
            completed: false,
            collapsed: false,
            children: [],
            timerState: TimerState.Idle,
        };
        if (parentId) {
            setTasks(prevTasks => mapTaskTree(prevTasks, parentId, task => ({
                ...task,
                collapsed: false,
                children: [...task.children, newTask]
            })));
        } else {
            setTasks(prevTasks => [...prevTasks, newTask]);
        }
    }, [setTasks]);

    const handleToggleComplete = useCallback((id: string, completed: boolean) => {
        const toggleChildren = (tasks: Task[], newCompleted: boolean): Task[] => {
            return tasks.map(t => ({
                ...t,
                completed: newCompleted,
                children: toggleChildren(t.children, newCompleted),
            }));
        };
        setTasks(prevTasks => mapTaskTree(prevTasks, id, task => ({
            ...task,
            completed: completed,
            children: toggleChildren(task.children, completed),
        })));
    }, [setTasks]);

    const handleToggleCollapse = useCallback((id: string) => {
        setTasks(prevTasks => mapTaskTree(prevTasks, id, task => ({ ...task, collapsed: !task.collapsed })));
    }, [setTasks]);
    
    const handleUpdate = useCallback((id: string, title: string, type: TaskType) => {
        setTasks(prevTasks => mapTaskTree(prevTasks, id, task => ({ ...task, title, type })));
    }, [setTasks]);

    const handleDelete = useCallback((id: string) => {
        if (!confirm('Are you sure you want to delete this task and all its subtasks?')) return;

        const deletedIds = new Set<string>();

        const findTaskInTree = (tasksToSearch: Task[], targetId: string): Task | null => {
            for (const task of tasksToSearch) {
                if (task.id === targetId) return task;
                const foundInChildren = findTaskInTree(task.children, targetId);
                if (foundInChildren) return foundInChildren;
            }
            return null;
        };

        const taskToDelete = findTaskInTree(tasks, id);
        if (!taskToDelete) return;

        const collectIds = (task: Task) => {
            deletedIds.add(task.id);
            task.children.forEach(collectIds);
        };
        collectIds(taskToDelete);
        
        setTasks(currentTasks => {
            const cleanTree = (tasks: Task[]): Task[] => {
                return tasks
                    .filter(task => !deletedIds.has(task.id))
                    .map(task => ({ ...task, children: cleanTree(task.children) }));
            };
            return cleanTree(currentTasks);
        });

        setConnections(currentConnections => {
            const newConnections: { [sourceId: string]: string[] } = {};
            Object.entries(currentConnections).forEach(([sourceId, targetIds]) => {
                if (deletedIds.has(sourceId)) return;
                // FIX: Cast `targetIds` to `string[]` to resolve a TypeScript error where it was inferred as `unknown`.
                const newTargets = (targetIds as string[]).filter(targetId => !deletedIds.has(targetId));
                if (newTargets.length > 0) {
                    newConnections[sourceId] = newTargets;
                }
            });
            return newConnections;
        });
    }, [tasks, setTasks, setConnections]);
    
    // --- Drag and Drop Logic ---
    const handleDragStart = useCallback((e: React.DragEvent, task: Task) => {
        setDraggedTask(task);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', task.id);
    }, []);

    const handleDragEnd = useCallback(() => {
        setDraggedTask(null);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent, targetTask: Task, position: DropPosition) => {
        e.preventDefault();
        if (!draggedTask || draggedTask.id === targetTask.id) return;
        
        // 1. Remove the dragged task from its original position
        const removeTask = (tasks: Task[], id: string): Task[] => {
            return tasks.filter(t => t.id !== id).map(t => ({...t, children: removeTask(t.children, id)}));
        };
        const tasksWithoutDragged = removeTask(tasks, draggedTask.id);

        // 2. Add it to the new position
        const addTask = (tasks: Task[], targetId: string, taskToAdd: Task, pos: DropPosition): Task[] => {
            if (pos === 'child') {
                 return tasks.map(t => {
                    if (t.id === targetId) return {...t, collapsed: false, children: [...t.children, taskToAdd]};
                    return {...t, children: addTask(t.children, targetId, taskToAdd, pos)};
                });
            }

            const targetIndex = tasks.findIndex(t => t.id === targetId);
            if (targetIndex !== -1) {
                const newTasks = [...tasks];
                newTasks.splice(targetIndex + (pos === 'bottom' ? 1 : 0), 0, taskToAdd);
                return newTasks;
            }

            return tasks.map(t => ({...t, children: addTask(t.children, targetId, taskToAdd, pos)}));
        };

        const newTasks = addTask(tasksWithoutDragged, targetTask.id, draggedTask, position);
        setTasks(newTasks);
        setDraggedTask(null);
    }, [draggedTask, tasks, setTasks]);

    // --- Connection Logic ---
    const handleAddConnection = useCallback((sourceId: string, targetId: string) => {
        setConnections(prev => {
            const newTargets = [...(prev[sourceId] || [])];
            if (!newTargets.includes(targetId)) {
                newTargets.push(targetId);
            }
            return { ...prev, [sourceId]: newTargets };
        });
    }, [setConnections]);

    const handleDeleteConnection = useCallback((sourceId: string, targetId: string) => {
        setConnections(prev => {
            const newTargets = (prev[sourceId] || []).filter(id => id !== targetId);
            const newConnections = { ...prev };
            if (newTargets.length > 0) {
                newConnections[sourceId] = newTargets;
            } else {
                delete newConnections[sourceId];
            }
            return newConnections;
        });
    }, [setConnections]);

    // --- Global Actions ---
    const handleExpandAll = () => {
        const setCollapsed = (tasks: Task[], isCollapsed: boolean): Task[] => 
            tasks.map(t => ({...t, collapsed: isCollapsed, children: setCollapsed(t.children, isCollapsed)}));
        setTasks(prev => setCollapsed(prev, false));
    };

    const handleCollapseAll = () => {
        const setCollapsed = (tasks: Task[], isCollapsed: boolean): Task[] => 
            tasks.map(t => ({...t, collapsed: isCollapsed, children: setCollapsed(t.children, isCollapsed)}));
        setTasks(prev => setCollapsed(prev, true));
    };

    const handleClearCompleted = () => {
        if (!confirm('Are you sure you want to clear all completed tasks?')) return;
        const filterCompleted = (tasks: Task[]): Task[] => {
            return tasks
                .filter(t => !t.completed)
                .map(t => ({ ...t, children: filterCompleted(t.children) }));
        };
        setTasks(filterCompleted);
    };

    const handleReset = () => {
        if (confirm('Are you sure you want to reset all data to the sample data?')) {
            setTasks(sampleData);
            setConnections(sampleConnections);
        }
    };
    
    // FIX: Add return statement with JSX to render the app UI.
    return (
        <div className="text-slate-100 min-h-screen font-sans p-4 sm:p-6 lg:p-8">
            <div className="">
                <Header 
                    onExpandAll={handleExpandAll}
                    onCollapseAll={handleCollapseAll}
                    onClearCompleted={handleClearCompleted}
                    onReset={handleReset}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                />
                <main>
                    <TaskInput 
                        onAddTask={(title, type) => handleAddTask(title, type, null)} 
                    />
                    <TaskList 
                        tasks={tasks}
                        connections={connections}
                        viewMode={viewMode}
                        onToggleComplete={handleToggleComplete}
                        onToggleCollapse={handleToggleCollapse}
                        onDelete={handleDelete}
                        onUpdate={handleUpdate}
                        onAddSubtask={(parentId, title, type) => handleAddTask(title, type, parentId)}
                        onSetTimer={handleSetTimer}
                        onTimerControl={handleTimerControl}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDrop={handleDrop}
                        onAddConnection={handleAddConnection}
                        onDeleteConnection={handleDeleteConnection}
                    />
                </main>
            </div>
        </div>
    );
};

// FIX: Add default export for the App component.
export default App;