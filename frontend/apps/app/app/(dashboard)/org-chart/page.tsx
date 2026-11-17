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
import { Network, ArrowLeft, ShieldAlert, RefreshCw } from 'lucide-react';

import { usePermissions } from '@/hooks/usePermissions';
import CustomOrgNode from '@/components/org-chart/CustomOrgNode';
import OrgChartControls from '@/components/org-chart/OrgChartControls';
import EmployeeModal from '@/components/org-chart/EmployeeModal';
import { orgChart } from '@dmt/api';

export interface OrgChartUser {
    id: number | string;
    full_name: string;
    role: string;
    role_id: number | string;
    email: string;
    department: string;
    parent_id?: number | string | null;
    children?: OrgChartUser[];
}

/**
 * Represents a single employee record in the org chart dataset.
 */
interface IEmployee {
    id: string;
    name: string;
    role: string;
    roleId: string;
    email: string;
    department: string;
    parentId: string;
}

const NODE_WIDTH = 384;
const NODE_HEIGHT = 256;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction: 'TB' | 'LR' = 'TB') => {
    const isHorizontal = direction === 'LR';

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({
        rankdir: direction,
        nodesep: isHorizontal ? 80 : 100,
        ranksep: isHorizontal ? 120 : 140,
        edgesep: 60,
    });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const targetPos = isHorizontal ? Position.Left : Position.Top;
    const sourcePos = isHorizontal ? Position.Right : Position.Bottom;

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);

        const adjustedX = (nodeWithPosition?.x ?? 0) - NODE_WIDTH / 2;
        const adjustedY = (nodeWithPosition?.y ?? 0) - NODE_HEIGHT / 2;

        return {
            ...node,
            targetPosition: targetPos,
            sourcePosition: sourcePos,
            position: {
                x: adjustedX,
                y: adjustedY
            },
            data: {
                ...node.data,
                targetPosition: targetPos,
                sourcePosition: sourcePos,
            }
        };
    });

    return { nodes: layoutedNodes, edges };
};

// Register custom nodes outside to keep static reference
const NODE_TYPES = {
    customOrgNode: CustomOrgNode
};

function OrgChartPageContent() {
    const router = useRouter();
    const { isManager } = usePermissions();
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { fitView } = useReactFlow();
    const nodeTypes = React.useMemo(() => NODE_TYPES, []);

    // Employees list holds the underlying raw dataset for easy CRUD
    const [employees, setEmployees] = useState<IEmployee[]>([]);
    const [rolesList, setRolesList] = useState<Array<{ id: string | number; name: string }>>([]);
    const [departmentsList, setDepartmentsList] = useState<Array<{ id: string | number; name: string }>>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);

    const flattenHierarchy = (nodes: OrgChartUser[]): IEmployee[] => {
        let flat: IEmployee[] = [];
        nodes.forEach(node => {
            flat.push({
                id: String(node.id),
                name: node.full_name,
                role: node.role,
                roleId: String(node.role_id),
                email: node.email,
                department: node.department,
                parentId: node.parent_id ? String(node.parent_id) : '',
            });
            if (node.children && node.children.length > 0) {
                flat = flat.concat(flattenHierarchy(node.children));
            }
        });
        return flat;
    };

    const fetchOrgChart = useCallback(async () => {
        setIsLoading(true);
        setIsError(false);
        try {
            const [hierarchyRes, rolesRes] = await Promise.all([
                orgChart.getHierarchy(),
                orgChart.getRolesDropdown()
            ]);

            // Fetch departments separately as a non-blocking operation
            orgChart.getDepartments()
                .then((departmentsRes) => {
                    if (departmentsRes) {
                        const deptsData = (departmentsRes as any).data || departmentsRes;
                        if (Array.isArray(deptsData)) {
                            setDepartmentsList(deptsData.map((d: any) => ({ id: d.id, name: d.name })));
                        }
                    }
                })
                .catch((err) => {
                    console.error('Failed to fetch departments separately:', err);
                });

            if (hierarchyRes && hierarchyRes.status && hierarchyRes.data) {
                const flatData = flattenHierarchy(hierarchyRes.data);
                setEmployees(flatData);
            } else {
                setEmployees([]);
            }

            if (rolesRes) {
                const rolesData = (rolesRes as any).data || rolesRes;
                if (Array.isArray(rolesData)) {
                    setRolesList(rolesData.map((r: any) => ({ id: r.id, name: r.role_name || r.name })));
                }
            }
        } catch (error) {
            console.error('Failed to fetch org chart', error);
            toast.error('Failed to load organizational chart');
            setIsError(true);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrgChart();
    }, [fetchOrgChart]);

    // Graph state variables
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR'>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('orgChartLayoutDirection');
            if (saved === 'TB' || saved === 'LR') return saved;
        }
        return 'TB';
    });

    const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

    const handleNodesChange = useCallback(
        (changes: NodeChange[]) => {
            onNodesChange(changes);
            changes.forEach((change) => {
                if (change.type !== 'position') return;
                if (!change.position) return;
                nodePositionsRef.current.set(change.id, change.position);
            });
        },
        [onNodesChange]
    );

    const onNodeDragStop = useCallback((_: any, node: Node) => {
        if (!isManager) return;

        if (node.position) {
            nodePositionsRef.current.set(node.id, node.position);
            if (typeof window !== 'undefined') {
                const positionsObject = Object.fromEntries(nodePositionsRef.current);
                localStorage.setItem('orgChartNodePositions', JSON.stringify(positionsObject));
            }
        }
    }, [isManager]);

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
                toast.success('Employee removed successfully.');
                fetchOrgChart();
            } catch (error) {
                console.error('Failed to delete employee', error);
                toast.error('Failed to delete employee.');
            }
        }
    }, [isManager, fetchOrgChart]);

    // Helper: build raw React Flow nodes from employees
    const buildRawNodes = useCallback((empList: IEmployee[], dir: 'TB' | 'LR'): Node[] => {
        const isHorizontal = dir === 'LR';
        const targetPos = isHorizontal ? Position.Left : Position.Top;
        const sourcePos = isHorizontal ? Position.Right : Position.Bottom;

        return empList.map((emp) => {
            const pos = nodePositionsRef.current.get(emp.id) || { x: 0, y: 0 };

            return {
                id: emp.id,
                type: 'customOrgNode',
                position: pos,
                targetPosition: targetPos,
                sourcePosition: sourcePos,
                width: NODE_WIDTH,
                height: NODE_HEIGHT,
                data: {
                    id: emp.id,
                    name: emp.name,
                    role: emp.role,
                    email: emp.email || '',
                    department: emp.department,
                    isManager,
                    targetPosition: targetPos,
                    sourcePosition: sourcePos,
                    onEdit: handleEditNode,
                    onDelete: handleDeleteNode,
                    onAddChild: handleAddReportNode
                }
            };
        });
    }, [isManager, handleEditNode, handleDeleteNode, handleAddReportNode]);

    // Helper: build edges from employees
    const buildRawEdges = useCallback((empList: IEmployee[]): Edge[] => {
        return empList
            .filter((emp) => emp.parentId && empList.some(p => p.id === emp.parentId))
            .map((emp) => ({
                id: `e-${emp.parentId}-${emp.id}`,
                source: emp.parentId,
                target: emp.id,
                type: 'smoothstep',
                animated: false,
                style: { stroke: 'var(--color-primary)', strokeWidth: 2 },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    width: 20,
                    height: 20,
                    color: 'var(--color-primary)'
                }
            }));
    }, []);

    // Layout arrangement trigger
    const handleAutoArrange = useCallback((dir: 'TB' | 'LR') => {
        if (employees.length === 0) return;

        setLayoutDirection(dir);
        if (typeof window !== 'undefined') {
            localStorage.setItem('orgChartLayoutDirection', dir);
        }

        const rawNodes = buildRawNodes(employees, dir);
        const rawEdges = buildRawEdges(employees);
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rawNodes, rawEdges, dir);

        layoutedNodes.forEach(n => nodePositionsRef.current.set(n.id, n.position));

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);

        setTimeout(() => {
            fitView({ padding: 0.2, duration: 400 });
        }, 80);

        setTimeout(() => {
            fitView({ padding: 0.2, duration: 400 });
        }, 300);

        toast.dismiss();
        toast.success(`Chart rearranged ${dir === 'TB' ? 'Vertically' : 'Horizontally'}!`);
    }, [employees, buildRawNodes, buildRawEdges, fitView, setNodes, setEdges]);

    // Reset layout trigger
    const handleResetChart = useCallback(() => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('orgChartNodePositions');
            localStorage.setItem('orgChartLayoutDirection', 'TB');
        }
        nodePositionsRef.current.clear();
        setLayoutDirection('TB');

        if (employees.length > 0) {
            const rawNodes = buildRawNodes(employees, 'TB');
            const rawEdges = buildRawEdges(employees);
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rawNodes, rawEdges, 'TB');

            layoutedNodes.forEach(n => nodePositionsRef.current.set(n.id, n.position));
            setNodes(layoutedNodes);
            setEdges(layoutedEdges);

            setTimeout(() => {
                fitView({ padding: 0.2, duration: 400 });
            }, 80);

            setTimeout(() => {
                fitView({ padding: 0.2, duration: 400 });
            }, 300);
        }
        toast.success('Chart layout reset successfully.');
    }, [employees, buildRawNodes, buildRawEdges, fitView, setNodes, setEdges]);

    // Initial compilation when employees data loads or changes
    useEffect(() => {
        if (employees.length === 0) {
            setNodes([]);
            setEdges([]);
            return;
        }

        const rawNodes = buildRawNodes(employees, layoutDirection);
        const rawEdges = buildRawEdges(employees);

        // Always compute clean, non-overlapping Dagre layout
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            rawNodes,
            rawEdges,
            layoutDirection
        );

        layoutedNodes.forEach(n => nodePositionsRef.current.set(n.id, n.position));

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);

        const timer1 = setTimeout(() => {
            fitView({ padding: 0.2, duration: 400 });
        }, 100);

        const timer2 = setTimeout(() => {
            fitView({ padding: 0.2, duration: 400 });
        }, 350);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, [employees, layoutDirection, buildRawNodes, buildRawEdges, fitView, setNodes, setEdges]);

    // Edge drawing/creation handler
    const onConnect = useCallback(async (params: Connection) => {
        if (!isManager) {
            toast.error('Only Managers can draw reporting connections.');
            return;
        }

        const { source, target } = params;
        if (!source || !target || source === target) return;

        try {
            await orgChart.updateUser(target, { parent: Number(source) });
            toast.success('Reporting line updated successfully.');
            fetchOrgChart();
        } catch (error: any) {
            console.error('Failed to update reporting line', error);
            const msg = error.data?.message || 'Failed to update reporting line. It might create a circular dependency.';
            toast.error(msg);
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
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ');

            if (empData.id) {
                await orgChart.updateUser(empData.id, {
                    first_name: firstName,
                    last_name: lastName,
                    designation: Number(empData.role),
                    department: empData.department,
                    parent: empData.parentId ? Number(empData.parentId) : null,
                });
                toast.success('Employee details updated successfully!');
            } else {
                await orgChart.createOrUpdateUser({
                    email: empData.email,
                    first_name: firstName,
                    last_name: lastName,
                    designation: Number(empData.role),
                    department: empData.department,
                    parent: empData.parentId ? Number(empData.parentId) : null,
                });
                toast.success('New employee successfully added to org-chart!');
            }
            fetchOrgChart();
            setIsModalOpen(false);
            setEditingEmployee(null);
            setDefaultParentId('');
        } catch (error: any) {
            console.error('Failed to save employee', error);
            const msg = error.data?.message || 'Failed to save employee details.';
            toast.error(msg);
        }
    };

    return (
        <main className="bg-background text-foreground min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 font-sans flex flex-col gap-4 sm:gap-6 overflow-x-hidden">
            <Toaster position="top-center" reverseOrder={false} />

            {/* Header section matching calendar page layout */}
            <div className="flex flex-col sm:flex-row sm:items-start lg:items-center justify-between gap-4">
                <div className="flex items-start gap-3 sm:gap-4">
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
                            <Network className="w-6 h-6 sm:w-7 sm:h-7 text-primary shrink-0" strokeWidth={2.5} />
                            <h1 className="text-2xl sm:text-[1.75rem] font-[900] text-accent tracking-tight leading-none">
                                Organisation Chart
                            </h1>
                        </div>
                    </div>
                </div>

                {/* Float Settings / Controls Panel */}
                <div className="shrink-0 w-full sm:w-auto">
                    <OrgChartControls
                        currentDirection={layoutDirection}
                        onAutoArrange={handleAutoArrange}
                        onAddClick={handleAddClick}
                        onResetChart={handleResetChart}
                        isManager={isManager}
                    />
                </div>
            </div>

            {/* Scrollable Container Wrapper for Small Devices / Bottom Scrollbar */}
            <div className="w-full overflow-x-auto overflow-y-visible pb-2 [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-muted/40 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/60 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-primary [scrollbar-width:thin] [scrollbar-color:var(--color-primary)_transparent]">
                {/* Core Canvas Wrapper Container */}
                <div
                    ref={reactFlowWrapper}
                    className="w-full min-w-[900px] bg-card rounded-2xl sm:rounded-3xl border border-border shadow-[0_4px_24px_rgba(0,0,0,0.02)] relative overflow-hidden"
                    style={{ width: '100%', height: 'calc(100vh - 220px)', minHeight: '600px' }}
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
                            style={{ width: '100%', height: '100%' }}
                            className="w-full h-full"
                            onNodesChange={handleNodesChange}
                            onNodeDragStop={onNodeDragStop}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            nodeTypes={nodeTypes}
                            fitView
                            fitViewOptions={{ padding: 0.2 }}
                            minZoom={0.05}
                            maxZoom={1.5}
                            connectOnClick={isManager}
                            nodesConnectable={isManager}
                            nodesDraggable={isManager}
                            zoomOnScroll={true}
                            panOnDrag={true}
                            proOptions={{ hideAttribution: true }}
                        >
                            <Background color="#cbd5e1" gap={24} size={1} />
                            <Controls showInteractive={false} className="!bg-background !border-border !shadow-md !rounded-xl overflow-hidden" />
                            <MiniMap
                                nodeColor={() => 'var(--color-primary)'}
                                nodeStrokeWidth={3}
                                maskColor="rgba(241, 245, 249, 0.4)"
                                className="!bg-background !border-border !shadow-md !rounded-xl !right-4 !top-4 overflow-hidden"
                                style={{ height: 90, width: 140 }}
                            />
                        </ReactFlow>
                    )}
                </div>
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
                rolesList={rolesList}
                departmentsList={departmentsList}
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
