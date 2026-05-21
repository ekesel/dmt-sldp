'use client';

import React, { useState, useEffect } from 'react';
import { X, Mail } from 'lucide-react';

interface EmployeeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (employee: {
        id?: string;
        name: string;
        role: string;
        email: string;
        department: string;
        parentId: string;
    }) => void;
    employeeData?: {
        id: string;
        name: string;
        role: string;
        email: string;
        department: string;
        parentId: string;
    } | null;
    employeesList: Array<{ id: string; name: string; role: string }>;
    defaultParentId?: string;
}

const DEPARTMENTS = [
    { name: 'Executive' },
    { name: 'Engineering' },
    { name: 'Product' },
    { name: 'Sales' },
    { name: 'HR' }
];

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
    isOpen,
    onClose,
    onSave,
    employeeData,
    employeesList,
    defaultParentId = ''
}) => {
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [email, setEmail] = useState('');
    const [department, setDepartment] = useState('Engineering');
    const [parentId, setParentId] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (employeeData) {
                setName(employeeData.name);
                setRole(employeeData.role);
                setEmail(employeeData.email || '');
                setDepartment(employeeData.department);
                setParentId(employeeData.parentId || '');
            } else {
                // Creating new
                setName('');
                setRole('');
                setEmail('');
                setDepartment('Engineering');
                setParentId(defaultParentId || '');
            }
        }
    }, [isOpen, employeeData, defaultParentId]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !role.trim()) return;

        onSave({
            id: employeeData?.id,
            name: name.trim(),
            role: role.trim(),
            email: email.trim(),
            department,
            parentId
        });
    };

    // Filter out current employee from parent selection to prevent self-reporting cycles
    const eligibleParents = employeesList.filter(emp => !employeeData || emp.id !== employeeData.id);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop Blur */}
            <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Modal Box */}
            <div className="relative bg-white rounded-3xl w-full max-w-[460px] p-6 sm:p-7 shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-gray-100 z-10 scale-100 transform transition-all duration-300">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
                    <h3 className="text-[1.25rem] font-[900] text-gray-900 tracking-tight">
                        {employeeData ? 'Edit Employee Details' : 'Add New Employee'}
                    </h3>
                    <button 
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Full Name */}
                    <div className="space-y-1">
                        <label className="text-[0.75rem] font-bold text-gray-500 uppercase tracking-wider">
                            Full Name
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Liam Carter"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-[0.875rem] font-semibold text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all bg-gray-50/50"
                        />
                    </div>

                    {/* Designation / Role */}
                    <div className="space-y-1">
                        <label className="text-[0.75rem] font-bold text-gray-500 uppercase tracking-wider">
                            Designation / Role
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. AI-ML Tech Lead"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-[0.875rem] font-semibold text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all bg-gray-50/50"
                        />
                    </div>

                    {/* Email Address */}
                    <div className="space-y-1">
                        <label className="text-[0.75rem] font-bold text-gray-500 uppercase tracking-wider">
                            Email Address
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <input
                                type="email"
                                placeholder="e.g. liam.carter@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-[0.875rem] font-semibold text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all bg-gray-50/50"
                            />
                        </div>
                    </div>

                    {/* Department Select */}
                    <div className="space-y-1">
                        <label className="text-[0.75rem] font-bold text-gray-500 uppercase tracking-wider">
                            Department
                        </label>
                        <select
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-[0.875rem] font-semibold text-gray-800 focus:border-primary focus:ring-1 focus:ring-primary transition-all bg-gray-50/50 appearance-none cursor-pointer"
                        >
                            {DEPARTMENTS.map((dept) => (
                                <option key={dept.name} value={dept.name}>
                                    {dept.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Supervisor Selector */}
                    <div className="space-y-1">
                        <label className="text-[0.75rem] font-bold text-gray-500 uppercase tracking-wider">
                            Reporting Manager / Supervisor
                        </label>
                        <select
                            value={parentId}
                            onChange={(e) => setParentId(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-[0.875rem] font-semibold text-gray-800 focus:border-primary focus:ring-1 focus:ring-primary transition-all bg-gray-50/50 cursor-pointer"
                        >
                            <option value="">None (Top Level / CEO)</option>
                            {eligibleParents.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.name} ({emp.role})
                                </option>
                            ))}
                        </select>
                    </div>


                    {/* Action buttons */}
                    <div className="flex items-center gap-3 pt-4 border-t border-gray-100 mt-5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl text-[0.875rem] font-bold text-gray-500 hover:bg-gray-50 border border-gray-200 transition-colors cursor-pointer text-center"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-3 rounded-xl text-[0.875rem] font-bold bg-primary hover:bg-primary/95 text-primary-foreground transition-all cursor-pointer text-center shadow-md active:scale-95"
                        >
                            {employeeData ? 'Save Changes' : 'Create Employee'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EmployeeModal;
