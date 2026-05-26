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
import { orgChart, OrgChartUser } from '@dmt/api';

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

const flattenHierarchy = (users: OrgChartUser[], parentId: string = ''): IEmployee[] => {
    let result: IEmployee[] = [];
    for (const user of users) {
        result.push({
            id: String(user.id),
            name: user.full_name || '',
            role: user.role || '',
            email: user.email || '',
            department: user.department || '',
            parentId: user.parent_id ? String(user.parent_id) : parentId
        });
        if (user.children && user.children.length > 0) {
            result = result.concat(flattenHierarchy(user.children, String(user.id)));
        }
    }
    return result;
};


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

    const fetchOrgChart = useCallback(async () => {
        try {
            const response = await orgChart.getHierarchy();
            if (response?.status && response.data) {
                setEmployees(flattenHierarchy(response.data));
            }
        } catch (error) {
            console.error('Failed to fetch org chart', error);
            toast.error('Failed to load organizational chart');
        }
    }, []);

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
                await orgChart.deleteUser(id);
                toast.success('Employee deleted successfully.');
                fetchOrgChart();
            } catch (error) {
                console.error('Failed to delete employee', error);
                toast.error('Failed to delete employee.');
            }
        }
    }, [isManager, fetchOrgChart]);

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
    const onConnect = useCallback(async (params: Connection) => {
        if (!isManager) {
            toast.error('Only Managers can draw reporting connections.');
            return;
        }

        const { source, target } = params;
        if (!source || !target || source === target) return;

        try {
            await orgChart.updateUser(target, { parent: source });
            toast.success('Reporting line updated successfully.');
            fetchOrgChart();
        } catch (error) {
            console.error('Failed to update reporting line', error);
            toast.error('Failed to update reporting line. It might create a circular dependency.');
        }
    }, [isManager, fetchOrgChart]);

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
            const nameParts = empData.name.trim().split(' ');
            const first_name = nameParts[0];
            const last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;
            
            if (empData.id) {
                await orgChart.updateUser(empData.id, {
                    first_name,
                    last_name,
                    department: empData.department,
                    parent: empData.parentId ? empData.parentId : undefined
                });
                toast.success('Employee details updated successfully!');
            } else {
                await orgChart.createOrUpdateUser({
                    email: empData.email,
                    first_name,
                    last_name,
                    department: empData.department,
                    parent: empData.parentId ? empData.parentId : undefined
                });
                toast.success('New employee successfully added to org-chart!');
            }
            setIsModalOpen(false);
            setEditingEmployee(null);
            setDefaultParentId('');
            fetchOrgChart();
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
        toast.success('Chart layout reset successfully.');
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
                    <Controls showInteractive={false} className="!bg-background !border-border !shadow-md !rounded-xl overflow-hidden" />
                    <MiniMap
                        nodeColor={(node) => {
                            const dept = (node.data?.department || '').toLowerCase();
                            if (dept === 'other' || dept.includes('exec') || dept.includes('ceo')) return '#6366f1'; // indigo
                            if (['backend', 'frontend', 'mobile', 'devops', 'qa', 'tech', 'eng', 'engineering'].includes(dept)) return '#0d9488'; // teal
                            if (['hr', 'people'].includes(dept)) return '#ec4899'; // rose
                            if (['sales', 'marketing', 'market'].includes(dept)) return '#f59e0b'; // amber
                            if (['data', 'finance'].includes(dept)) return '#10b981'; // emerald
                            return '#a855f7'; // purple (product, design, etc)
                        }}
                        nodeStrokeWidth={3}
                        maskColor="rgba(241, 245, 249, 0.4)"
                        className="!bg-background !border-border !shadow-md !rounded-xl !right-4 !bottom-4 overflow-hidden"
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
