'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Mail } from 'lucide-react';
import { orgChart, AutocompleteItem } from '@dmt/api';

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
        roleId: string;
        email: string;
        department: string;
        parentId: string;
    } | null;
    employeesList: Array<{ id: string; name: string; role: string }>;
    rolesList: Array<{ id: string | number; name: string }>;
    defaultParentId?: string;
}

const DEPARTMENTS = [
    { value: 'backend', label: 'Backend' },
    { value: 'frontend', label: 'Frontend' },
    { value: 'mobile', label: 'Mobile' },
    { value: 'devops', label: 'DevOps' },
    { value: 'qa', label: 'QA / Testing' },
    { value: 'data', label: 'Data & Analytics' },
    { value: 'design', label: 'Design / UX' },
    { value: 'product', label: 'Product' },
    { value: 'hr', label: 'HR' },
    { value: 'finance', label: 'Finance' },
    { value: 'sales', label: 'Sales' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'AIML', label: 'AI & ML' },
    { value: 'other', label: 'Other' }
];

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
    isOpen,
    onClose,
    onSave,
    employeeData,
    employeesList,
    rolesList,
    defaultParentId = ''
}) => {
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [email, setEmail] = useState('');
    const [department, setDepartment] = useState('backend');
    const [parentId, setParentId] = useState('');
    const [isNotFound, setIsNotFound] = useState(false);
    const [autocompleteError, setAutocompleteError] = useState(false);
    const lastMatchedRef = useRef<{
        name: string, 
        email: string, 
        role: string, 
        department: string,
        matchedBy: 'name' | 'email'
    } | null>(null);

    const rolesListRef = useRef(rolesList);
    useEffect(() => {
        rolesListRef.current = rolesList;
    }, [rolesList]);

    useEffect(() => {
        if (isOpen) {
            if (employeeData) {
                setName(employeeData.name);
                setRole(employeeData.roleId);
                setEmail(employeeData.email || '');
                setDepartment(employeeData.department);
                setParentId(employeeData.parentId || '');
                setIsNotFound(false);
                setAutocompleteError(false);
                lastMatchedRef.current = null;
            } else {
                // Creating new
                setName('');
                setRole(rolesList.length > 0 ? String(rolesList[0].id) : '');
                setEmail('');
                setDepartment('backend');
                setParentId(defaultParentId || '');
                setIsNotFound(false);
                setAutocompleteError(false);
                lastMatchedRef.current = null;
            }
        }
    }, [isOpen, employeeData, defaultParentId, rolesList]);

    const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, []);

    const triggerAutocomplete = (currentName: string, currentEmail: string) => {
        if (employeeData) return;

        const trimmedName = currentName.trim().toLowerCase();
        const trimmedEmail = currentEmail.trim().toLowerCase();

        // Check if we lost a previous match because user edited name or email
        if (lastMatchedRef.current) {
            const prev = lastMatchedRef.current;
            const nameChanged = trimmedName !== prev.name.toLowerCase();
            const emailChanged = trimmedEmail !== prev.email.toLowerCase();

            if (nameChanged || emailChanged) {
                setRole(r => r === prev.role ? (rolesListRef.current.length > 0 ? String(rolesListRef.current[0].id) : '') : r);
                setDepartment(d => d === prev.department ? 'backend' : d);
                
                if (prev.matchedBy === 'name' && nameChanged) {
                    setEmail(e => e === prev.email ? '' : e);
                }
                if (prev.matchedBy === 'email' && emailChanged) {
                    setName(n => n === prev.name ? '' : n);
                }

                lastMatchedRef.current = null;
                setIsNotFound(true);
                return;
            }
        }

        const nameQuery = trimmedName.split(' ')[0]; // Only send first word to API to bypass strict first/last name backend matching
        const query = nameQuery.length > 2 ? nameQuery : (trimmedEmail.length > 4 ? trimmedEmail : null);

        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        if (query) {
            debounceTimeoutRef.current = setTimeout(async () => {
                setAutocompleteError(false);
                try {
                    const response = await orgChart.searchAutocomplete(query);
                    // The API returns a flat array directly
                    const responseData = response.data || (Array.isArray(response) ? response : null);
                    
                    if (responseData && Array.isArray(responseData) && responseData.length > 0) {
                        let matchedBy: 'name' | 'email' | null = null;
                        let bestMatch: AutocompleteItem | null = null;

                        for (const item of responseData) {
                            const mName = item.full_name || item.name || '';
                            const mEmail = item.email || '';

                            if (trimmedEmail && mEmail.toLowerCase().includes(trimmedEmail)) {
                                matchedBy = 'email';
                                bestMatch = item;
                                break;
                            } else if (trimmedName && mName.toLowerCase().includes(trimmedName)) {
                                matchedBy = 'name';
                                bestMatch = item;
                                break;
                            }
                        }

                        if (matchedBy && bestMatch) {
                            const matchName = bestMatch.full_name || bestMatch.name || '';
                            const matchEmail = bestMatch.email || '';
                            const matchRoleName = bestMatch.role || '';
                            const matchDept = bestMatch.department || 'backend';

                            if (lastMatchedRef.current?.email !== matchEmail) {
                                const rList = rolesListRef.current;
                                const foundRole = rList.find(r => r.name.toLowerCase() === matchRoleName.toLowerCase());
                                const roleIdToSet = foundRole ? String(foundRole.id) : (rList.length > 0 ? String(rList[0].id) : '');

                                setRole(roleIdToSet);
                                setDepartment(matchDept);
                                
                                if (matchedBy === 'email' && trimmedName !== matchName.toLowerCase()) {
                                    setName(matchName);
                                }
                                if (matchedBy === 'name' && trimmedEmail !== matchEmail.toLowerCase()) {
                                    setEmail(matchEmail);
                                }
                                
                                lastMatchedRef.current = { 
                                    name: matchName, 
                                    email: matchEmail, 
                                    role: roleIdToSet, 
                                    department: matchDept, 
                                    matchedBy 
                                };
                            }
                            setIsNotFound(false);
                        } else {
                            lastMatchedRef.current = null;
                            setIsNotFound(true);
                        }
                    } else {
                        lastMatchedRef.current = null;
                        setIsNotFound(true);
                    }
                } catch (error) {
                    console.error('Autocomplete search failed', error);
                    setAutocompleteError(true);
                    setIsNotFound(false);
                }
            }, 300); // 300ms debounce
        } else {
            lastMatchedRef.current = null;
            setIsNotFound(false);
            setAutocompleteError(false);
        }
    };

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
            <div className="relative bg-card rounded-3xl w-full max-w-[28.75rem] p-6 sm:p-7 shadow-[0_0.625rem_2.5rem_rgba(0,0,0,0.12)] border border-border z-10 scale-100 transform transition-all duration-300">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-border mb-5">
                    <h3 className="text-[1.25rem] font-[900] text-card-foreground tracking-tight">
                        {employeeData ? 'Edit Employee Details' : 'Add New Employee'}
                    </h3>
                    <button 
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Full Name */}
                    <div className="space-y-1">
                        <label className="text-[0.75rem] font-bold text-muted-foreground uppercase tracking-wider">
                            Full Name
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Liam Carter"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                triggerAutocomplete(e.target.value, email);
                            }}
                            className="w-full px-4 py-3 rounded-xl border border-input text-[0.875rem] font-semibold text-foreground placeholder-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-all bg-muted/50"
                        />
                    </div>

                    {/* Designation / Role */}
                    <div className="space-y-1">
                        <label className="text-[0.75rem] font-bold text-muted-foreground uppercase tracking-wider">
                            Designation / Role
                        </label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-input text-[0.875rem] font-semibold text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-all bg-muted/50 appearance-none cursor-pointer"
                        >
                            {rolesList.map((r) => (
                                <option key={r.id} value={String(r.id)}>
                                    {r.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Email Address */}
                    <div className="space-y-1">
                        <label className="text-[0.75rem] font-bold text-muted-foreground uppercase tracking-wider">
                            Email Address
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            <input
                                type="email"
                                placeholder="e.g. liam.carter@company.com"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    triggerAutocomplete(name, e.target.value);
                                }}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-input text-[0.875rem] font-semibold text-foreground placeholder-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-all bg-muted/50"
                            />
                        </div>
                    </div>

                    {/* Department Select */}
                    <div className="space-y-1">
                        <label className="text-[0.75rem] font-bold text-muted-foreground uppercase tracking-wider">
                            Department
                        </label>
                        <select
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-input text-[0.875rem] font-semibold text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-all bg-muted/50 appearance-none cursor-pointer"
                        >
                            {DEPARTMENTS.map((dept) => (
                                <option key={dept.value} value={dept.value}>
                                    {dept.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {isNotFound && !employeeData && !autocompleteError && (
                        <p className="text-[0.75rem] font-semibold text-amber-600 bg-amber-50/50 p-2.5 rounded-lg border border-amber-200">
                            Employee not found in directory. Please enter details manually.
                        </p>
                    )}

                    {autocompleteError && !employeeData && (
                        <p className="text-[0.75rem] font-semibold text-red-600 bg-red-50/50 p-2.5 rounded-lg border border-red-200">
                            Failed to fetch employee details. Please enter details manually.
                        </p>
                    )}

                    {/* Supervisor Selector */}
                    <div className="space-y-1">
                        <label className="text-[0.75rem] font-bold text-muted-foreground uppercase tracking-wider">
                            Reporting Manager / Supervisor
                        </label>
                        <select
                            value={parentId}
                            onChange={(e) => setParentId(e.target.value)}
                            disabled={employeesList.length === 0 || (!!defaultParentId && !employeeData)}
                            className="w-full px-4 py-3 rounded-xl border border-input text-[0.875rem] font-semibold text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-all bg-muted/50 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
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
                    <div className="flex items-center gap-3 pt-4 border-t border-border mt-5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl text-[0.875rem] font-bold text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors cursor-pointer text-center"
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
