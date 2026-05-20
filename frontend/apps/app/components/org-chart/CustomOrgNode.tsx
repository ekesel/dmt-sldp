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
        const d = dept.toLowerCase();
        if (d.includes('exec') || d.includes('ceo')) {
            return {
                bg: 'bg-indigo-50/90 hover:bg-indigo-100/90',
                border: 'border-indigo-500',
                text: 'text-indigo-700',
                badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
                accentColor: '#6366f1'
            };
        }
        if (d.includes('eng') || d.includes('cto') || d.includes('tech') || d.includes('dev') || d.includes('qa') || d.includes('ai')) {
            return {
                bg: 'bg-teal-50/90 hover:bg-teal-100/90',
                border: 'border-teal-500',
                text: 'text-teal-700',
                badgeBg: 'bg-teal-100 text-teal-800 border-teal-200',
                accentColor: '#0d9488'
            };
        }
        if (d.includes('hr') || d.includes('people') || d.includes('talent')) {
            return {
                bg: 'bg-rose-50/90 hover:bg-rose-100/90',
                border: 'border-rose-500',
                text: 'text-rose-700',
                badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
                accentColor: '#ec4899'
            };
        }
        if (d.includes('sales') || d.includes('market')) {
            return {
                bg: 'bg-amber-50/90 hover:bg-amber-100/90',
                border: 'border-amber-500',
                text: 'text-amber-700',
                badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
                accentColor: '#f59e0b'
            };
        }
        // Product, PM or general
        return {
            bg: 'bg-purple-50/90 hover:bg-purple-100/90',
            border: 'border-purple-500',
            text: 'text-purple-700',
            badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
            accentColor: '#a855f7'
        };
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
                className={`w-[260px] p-4 rounded-2xl bg-white border-2 ${styles.border} shadow-[0_4px_20px_rgba(0,0,0,0.06)] group-hover/node:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden`}
            >
                {/* Visual Top Highlight Strip */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${styles.badgeBg.split(' ')[0]}`} />

                <div className="flex items-center gap-3.5 mt-1">
                    {/* Colored Avatar */}
                    <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-md text-sm border-2 border-white shrink-0"
                        style={{ backgroundColor: styles.accentColor }}
                    >
                        {initials}
                    </div>

                    {/* Node Text Content */}
                    <div className="min-w-0 flex-1">
                        <h4 className="text-[0.925rem] font-[800] text-gray-900 truncate leading-snug">
                            {name}
                        </h4>
                        <p className="text-[0.725rem] text-gray-500 font-semibold truncate mt-0.5 leading-normal">
                            {role}
                        </p>
                        {email && (
                            <p className="flex items-center gap-1 text-[0.675rem] text-gray-400 font-medium truncate mt-0.5">
                                <Mail className="w-3 h-3 shrink-0" />
                                {email}
                            </p>
                        )}
                        <span className={`inline-block mt-1.5 px-2.5 py-0.5 text-[0.625rem] font-bold rounded-lg border uppercase tracking-wider ${styles.badgeBg}`}>
                            {department}
                        </span>
                    </div>
                </div>

                {/* Direct Action Overlay (Shown for managers on hover) */}
                {isManager && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/node:opacity-100 transition-opacity duration-300 bg-white/95 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-gray-100">
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
                        {onAddChild && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddChild(id);
                                }}
                                className="p-1 rounded text-teal-600 hover:bg-teal-50 transition-colors cursor-pointer"
                                title="Add Direct Report"
                            >
                                <Plus className="w-3.5 h-3.5 font-bold" />
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
                style={{ background: styles.accentColor, width: '10px', height: '10px', borderRadius: '50%', border: '2px solid white' }}
                isConnectable={isConnectable}
            />
        </div>
    );
};

export default CustomOrgNode;
