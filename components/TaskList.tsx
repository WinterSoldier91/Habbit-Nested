import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { Task, TaskType, ViewMode } from '../types';
import TaskItem from './TaskItem';
import { RotateCcwIcon } from './Icons';

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
  onAddConnection: (sourceId: string, targetId: string) => void;
  onDeleteConnection: (sourceId: string, targetId: string) => void;
}

interface TaskListProps extends TaskHandlers {
  tasks: Task[];
  connections: { [sourceId: string]: string[] };
  viewMode: ViewMode;
}

const NODE_WIDTH = 256; // w-64
const NODE_HEIGHT = 80;  // min-h-[5rem] -> approx 80px
const H_SPACING = 120;
const V_SPACING = 60; // Increased spacing for clarity

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


const MindmapView: React.FC<Omit<TaskListProps, 'viewMode'>> = ({ tasks, connections, ...handlers }) => {
    const { positions: nodePositions, width: canvasWidth, height: canvasHeight } = useMindmapLayout(tasks);
    const [transform, setTransform] = useState({ x: 50, y: 50, scale: 1 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [drawingConnection, setDrawingConnection] = useState<{ sourceId: string, startX: number, startY: number, endX: number, endY: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const didInitialFit = useRef(false);

    const handleFitToView = useCallback(() => {
        if (!containerRef.current || canvasWidth === 0 || canvasHeight === 0) {
            setTransform({ x: 50, y: 50, scale: 1 });
            return;
        }

        const { width: viewWidth, height: viewHeight } = containerRef.current.getBoundingClientRect();
        
        // Add a margin so the content doesn't touch the edges
        const marginFactor = 0.90; 
        
        const scaleX = viewWidth / canvasWidth;
        const scaleY = viewHeight / canvasHeight;
        
        const scale = Math.min(scaleX, scaleY) * marginFactor;

        // Center the content
        const scaledWidth = canvasWidth * scale;
        const scaledHeight = canvasHeight * scale;
        const x = (viewWidth - scaledWidth) / 2;
        const y = (viewHeight - scaledHeight) / 2;
        
        setTransform({ x, y, scale });
    }, [canvasWidth, canvasHeight]);
    
    useEffect(() => {
        // Fit the view the very first time the layout is calculated.
        // Subsequent changes (like collapsing nodes) won't auto-refit,
        // allowing the user to maintain their current zoom/pan.
        // They can always click the button to re-fit.
        if (!didInitialFit.current && canvasWidth > 0 && canvasHeight > 0) {
            handleFitToView();
            didInitialFit.current = true;
        }
    }, [canvasWidth, canvasHeight, handleFitToView]);

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
        if (isPanning) {
            const newX = e.clientX - panStart.x;
            const newY = e.clientY - panStart.y;
            setTransform(t => ({ ...t, x: newX, y: newY }));
        } else if (drawingConnection && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const endX = (e.clientX - rect.left - transform.x) / transform.scale;
            const endY = (e.clientY - rect.top - transform.y) / transform.scale;
            setDrawingConnection(d => d ? { ...d, endX, endY } : null);
        }
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        if (isPanning) {
            setIsPanning(false);
            if (containerRef.current) {
                containerRef.current.style.cursor = 'grab';
            }
        }
        if (drawingConnection) {
            const targetEl = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-task-id]');
            if (targetEl) {
                const targetId = targetEl.getAttribute('data-task-id');
                if (targetId && targetId !== drawingConnection.sourceId) {
                    handlers.onAddConnection(drawingConnection.sourceId, targetId);
                }
            }
            setDrawingConnection(null);
        }
    };
    
    const handleStartDrawingConnection = (sourceTask: Task, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!containerRef.current) return;
        
        const posMap = new Map(nodePositions.map(p => [p.task.id, p]));
        const sourcePos = posMap.get(sourceTask.id);
        if (!sourcePos) return;

        const startX = sourcePos.x + NODE_WIDTH;
        const startY = sourcePos.y + NODE_HEIGHT / 2;

        const rect = containerRef.current.getBoundingClientRect();
        const endX = (e.clientX - rect.left - transform.x) / transform.scale;
        const endY = (e.clientY - rect.top - transform.y) / transform.scale;

        setDrawingConnection({ sourceId: sourceTask.id, startX, startY, endX, endY });
    };

    const connectorColors = ['stroke-slate-600', 'stroke-sky-600', 'stroke-teal-500', 'stroke-violet-500', 'stroke-rose-500'];

    const { hierarchicalConnectors, customConnectors } = useMemo(() => {
        const hConnectors: { d: string, className: string }[] = [];
        const cConnectors: { d: string, sourceId: string, targetId: string }[] = [];
        const posMap = new Map(nodePositions.map(p => [p.task.id, p]));
        
        nodePositions.forEach(sourcePos => {
            // Hierarchical connections (Parent -> Child)
            if (!sourcePos.task.collapsed && sourcePos.task.children.length > 0) {
                sourcePos.task.children.forEach(child => {
                    const childPos = posMap.get(child.id);
                    if (childPos) {
                        const startX = sourcePos.x + NODE_WIDTH;
                        const startY = sourcePos.y + NODE_HEIGHT / 2;
                        const endX = childPos.x;
                        const endY = childPos.y + NODE_HEIGHT / 2;
                        
                        // S-curve for a clean horizontal-to-horizontal connection
                        const curveFactor = (endX - startX) * 0.4;
                        const d = `M ${startX} ${startY} C ${startX + curveFactor} ${startY}, ${endX - curveFactor} ${endY}, ${endX} ${endY}`;

                        const className = connectorColors[childPos.depth % connectorColors.length];
                        hConnectors.push({ d, className });
                    }
                });
            }
        });
        // Custom connections (flowchart-style) from the separate state
        Object.entries(connections).forEach(([sourceId, targetIds]) => {
            const sourcePos = posMap.get(sourceId);
            if (sourcePos) {
                // FIX: Cast `targetIds` to `string[]` to resolve a TypeScript error where it was inferred as `unknown`.
                (targetIds as string[]).forEach(targetId => {
                     const targetPos = posMap.get(targetId);
                     if (targetPos) {
                        const startX = sourcePos.x + NODE_WIDTH;
                        const startY = sourcePos.y + NODE_HEIGHT / 2;
                        const endX = targetPos.x;
                        const endY = targetPos.y + NODE_HEIGHT / 2;

                        let d: string;
                        // When connecting from a deeper node to a shallower one (right-to-left "backwards" connection),
                        // use a large, non-intersecting arc to maintain clarity.
                        if (sourcePos.depth > targetPos.depth) {
                            const midPointY = (startY + endY) / 2;
                            const verticalGap = 100;
                            
                            // Route the arc above the main diagram if the connection is mostly in the top half,
                            // otherwise route it below to avoid clutter.
                            const detourY = midPointY < canvasHeight / 2 
                                ? -verticalGap 
                                : canvasHeight + verticalGap;
                            
                            // The horizontal extent of the curve's control points, scales with distance.
                            const controlPointXOffset = Math.max(60, (startX - endX) * 0.2);

                            d = `M ${startX} ${startY} C ${startX + controlPointXOffset} ${detourY}, ${endX - controlPointXOffset} ${detourY}, ${endX} ${endY}`;
                        } else {
                            // For forward or same-level connections, a standard S-curve is cleaner and more direct.
                            const curveFactor = (endX - startX) * 0.4;
                            d = `M ${startX} ${startY} C ${startX + curveFactor} ${startY}, ${endX - curveFactor} ${endY}, ${endX} ${endY}`;
                        }
                        cConnectors.push({ d, sourceId: sourcePos.task.id, targetId });
                    }
                })
            }
        });
        return { hierarchicalConnectors: hConnectors, customConnectors: cConnectors };
    }, [nodePositions, connections, canvasHeight]);

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
                  transition: isPanning ? 'none' : 'transform 0.2s ease-out'
              }}
            >
                <svg width={canvasWidth} height={canvasHeight} className="absolute top-0 left-0 pointer-events-none" style={{ overflow: 'visible' }}>
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="8" refY="3.5" orient="auto" markerUnits="strokeWidth">
                            <polygon points="0 0, 10 3.5, 0 7" className="fill-slate-500" />
                        </marker>
                         <marker id="arrowhead-hover" markerWidth="10" markerHeight="7" refX="8" refY="3.5" orient="auto" markerUnits="strokeWidth">
                            <polygon points="0 0, 10 3.5, 0 7" className="fill-sky-400" />
                        </marker>
                    </defs>
                    <g>
                    {hierarchicalConnectors.map((connector, i) => (
                        <path key={`h-${i}`} d={connector.d} className={`transition-all duration-500 stroke-2 fill-none ${connector.className}`} />
                    ))}
                    {customConnectors.map(({ d, sourceId, targetId }) => (
                         <g key={`c-${sourceId}-${targetId}`} className="group pointer-events-auto cursor-pointer" onClick={() => handlers.onDeleteConnection(sourceId, targetId)}>
                            <path d={d} className="stroke-[10px] fill-none stroke-transparent" />
                            <path d={d} className="stroke-2 fill-none stroke-slate-500 stroke-dasharray-4 group-hover:stroke-sky-400 transition-all" markerEnd="url(#arrowhead)" />
                        </g>
                    ))}
                    {drawingConnection && (
                        <path
                            d={`M ${drawingConnection.startX} ${drawingConnection.startY} L ${drawingConnection.endX} ${drawingConnection.endY}`}
                            className="stroke-2 fill-none stroke-sky-500"
                            markerEnd="url(#arrowhead-hover)"
                        />
                    )}
                    </g>
                </svg>
                {nodePositions.map(({ task, x, y, depth }) => (
                    <TaskItem 
                        key={task.id}
                        task={task}
                        depth={depth}
                        viewMode="mindmap"
                        style={{ top: `${y}px`, left: `${x}px` }}
                        onStartDrawingConnection={handleStartDrawingConnection}
                        {...handlers}
                    />
                ))}
            </div>
             <button
                onClick={handleFitToView}
                className="absolute top-4 right-4 z-10 p-2 bg-slate-700/50 hover:bg-slate-700 rounded-full transition-colors text-slate-300 hover:text-white"
                title="Fit to View"
            >
                <RotateCcwIcon className="w-5 h-5" />
            </button>
        </div>
    );
};


const ListView: React.FC<Omit<TaskListProps, 'viewMode' | 'connections'>> = ({ tasks, ...handlers }) => (
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