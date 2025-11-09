import React, { useRef, useState, useMemo } from 'react';
import { Task, TaskType, ViewMode } from '../types';
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
  viewMode: ViewMode;
}

const NODE_WIDTH = 256; // w-64
const NODE_HEIGHT = 80;  // min-h-[5rem] -> approx 80px
const H_SPACING = 120;
const V_SPACING = 30;

type NodePosition = { task: Task; x: number; y: number; depth: number; };

// This hook implements a proper hierarchical tree layout algorithm.
// It first calculates the total height of each subtree, then positions nodes
// in a top-down pass to ensure parents are centered relative to their children.
const useMindmapLayout = (tasks: Task[]): { positions: NodePosition[], width: number, height: number } => {
    return useMemo(() => {
        const positions: NodePosition[] = [];
        const subtreeHeights = new Map<string, number>();
        let maxWidth = 0;
        let maxHeight = 0;

        // Pass 1: Post-order traversal to calculate subtree heights
        function calculateSubtreeHeight(task: Task): number {
            if (subtreeHeights.has(task.id)) {
                return subtreeHeights.get(task.id)!;
            }

            if (task.collapsed || task.children.length === 0) {
                const height = NODE_HEIGHT;
                subtreeHeights.set(task.id, height);
                return height;
            }

            const childrenHeight = task.children
                .map(calculateSubtreeHeight)
                .reduce((sum, h) => sum + h, 0);
            
            const height = childrenHeight + (task.children.length - 1) * V_SPACING;
            subtreeHeights.set(task.id, height);
            return height;
        }

        tasks.forEach(calculateSubtreeHeight);

        // Pass 2: Pre-order traversal to calculate final positions
        function layout(task: Task, depth: number, startY: number): void {
            const subtreeHeight = subtreeHeights.get(task.id)!;
            const x = depth * (NODE_WIDTH + H_SPACING);
            const y = startY + (subtreeHeight / 2) - (NODE_HEIGHT / 2);
            positions.push({ task, x, y, depth });

            maxWidth = Math.max(maxWidth, x + NODE_WIDTH);
            maxHeight = Math.max(maxHeight, y + NODE_HEIGHT);
            
            if (!task.collapsed && task.children.length > 0) {
                let childStartY = startY;
                for (const child of task.children) {
                    layout(child, depth + 1, childStartY);
                    childStartY += subtreeHeights.get(child.id)! + V_SPACING;
                }
            }
        }

        let currentY = 0;
        for (const task of tasks) {
            layout(task, 0, currentY);
            currentY += subtreeHeights.get(task.id)! + V_SPACING * 2;
        }

        return { positions, width: maxWidth, height: maxHeight };
    }, [tasks]);
};


const MindmapView: React.FC<Omit<TaskListProps, 'viewMode'>> = ({ tasks, ...handlers }) => {
    const { positions: nodePositions, width: canvasWidth, height: canvasHeight } = useMindmapLayout(tasks);
    const [transform, setTransform] = useState({ x: 50, y: 50, scale: 1 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const scaleAmount = -e.deltaY * 0.001;
        const newScale = Math.min(Math.max(0.2, transform.scale + scaleAmount), 2);
        
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const newX = mouseX - (mouseX - transform.x) * (newScale / transform.scale);
        const newY = mouseY - (mouseY - transform.y) * (newScale / transform.scale);

        setTransform({ x: newX, y: newY, scale: newScale });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        // Only pan when clicking the background
        if (e.target !== e.currentTarget) return;
        setIsPanning(true);
        setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
        e.currentTarget.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isPanning) return;
        const newX = e.clientX - panStart.x;
        const newY = e.clientY - panStart.y;
        setTransform(t => ({ ...t, x: newX, y: newY }));
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        setIsPanning(false);
        if (containerRef.current) {
            containerRef.current.style.cursor = 'grab';
        }
    };
    
    const connectorColors = ['stroke-slate-600', 'stroke-sky-600', 'stroke-teal-500', 'stroke-violet-500', 'stroke-rose-500'];

    const connectors = useMemo(() => {
        const lines: { d: string, className: string }[] = [];
        const posMap = new Map(nodePositions.map(p => [p.task.id, p]));
        
        nodePositions.forEach(parentPos => {
            if (!parentPos.task.collapsed && parentPos.task.children.length > 0) {
                parentPos.task.children.forEach(child => {
                    const childPos = posMap.get(child.id);
                    if (childPos) {
                        const startX = parentPos.x + NODE_WIDTH / 2;
                        const startY = parentPos.y + NODE_HEIGHT;
                        const endX = childPos.x + NODE_WIDTH / 2;
                        const endY = childPos.y;
                        
                        // Vertical S-curve
                        const curveFactor = 50;
                        const d = `M ${startX} ${startY} C ${startX} ${startY + curveFactor}, ${endX} ${endY - curveFactor}, ${endX} ${endY}`;
                        const className = connectorColors[childPos.depth % connectorColors.length];
                        lines.push({ d, className });
                    }
                });
            }
        });
        return lines;
    }, [nodePositions]);

    return (
        <div 
          ref={containerRef}
          className="w-full h-[80vh] overflow-hidden relative cursor-grab bg-slate-900/20"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
            <div 
              className="absolute top-0 left-0"
              style={{
                  width: canvasWidth,
                  height: canvasHeight,
                  transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                  transformOrigin: '0 0',
                  transition: isPanning ? 'none' : 'transform 0.2s'
              }}
            >
                <svg width={canvasWidth} height={canvasHeight} className="absolute top-0 left-0 pointer-events-none" style={{ overflow: 'visible' }}>
                    <g>
                    {connectors.map((connector, i) => (
                        <path key={i} d={connector.d} className={`transition-all duration-500 stroke-2 fill-none ${connector.className}`} />
                    ))}
                    </g>
                </svg>
                {nodePositions.map(({ task, x, y, depth }) => (
                    <TaskItem 
                        key={task.id}
                        task={task}
                        depth={depth}
                        viewMode="mindmap"
                        style={{ top: `${y}px`, left: `${x}px` }}
                        {...handlers}
                    />
                ))}
            </div>
        </div>
    );
};


const ListView: React.FC<Omit<TaskListProps, 'viewMode'>> = ({ tasks, ...handlers }) => (
    <div>
      {tasks.map(task => (
        <TaskItem
          key={task.id}
          task={task}
          depth={0}
          viewMode="list"
          {...handlers}
        />
      ))}
    </div>
);

const TaskList: React.FC<TaskListProps> = (props) => {
  if (props.tasks.length === 0) {
    return (
      <div className="text-center py-16 px-6 bg-slate-800/60 border border-slate-700/80 rounded-xl">
        <h3 className="text-xl font-semibold text-slate-400">No tasks yet!</h3>
        <p className="text-slate-500 mt-2">Use the input above to add your first task.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/60 p-2 sm:p-4 rounded-xl border border-slate-700/80 relative">
       {props.viewMode === 'mindmap' ? <MindmapView {...props} /> : <ListView {...props} />}
    </div>
  );
};

export default TaskList;