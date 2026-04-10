'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '../../../components/DashboardLayout';
import {
    ArrowLeft,
    UserPlus,
    Merge,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Users,
    Search,
    ExternalLink,
    ChevronRight,
    ShieldCheck,
    X
} from 'lucide-react';
import api, { identity as identityApi, IdentityMapping, IdentitySuggestion } from '@dmt/api';

export default function IdentityResolutionPage() {
    const router = useRouter();
    const { id: tenantId } = useParams();
    const [mappings, setMappings] = useState<IdentityMapping[]>([]);
    const [suggestions, setSuggestions] = useState<IdentitySuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Manual Merge States
    const [showManualModal, setShowManualModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ email: string; name: string }[]>([]);
    const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const loadSearchResults = async (val: string) => {
        setIsSearching(true);
        try {
            const results = await identityApi.search(val, tenantId as string);
            setSearchResults(results);
        } catch (err) {
            console.error('Search failed', err);
        } finally {
            setIsSearching(false);
        }
    };

    // Load initial results when modal opens (tenantId header handled explicitly in API calls)
    useEffect(() => {
        if (showManualModal) {
            loadSearchResults('');
        } else {
            setSearchQuery('');
            setSearchResults([]);
            setSelectedEmails([]);
        }
    }, [showManualModal]);

    // Initial load
    useEffect(() => {
        if (!tenantId) return;
        fetchData();
    }, [tenantId]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [mappingsData, suggestionsData] = await Promise.all([
                identityApi.getMappings(tenantId as string),
                identityApi.getSuggestions(tenantId as string)
            ]);
            setMappings(mappingsData);
            setSuggestions(suggestionsData);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch identity data.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = async (val: string) => {
        setSearchQuery(val);
        loadSearchResults(val);
    };

    const handleManualMerge = async () => {
        if (selectedEmails.length < 2) {
            setError('Please select at least 2 identities to merge.');
            return;
        }

        setIsProcessing(true);
        setError(null);
        try {
            const canonicalEmail = selectedEmails[0];
            const canonicalName = searchResults.find(r => r.email === canonicalEmail)?.name || canonicalEmail;

            await identityApi.createMapping({
                canonical_email: canonicalEmail,
                canonical_name: canonicalName,
                source_identities: selectedEmails.map(email => ({
                    system: 'unknown',
                    email
                }))
            }, tenantId as string);

            setSuccessMessage(`Successfully merged ${selectedEmails.length} identities.`);
            setShowManualModal(false);
            setSelectedEmails([]);
            setSearchQuery('');
            fetchData();
        } catch (err: any) {
            setError(err.message || 'Failed to create manual merge.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleMerge = async (suggestion: IdentitySuggestion) => {
        if (!confirm(`Merge ${suggestion.emails.length} identities for "${suggestion.name}"? This will trigger a historical backfill.`)) {
            return;
        }

        setIsProcessing(true);
        setError(null);
        try {
            // Pick first email as canonical for now (User can change it later)
            const canonicalEmail = suggestion.emails[0];
            await identityApi.createMapping({
                canonical_email: canonicalEmail,
                canonical_name: suggestion.name,
                source_identities: suggestion.emails.map(email => ({
                    system: 'unknown', // Backend will resolve or user can edit
                    email
                }))
            }, tenantId as string);
            setSuccessMessage(`Successfully merged identities for ${suggestion.name}. Backfill started.`);
            fetchData();
        } catch (err: any) {
            setError(err.message || 'Failed to merge identities.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async (mappingId: number) => {
        if (!confirm('Are you sure you want to remove this mapping? Historical data will remain unified but future syncs will split again.')) {
            return;
        }

        setIsProcessing(true);
        setError(null);
        try {

            await identityApi.deleteMapping(mappingId, tenantId as string);
            setSuccessMessage('Mapping removed successfully.');
            fetchData();
        } catch (err: any) {

            setError(err.message || 'Failed to delete mapping.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRemoveAlias = async (mapping: IdentityMapping, emailToRemove: string) => {
        if (!confirm(`Remove alias ${emailToRemove} from this mapping?`)) {
            return;
        }

        setIsProcessing(true);
        setError(null);
        try {
            const updatedIdentities = mapping.source_identities.filter(si => si.email !== emailToRemove);

            if (updatedIdentities.length < 1) {
                // If only one was left and we remove it, maybe delete the whole mapping?
                // Or let the backend handle it. For now, we need at least one identity usually.
                setError('Cannot remove the last identity. Use Delete Mapping instead.');
                return;
            }

            await identityApi.updateMapping(mapping.id, {
                source_identities: updatedIdentities
            }, tenantId as string);
            setSuccessMessage('Alias removed successfully.');
            fetchData();
        } catch (err: any) {
            setError(err.message || 'Failed to remove alias.');
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto space-y-8 pb-12">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-1">Identity Resolution</h1>
                            <p className="text-slate-400 text-sm">Unify fragmented developer identities across disparate data sources.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowManualModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-blue-500/20"
                        >
                            <UserPlus className="w-4 h-4" />
                            Manual Merge
                        </button>
                    </div>
                </div>

                {/* Manual Merge Modal */}
                {showManualModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-8 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-white">Manual Identity Merge</h2>
                                    <button
                                        onClick={() => setShowManualModal(false)}
                                        className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input
                                            type="text"
                                            placeholder="Search by name or email..."
                                            value={searchQuery}
                                            onChange={(e) => handleSearch(e.target.value)}
                                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                                        />
                                        {isSearching && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                        {isSearching ? (
                                            <div className="flex justify-center py-8">
                                                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                                            </div>
                                        ) : searchResults.length === 0 ? (
                                            <p className="text-center py-8 text-slate-500 text-sm">
                                                {searchQuery.length >= 1
                                                    ? `No users found matching "${searchQuery}"`
                                                    : 'No users available in this tenant.'}
                                            </p>
                                        ) : (
                                            searchResults.map(res => (
                                                <label
                                                    key={res.email}
                                                    className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${selectedEmails.includes(res.email)
                                                        ? 'bg-blue-500/10 border-blue-500/50'
                                                        : 'bg-slate-800/20 border-slate-800 hover:border-slate-700'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedEmails.includes(res.email)}
                                                            onChange={() => {
                                                                if (selectedEmails.includes(res.email)) {
                                                                    setSelectedEmails(prev => prev.filter(e => e !== res.email));
                                                                } else {
                                                                    setSelectedEmails(prev => [...prev, res.email]);
                                                                }
                                                            }}
                                                            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500/50"
                                                        />
                                                        <div>
                                                            <div className="text-sm font-medium text-white">{res.name}</div>
                                                            <div className="text-xs text-slate-500">{res.email}</div>
                                                        </div>
                                                    </div>
                                                    {selectedEmails[0] === res.email && (
                                                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">Canonical</span>
                                                    )}
                                                </label>
                                            ))
                                        )}
                                    </div>

                                    {selectedEmails.length > 0 && (
                                        <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                                            <p className="text-xs text-slate-400 mb-1">Merging {selectedEmails.length} identities into:</p>
                                            <p className="text-sm font-semibold text-white">{selectedEmails[0]}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={() => setShowManualModal(false)}
                                        className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleManualMerge}
                                        disabled={selectedEmails.length < 2 || isProcessing}
                                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition shadow-xl shadow-blue-500/20"
                                    >
                                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Merge className="w-5 h-5" />}
                                        Complete Merge
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                        <AlertCircle className="w-5 h-5" />
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {successMessage && (
                    <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                        <CheckCircle2 className="w-5 h-5" />
                        <p className="text-sm">{successMessage}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Suggestions */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="flex items-center gap-2 text-blue-400 mb-2">
                            <ShieldCheck className="w-5 h-5" />
                            <h2 className="text-lg font-semibold text-white">Automated Suggestions</h2>
                        </div>
                        <p className="text-sm text-slate-400 px-1">
                            We've detected multiple emails belonging to the same developer names.
                        </p>

                        <div className="space-y-4">
                            {suggestions.length === 0 ? (
                                <div className="bg-slate-900/30 border border-slate-800/50 rounded-2xl p-8 text-center">
                                    <p className="text-slate-500 text-sm italic">No suggestions at this time.</p>
                                </div>
                            ) : (
                                suggestions.map((s, idx) => (
                                    <div key={idx} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 hover:border-blue-500/30 transition group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold border border-blue-500/20">
                                                    {s.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="text-white font-medium">{s.name}</h3>
                                                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">{s.emails.length} Identities Found</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleMerge(s)}
                                                disabled={isProcessing}
                                                className="p-2 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded-lg transition"
                                                title="Merge Identities"
                                            >
                                                <Merge className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {s.emails.map(email => (
                                                <div key={email} className="text-xs text-slate-400 flex items-center gap-2">
                                                    <div className="w-1 h-1 rounded-full bg-slate-600" />
                                                    {email}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right: Existing Mappings */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center gap-2 text-emerald-400 mb-2">
                            <Users className="w-5 h-5" />
                            <h2 className="text-lg font-semibold text-white">Active Identity Merges</h2>
                        </div>

                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-800/50 border-b border-slate-800">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Canonical Identity</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Merged Aliases</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {mappings.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-12 text-center text-slate-500 text-sm italic">
                                                No identity merges created yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        mappings.map((m) => (
                                            <tr key={m.id} className="hover:bg-slate-800/20 transition group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold border border-emerald-500/20">
                                                            {m.canonical_name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-white">{m.canonical_name}</div>
                                                            <div className="text-xs text-slate-500">{m.canonical_email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-2">
                                                        {m.source_identities.map((si, idx) => (
                                                            <div key={idx} className="group/alias relative inline-flex">
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300 border border-slate-700 pr-5">
                                                                    {si.email}
                                                                </span>
                                                                {m.canonical_email !== si.email && (
                                                                    <button
                                                                        onClick={() => handleRemoveAlias(m, si.email)}
                                                                        className="absolute right-0.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-400 transition p-0.5 rounded"
                                                                        title="Remove this alias"
                                                                    >
                                                                        <X className="w-2.5 h-2.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleDelete(m.id)}
                                                        disabled={isProcessing}
                                                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition"
                                                        title="Delete Mapping"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
