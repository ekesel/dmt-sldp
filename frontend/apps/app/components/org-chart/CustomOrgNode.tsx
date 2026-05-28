'use client';

import React from 'react';
import { Handle, Position } from 'reactflow';
import { Plus, Edit2, Trash2, Mail } from 'lucide-react';

interface CustomNodeData {
    id: string;
    name: string;
    role: string;
    email?: string;
    department: string;
    isManager: boolean;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    onAddChild?: (id: string) => void;
}

interface CustomOrgNodeProps {
    data: CustomNodeData;
    isConnectable: boolean;
}

export const CustomOrgNode: React.FC<CustomOrgNodeProps> = ({ data, isConnectable }) => {
    const { name, role, email, department, isManager, onEdit, onDelete, onAddChild, id } = data;

    // Map department to nice Tailwind CSS classes
    const getDeptStyles = (dept: string) => {
        return {
            bg: 'bg-primary/5 hover:bg-primary/10',
            border: 'border-primary/60',
            text: 'text-primary',
            badgeBg: 'bg-primary/10 text-primary border-primary/20',
            accentColor: 'var(--color-primary)'
        };
    };

    const formatDeptName = (dept: string) => {
        const labels: Record<string, string> = {
            'backend': 'Backend',
            'frontend': 'Frontend',
            'mobile': 'Mobile',
            'devops': 'DevOps',
            'qa': 'QA / Testing',
            'data': 'Data & Analytics',
            'design': 'Design / UX',
            'product': 'Product',
            'hr': 'HR',
            'finance': 'Finance',
            'sales': 'Sales',
            'marketing': 'Marketing',
            'other': 'Other'
        };
        return labels[dept.toLowerCase()] || dept;
    };

    const styles = getDeptStyles(department);
    const initials = name
        ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : '?';

    return (
        <div className="relative group/node select-none">
            {/* Top Handle - Input Connection */}
            <Handle
                type="target"
                position={Position.Top}
                style={{ background: styles.accentColor, width: '10px', height: '10px', borderRadius: '50%', border: '2px solid white' }}
                isConnectable={isConnectable}
            />

            {/* Custom Node Panel */}
            <div 
                className={`w-[260px] p-4 rounded-2xl bg-card border-2 ${styles.border} shadow-[0_4px_20px_rgba(0,0,0,0.06)] group-hover/node:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden`}
            >
                {/* Visual Top Highlight Strip */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${styles.badgeBg.split(' ')[0]}`} />

                <div className="flex items-center gap-3.5 mt-1">
                    {/* Colored Avatar */}
                    <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-md text-sm border-2 border-white shrink-0"
                        style={{ backgroundColor: 'var(--color-accent)' }}
                    >
                        {initials}
                    </div>

                    {/* Node Text Content */}
                    <div className="min-w-0 flex-1">
                        <h4 className="text-[0.925rem] font-[800] text-card-foreground truncate leading-snug">
                            {name}
                        </h4>
                        <p className="text-[0.725rem] text-muted-foreground font-semibold truncate mt-0.5 leading-normal">
                            {role}
                        </p>
                        {email && (
                            <p className="flex items-center gap-1 text-[0.675rem] text-muted-foreground/70 font-medium truncate mt-0.5">
                                <Mail className="w-3 h-3 shrink-0" />
                                {email}
                            </p>
                        )}
                        <span className={`inline-block mt-1.5 px-2.5 py-0.5 text-[0.625rem] font-bold rounded-lg border uppercase tracking-wider ${styles.badgeBg}`}>
                            {formatDeptName(department)}
                        </span>
                    </div>
                </div>

                {/* Direct Action Overlay (Shown for managers on hover) */}
                {isManager && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/node:opacity-100 transition-opacity duration-300 bg-card/95 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-border">
                        {onEdit && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(id);
                                }}
                                className="p-1 rounded text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Edit Details"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                            </button>
                        )}

                        {onDelete && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(id);
                                }}
                                className="p-1 rounded text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Delete Employee"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Handle - Output Connection */}
            <Handle
                type="source"
                position={Position.Bottom}
                className="flex items-center justify-center !bg-transparent !border-none z-10"
                style={{ width: '22px', height: '22px', bottom: '-11px' }}
                isConnectable={isConnectable}
            >
                <div 
                    onClick={(e) => {
                        if (isManager && onAddChild) {
                            e.stopPropagation();
                            onAddChild(id);
                        }
                    }}
                    className={`w-full h-full rounded-full flex items-center justify-center text-white border-2 border-white shadow-sm transition-transform ${isManager ? 'hover:scale-110 cursor-pointer' : ''}`}
                    style={{ backgroundColor: styles.accentColor }}
                    title={isManager ? "Add Child Node" : undefined}
                >
                    <Plus size={12} strokeWidth={3.5} />
                </div>
            </Handle>
        </div>
    );
};

export default CustomOrgNode;
