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
import html2canvas from 'html2canvas-pro';
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

// Initial dummy organizational data
const INITIAL_EMPLOYEES = [
    { id: '1', name: 'Sarah Jenkins', role: 'Chief Executive Officer (CEO)', email: 'sarah.jenkins@company.com', department: 'Executive', parentId: '' },
    
    { id: '2', name: 'Marcus Chen', role: 'Chief Technology Officer (CTO)', email: 'marcus.chen@company.com', department: 'Engineering', parentId: '1' },
    { id: '3', name: 'Elena Rostova', role: 'Head of HR & People', email: 'elena.rostova@company.com', department: 'HR', parentId: '1' },
    { id: '4', name: 'David Miller', role: 'VP of Sales & Marketing', email: 'david.miller@company.com', department: 'Sales', parentId: '1' },
    
    { id: '5', name: 'Sophia Lin', role: 'Engineering Tech Lead', email: 'sophia.lin@company.com', department: 'Engineering', parentId: '2' },
    { id: '6', name: 'Alex Rivera', role: 'QA Lead Analyst', email: 'alex.rivera@company.com', department: 'Engineering', parentId: '2' },
    { id: '7', name: 'Liam Carter', role: 'Lead Product Manager', email: 'liam.carter@company.com', department: 'Product', parentId: '2' },
    
    { id: '8', name: 'Chloe Zhao', role: 'AI-ML Solutions Engineer', email: 'chloe.zhao@company.com', department: 'Engineering', parentId: '5' },
    { id: '9', name: 'Jack Vance', role: 'Senior Backend Developer', email: 'jack.vance@company.com', department: 'Engineering', parentId: '5' },
    { id: '10', name: 'Chloe Vance', role: 'Senior Frontend Developer', email: 'chloe.vance@company.com', department: 'Engineering', parentId: '5' },
    { id: '11', name: 'Jordan Lee', role: 'Associate PM', email: 'jordan.lee@company.com', department: 'Product', parentId: '7' }
];


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
    const [employees, setEmployees] = useState<IEmployee[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('dmt_org_chart_employees');
            if (saved) {
                try {
                    return JSON.parse(saved) as IEmployee[];
                } catch (e) {
                    console.error('Failed to parse org chart local storage', e);
                }
            }
        }
        return INITIAL_EMPLOYEES;
    });

    // Save to local storage whenever employees dataset changes
    useEffect(() => {
        localStorage.setItem('dmt_org_chart_employees', JSON.stringify(employees));
    }, [employees]);

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
    const handleDeleteNode = useCallback((id: string) => {
        if (!isManager) {
            toast.error('Only Managers can delete employees.');
            return;
        }

        if (confirm('Are you sure you want to delete this employee? This will reset reporting lines for their subordinates.')) {
            // Delete employee and re-parent their direct reports to their own parent (skip a level) or set to none.
            // Use the functional updater so the lookup is always based on the latest employees state.
            setEmployees((prev) => {
                const deletedEmp = prev.find((e) => e.id === id);
                const newParentId = deletedEmp?.parentId ?? '';

                return prev
                    .filter((e) => e.id !== id)
                    .map((e) => (e.parentId === id ? { ...e, parentId: newParentId } : e));
            });
            toast.success('Employee deleted and organization re-routed successfully.');
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
                style: { stroke: '#94a3b8', strokeWidth: 2 },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    width: 20,
                    height: 20,
                    color: '#94a3b8'
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
            fitView({ padding: 0.3, duration: 500 });
        }, 50);
        return () => clearTimeout(timer);
    }, [nodes.length, fitView]);

    // Layout arrangement reset trigger
    const handleAutoArrange = (dir: 'TB' | 'LR') => {
        shouldAutoLayoutRef.current = true;
        setLayoutDirection(dir);
        toast.success(`Chart rearranged ${dir === 'TB' ? 'Vertically' : 'Horizontally'}!`);
    };


    // Edge drawing/creation handler
    const onConnect = useCallback((params: Connection) => {
        if (!isManager) {
            toast.error('Only Managers can draw reporting connections.');
            return;
        }

        const { source, target } = params;
        if (!source || !target || source === target) return;

        // Prevent circular relationship loops (source cannot be reporting to target, directly or indirectly).
        // Use the functional updater so the check always uses the latest employees state.
        let circular = false;
        setEmployees((prev) => {
            const byId = new Map(prev.map((e) => [e.id, e] as const));

            let currentId = source;
            while (true) {
                const current = byId.get(currentId);
                if (!current) break;
                if (current.parentId === target) {
                    circular = true;
                    return prev;
                }
                if (!current.parentId) break;
                currentId = current.parentId;
            }

            return prev.map((emp) => (emp.id === target ? { ...emp, parentId: source } : emp));
        });

        if (circular) {
            toast.error('Cannot establish reporting connection: this would create a circular reporting structure!');
            return;
        }

        toast.success('Reporting line updated successfully.');
    }, [isManager]);

    // Modal Create / Save Changes
    const handleSaveEmployee = (empData: {
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

        if (empData.id) {
            // Editing existing
            setEmployees(prev => prev.map(emp => 
                emp.id === empData.id 
                    ? { 
                        ...emp, 
                        name: empData.name, 
                        role: empData.role, 
                        email: empData.email,
                        department: empData.department, 
                        parentId: empData.parentId 
                      } 
                    : emp
            ));
            toast.success('Employee details updated successfully!');
        } else {
            // Creating new
            // IDs must not assume numeric strings (parseInt → NaN can corrupt the sequence).
            // Generate a unique, stable string id.
            const newId =
                typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                    ? crypto.randomUUID()
                    : `emp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
            const newEmp = {
                id: newId,
                name: empData.name,
                role: empData.role,
                email: empData.email,
                department: empData.department,
                parentId: empData.parentId
            };
            setEmployees(prev => [...prev, newEmp]);
            toast.success('New employee successfully added to org-chart!');
        }
        setIsModalOpen(false);
        setEditingEmployee(null);
        setDefaultParentId('');
    };

    // Reset initial dataset
    const handleResetChart = () => {
        if (!isManager) {
            toast.error('Only Managers can reset the organizational chart.');
            return;
        }
        if (confirm('Are you sure you want to reset the chart back to initial seed corporate structure? Your current changes will be overwritten.')) {
            shouldAutoLayoutRef.current = true;
            nodePositionsRef.current.clear();
            setEmployees(INITIAL_EMPLOYEES);
            toast.success('Chart reset successfully.');
        }
    };

    // Export current chart layout as PNG using html2canvas
    const handleExportPNG = async () => {
        if (!reactFlowWrapper.current) return;
        const toastId = toast.loading('Generating high-res PNG export...');

        try {
            // Momentarily hide graph controllers/minimap overlay lines in Canvas if needed
            const flowContainer = reactFlowWrapper.current.querySelector('.react-flow__viewport') as HTMLElement;
            if (!flowContainer) {
                toast.error('Failed to locate chart viewport', { id: toastId });
                return;
            }

            // Perform html2canvas rendering
            const canvas = await html2canvas(reactFlowWrapper.current, {
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#f9fafb',
                logging: false,
                scale: 2 // Make it higher resolution
            });

            const link = document.createElement('a');
            link.download = `Org_Chart_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            toast.success('PNG exported successfully!', { id: toastId });
        } catch (e) {
            console.error('Export failed', e);
            toast.error('Failed to export image', { id: toastId });
        }
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
                                Company Org Chart
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
                        onExportPNG={handleExportPNG}
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
                >
                    <Background color="#cbd5e1" gap={20} size={1.2} />
                    <Controls showInteractive={false} className="!bg-white !border-gray-200 !shadow-md !rounded-xl overflow-hidden" />
                    <MiniMap 
                        nodeColor={(node) => {
                            // Match mini-map node color to department
                            const dept = (node.data?.department || '').toLowerCase();
                            if (dept.includes('exec') || dept.includes('ceo')) return '#6366f1';
                            if (dept.includes('eng') || dept.includes('cto') || dept.includes('tech') || dept.includes('dev') || dept.includes('qa') || dept.includes('ai')) return '#0d9488';
                            if (dept.includes('hr')) return '#ec4899';
                            if (dept.includes('sales')) return '#f59e0b';
                            return '#a855f7';
                        }}
                        nodeStrokeWidth={3}
                        maskColor="rgba(241, 245, 249, 0.4)"
                        className="!bg-white !border-gray-200 !shadow-md !rounded-xl !right-4 !bottom-4 overflow-hidden"
                    />
                </ReactFlow>
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
