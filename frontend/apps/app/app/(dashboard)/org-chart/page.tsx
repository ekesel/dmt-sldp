'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,

    Connection,
    Edge,
    MarkerType,
    Node,
    NodeChange,
    Position,
    ReactFlowProvider,
    useReactFlow,
    ReactFlowInstance
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';

import toast, { Toaster } from 'react-hot-toast';
import { Network, ArrowLeft, Shield, ShieldAlert, RefreshCw } from 'lucide-react';

import { usePermissions } from '@/hooks/usePermissions';
import CustomOrgNode from '@/components/org-chart/CustomOrgNode';
import OrgChartControls from '@/components/org-chart/OrgChartControls';
import EmployeeModal from '@/components/org-chart/EmployeeModal';

/**
 * Represents a single employee record in the org chart dataset.
 * avatarColor is intentionally excluded — node colour is derived from
 * the department string at render time via getDeptStyles.
 */
interface IEmployee {
    id: string;
    name: string;
    role: string;
    email: string;
    department: string;
    parentId: string;
}

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
    const isHorizontal = direction === 'LR';

    // Create a fresh graph on every call — reusing a singleton accumulates
    // stale nodes/edges across renders and breaks layout for new nodes.
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({
        rankdir: direction,
        nodesep: 60,
        ranksep: 90
    });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: 260, height: 96 });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
            ...node,
            targetPosition: isHorizontal ? Position.Left : Position.Top,
            sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
            position: {
                x: nodeWithPosition.x - 130,
                y: nodeWithPosition.y - 48
            }
        };
    });

    return { nodes: layoutedNodes, edges };
};


// Register custom nodes
const nodeTypes = {
    customOrgNode: CustomOrgNode
};

function OrgChartPageContent() {
    const router = useRouter();
    const { isManager } = usePermissions();
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { fitView } = useReactFlow();

    // Employees list holds the underlying raw dataset for easy CRUD
    const [employees, setEmployees] = useState<IEmployee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);

    const fetchOrgChart = useCallback(async () => {
        setIsLoading(true);
        setIsError(false);
        try {
            // Load from localStorage to persist mock data
            const saved = localStorage.getItem('dmt-org-chart');
            if (saved) {
                setEmployees(JSON.parse(saved));
            } else {
                setEmployees([]);
            }
        } catch (error) {
            console.error('Failed to fetch org chart', error);
            toast.error('Failed to load organizational chart');
            setIsError(true);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Save to local storage whenever employees change
    useEffect(() => {
        if (!isLoading) {
            localStorage.setItem('dmt-org-chart', JSON.stringify(employees));
        }
    }, [employees, isLoading]);

    useEffect(() => {
        fetchOrgChart();
    }, [fetchOrgChart]);

    // Graph state variables
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR'>('TB');
    const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
    const shouldAutoLayoutRef = useRef(true);

    const handleNodesChange = useCallback(
        (changes: NodeChange[]) => {
            onNodesChange(changes);
            changes.forEach((change) => {
                if (change.type !== 'position') return;
                if (change.dragging) return;
                if (!change.position) return;
                nodePositionsRef.current.set(change.id, change.position);
            });
        },
        [onNodesChange]
    );

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<IEmployee | null>(null);
    const [defaultParentId, setDefaultParentId] = useState('');

    const handleAddClick = useCallback(() => {
        if (!isManager) {
            toast.error('Only Managers can add new employees.');
            return;
        }
        setEditingEmployee(null);
        setDefaultParentId('');
        setIsModalOpen(true);
    }, [isManager]);

    // Trigger editing modal
    const handleEditNode = useCallback((id: string) => {
        if (!isManager) {
            toast.error('Only Managers can edit employee details.');
            return;
        }
        const emp = employees.find(e => e.id === id);
        if (emp) {
            setEditingEmployee(emp);
            setIsModalOpen(true);
        }
    }, [employees, isManager]);

    // Trigger adding child modal directly
    const handleAddReportNode = useCallback((parentId: string) => {
        if (!isManager) {
            toast.error('Only Managers can add new employees.');
            return;
        }
        setEditingEmployee(null);
        setDefaultParentId(parentId);
        setIsModalOpen(true);
    }, [isManager]);

    // Handle delete employee node
    const handleDeleteNode = useCallback(async (id: string) => {
        if (!isManager) {
            toast.error('Only Managers can delete employees.');
            return;
        }

        if (confirm('Are you sure you want to delete this employee?')) {
            try {
                setEmployees(prev => prev.filter(emp => emp.id !== id));
                toast.success('Employee deleted successfully.');
            } catch (error) {
                console.error('Failed to delete employee', error);
                toast.error('Failed to delete employee.');
            }
        }
    }, [isManager]);

    // Compile node list for React Flow based on raw employees dataset
    const compileNodesAndEdges = useCallback(() => {
        // Build React Flow nodes
        const rfNodes: Node[] = employees.map((emp) => {
            const existingPos = nodePositionsRef.current.get(emp.id);

            // Preserve manual positions; for new nodes, place near parent if possible.
            const fallbackPos = (() => {
                if (existingPos) return existingPos;
                const parentPos = emp.parentId ? nodePositionsRef.current.get(emp.parentId) : undefined;
                if (parentPos) return { x: parentPos.x, y: parentPos.y + 150 };
                return { x: 0, y: 0 };
            })();

            return {
                id: emp.id,
                type: 'customOrgNode',
                position: fallbackPos,
                targetPosition: layoutDirection === 'LR' ? Position.Left : Position.Top,
                sourcePosition: layoutDirection === 'LR' ? Position.Right : Position.Bottom,
                width: 260,
                height: 96,
                data: {
                    id: emp.id,
                    name: emp.name,
                    role: emp.role,
                    email: emp.email || '',
                    department: emp.department,
                    isManager,
                    onEdit: handleEditNode,
                    onDelete: handleDeleteNode,
                    onAddChild: handleAddReportNode
                }
            };
        });

        // Build edges based on parentId relationship
        const rfEdges: Edge[] = employees
            .filter((emp) => emp.parentId && employees.some(p => p.id === emp.parentId))
            .map((emp) => ({
                id: `e-${emp.parentId}-${emp.id}`,
                source: emp.parentId,
                target: emp.id,
                type: 'smoothstep',
                animated: true,
                style: { stroke: 'var(--color-primary)', strokeWidth: 2 },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    width: 20,
                    height: 20,
                    color: 'var(--color-primary)'
                }
            }));

        if (shouldAutoLayoutRef.current || nodes.length === 0) {
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
                rfNodes,
                rfEdges,
                layoutDirection
            );

            layoutedNodes.forEach((n) => nodePositionsRef.current.set(n.id, n.position));
            shouldAutoLayoutRef.current = false;

            setNodes(layoutedNodes);
            setEdges(layoutedEdges);
            return;
        }

        // Preserve existing positions and only update node data + edges
        setNodes(rfNodes);
        setEdges(rfEdges);
    }, [employees, layoutDirection, isManager, handleEditNode, handleDeleteNode, handleAddReportNode, setNodes, setEdges]);

    // Recalculate graph whenever employees dataset or filters/layouts update
    useEffect(() => {
        compileNodesAndEdges();
    }, [compileNodesAndEdges]);

    // Re-fit view whenever nodes are added/removed so new nodes are always visible
    useEffect(() => {
        if (nodes.length === 0) return;
        const timer = setTimeout(() => {
            fitView({ padding: 0.3, duration: 600, minZoom: 0.5, maxZoom: 1 });
        }, 150);
        return () => clearTimeout(timer);
    }, [nodes.length, fitView, layoutDirection]);

    // Layout arrangement reset trigger
    const handleAutoArrange = (dir: 'TB' | 'LR') => {
        shouldAutoLayoutRef.current = true;
        setLayoutDirection(dir);
        toast.success(`Chart rearranged ${dir === 'TB' ? 'Vertically' : 'Horizontally'}!`);
    };


    // Edge drawing/creation handler
    const onConnect = useCallback(async (params: Connection) => {
        if (!isManager) {
            toast.error('Only Managers can draw reporting connections.');
            return;
        }

        const { source, target } = params;
        if (!source || !target || source === target) return;

        try {
            setEmployees(prev => prev.map(emp => emp.id === target ? { ...emp, parentId: source } : emp));
            toast.success('Reporting line updated successfully.');
        } catch (error) {
            console.error('Failed to update reporting line', error);
            toast.error('Failed to update reporting line. It might create a circular dependency.');
        }
    }, [isManager]);

    // Modal Create / Save Changes
    const handleSaveEmployee = async (empData: {
        id?: string;
        name: string;
        role: string;
        email: string;
        department: string;
        parentId: string;
    }) => {
        if (!isManager) {
            toast.error('Action denied. Manager credentials required.');
            return;
        }

        try {
            if (empData.id) {
                setEmployees(prev => prev.map(emp => emp.id === empData.id ? { ...emp, ...empData, parentId: empData.parentId || '' } : emp));
                toast.success('Employee details updated successfully!');
            } else {
                const newId = Math.random().toString(36).substr(2, 9);
                setEmployees(prev => [...prev, { ...empData, id: newId, parentId: empData.parentId || '' }]);
                toast.success('New employee successfully added to org-chart!');
            }
            setIsModalOpen(false);
            setEditingEmployee(null);
            setDefaultParentId('');
        } catch (error) {
            console.error('Failed to save employee', error);
            toast.error('Failed to save employee details.');
        }
    };

    // Reset initial dataset
    const handleResetChart = () => {
        shouldAutoLayoutRef.current = true;
        nodePositionsRef.current.clear();
        fetchOrgChart();
        setTimeout(() => fitView({ padding: 0.3, duration: 600 }), 150);
        toast.success('Chart layout reset successfully.');
    };



    return (
        <main className="bg-background text-foreground min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 font-sans flex flex-col gap-6">
            <Toaster position="top-center" reverseOrder={false} />

            {/* Header section matching calendar page layout */}
            <div className="flex flex-col sm:flex-row sm:items-start lg:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                    {/* Go Back button */}
                    <button
                        onClick={() => router.push('/home')}
                        className="mt-1 p-2 rounded-full hover:bg-muted text-foreground transition-colors border border-border bg-card shadow-sm flex items-center justify-center cursor-pointer shrink-0"
                        aria-label="Go back to Home"
                    >
                        <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
                    </button>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Network className="w-7 h-7 text-primary" strokeWidth={2.5} />
                            <h1 className="text-[1.75rem] font-[900] text-accent tracking-tight leading-none">
                                Organization Chart
                            </h1>
                        </div>
                        <p className="text-muted-foreground text-[0.875rem] font-medium leading-normal">
                            Explore, search, and manage the official corporate hierarchy and reporting connections.
                        </p>
                    </div>
                </div>

                {/* Float Settings / Controls Panel */}
                <div className="shrink-0">
                    <OrgChartControls
                        currentDirection={layoutDirection}
                        onAutoArrange={handleAutoArrange}
                        onAddClick={handleAddClick}

                        isManager={isManager}
                    />
                </div>
            </div>

            {/* Core Canvas Wrapper Container */}
            <div
                ref={reactFlowWrapper}
                className="w-full bg-card rounded-3xl border border-border shadow-[0_4px_24px_rgba(0,0,0,0.02)] relative overflow-hidden"
                style={{ height: 'calc(100vh - 320px)', minHeight: '500px' }}
            >
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full w-full space-y-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        <p className="text-muted-foreground font-medium">Loading organization chart...</p>
                    </div>
                ) : isError ? (
                    <div className="flex flex-col items-center justify-center h-full w-full space-y-4 text-center px-4">
                        <div className="bg-destructive/10 p-4 rounded-full">
                            <ShieldAlert className="w-8 h-8 text-destructive" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-semibold text-foreground">Failed to Load Data</h3>
                            <p className="text-muted-foreground text-sm max-w-sm">We couldn't retrieve the organizational chart. Please check your connection and try again.</p>
                        </div>
                        <button
                            onClick={fetchOrgChart}
                            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2 cursor-pointer"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Retry
                        </button>
                    </div>
                ) : employees.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full w-full space-y-6 text-center px-4 bg-muted/10">
                        <div className="bg-primary/10 p-6 rounded-full">
                            <Network className="w-10 h-10 text-primary" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-[800] text-foreground tracking-tight">Empty Organization Chart</h3>
                            <p className="text-muted-foreground font-medium max-w-md mx-auto leading-relaxed">
                                Your organization chart is currently empty. Start by adding the very first employee to build out the hierarchy.
                            </p>
                        </div>
                        <button
                            onClick={handleAddClick}
                            className="mt-4 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-[0.925rem] font-extrabold bg-primary hover:bg-primary/95 text-primary-foreground transition-all cursor-pointer active:scale-95 shadow-md hover:shadow-lg"
                        >
                            <span>+ Create First Employee</span>
                        </button>
                    </div>
                ) : (
                    <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={handleNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.15 }}
                    onInit={(instance: ReactFlowInstance) => {
                        // onInit fires after React Flow has measured the container —
                        // call fitView here so the CEO node is always centred.
                        setTimeout(() => instance.fitView({ padding: 0.15, duration: 400 }), 120);
                    }}
                    minZoom={0.1}
                    maxZoom={1.5}
                    connectOnClick={isManager}
                    nodesConnectable={isManager}
                    nodesDraggable={true}
                    zoomOnScroll={false}
                    panOnScroll={true}
                >
                    <Controls showInteractive={false} className="!bg-background !border-border !shadow-md !rounded-xl overflow-hidden" />
                    <MiniMap
                        nodeColor={(node) => 'var(--color-primary)'}
                        nodeStrokeWidth={3}
                        maskColor="rgba(241, 245, 249, 0.4)"
                        className="!bg-background !border-border !shadow-md !rounded-xl !right-4 !bottom-4 overflow-hidden"
                    />
                </ReactFlow>
                )}
            </div>

            {/* Node Edit / Add Modal */}
            <EmployeeModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingEmployee(null);
                    setDefaultParentId('');
                }}
                onSave={handleSaveEmployee}
                employeeData={editingEmployee}
                employeesList={employees.map(e => ({ id: e.id, name: e.name, role: e.role }))}
                defaultParentId={defaultParentId}
            />
        </main>
    );
}

// Wrapper providing ReactFlow Context
export default function OrgChartPage() {
    return (
        <ReactFlowProvider>
            <OrgChartPageContent />
        </ReactFlowProvider>
    );
}
