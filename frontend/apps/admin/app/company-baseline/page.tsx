'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { companyBaseline } from '@dmt/api';
import { useAuth } from '../auth/AuthContext';
import {
    Save,
    RefreshCcw,
    Building2,
    AlertTriangle,
    Sliders,
    Scale,
    Shield,
    Lock,
    Calendar,
    Users,
    Trash2,
    History,
    ChevronDown,
    ChevronUp,
    Info,
    CheckCircle2,
    Sparkles,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export interface SeniorityWeights {
    junior: number | string;
    mid: number | string;
    senior: number | string;
}

export interface PerSprintLimits {
    under: number | string;
    over: number | string;
}

export interface WorkloadSettings {
    seniority_weights?: SeniorityWeights;
    per_sprint_limits?: PerSprintLimits;
    sprint_window?: number;
    use_allocation?: boolean;
    min_allocation?: number;
    count_subtasks?: boolean;
    use_percentile?: boolean;
    overload_percentile?: number;
    underutil_percentile?: number;
    small_team_min?: number;
    [key: string]: unknown;
}

export interface WorkloadRange {
    min: number;
    max: number;
}

export interface WorkloadRanges {
    junior?: WorkloadRange;
    mid?: WorkloadRange;
    senior?: WorkloadRange;
    [key: string]: WorkloadRange | undefined;
}

export interface WorkloadSettingsHistoryItem {
    effective_from: string;
    effective_to?: string | null;
    created_by?: string | { username?: string; email?: string; first_name?: string; last_name?: string } | null;
    created_at?: string | null;
    settings: {
        seniority_weights?: SeniorityWeights;
        per_sprint_limits?: PerSprintLimits;
        [key: string]: unknown;
    };
    ranges?: WorkloadRanges;
}

export interface CompanyBaselineData {
    name?: string;
    description?: string;
    last_updated?: string;
    kpis: {
        item_volume?: {
            total: number | string;
            completed: number | string;
        };
        velocity?: number | string;
        compliance_rate?: number | string;
        cycle_time?: number | string;
        defect_density?: number | string;
        pr_review_speed?: number | string;
        ai_usage?: number | string;
        [key: string]: number | string | { total: number | string; completed: number | string } | undefined;
    };
    workload_settings?: WorkloadSettings;
    workload_settings_effective_from?: string;
    workload_ranges?: WorkloadRanges;
    workload_settings_history?: WorkloadSettingsHistoryItem[];
    [key: string]: unknown;
}

const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const DRAFT_DATE_KEY = 'company_baseline_draft_date';

const getDraftDate = (): string | null => {
    try {
        if (typeof window !== 'undefined') {
            return window.sessionStorage?.getItem(DRAFT_DATE_KEY) || null;
        }
    } catch {
        // Ignore storage errors
    }
    return null;
};

const setDraftDate = (dateStr: string | null) => {
    try {
        if (typeof window !== 'undefined') {
            if (dateStr) {
                window.sessionStorage?.setItem(DRAFT_DATE_KEY, dateStr);
            } else {
                window.sessionStorage?.removeItem(DRAFT_DATE_KEY);
            }
        }
    } catch {
        // Ignore storage errors
    }
};

const VERSIONS_META_KEY = 'company_baseline_versions_meta';

const getStoredVersionsMeta = (): Record<string, { created_by?: string; created_at?: string }> => {
    try {
        if (typeof window !== 'undefined') {
            const raw = window.localStorage?.getItem(VERSIONS_META_KEY);
            if (raw) return JSON.parse(raw);
        }
    } catch {
        // Ignore storage errors
    }
    return {};
};

const saveVersionMeta = (effectiveFrom: string, createdBy?: string, createdAt?: string) => {
    try {
        if (typeof window !== 'undefined') {
            const current = getStoredVersionsMeta();
            current[effectiveFrom] = {
                created_by: createdBy || 'Admin',
                created_at: createdAt || new Date().toISOString(),
            };
            window.localStorage?.setItem(VERSIONS_META_KEY, JSON.stringify(current));
        }
    } catch {
        // Ignore storage errors
    }
};

/**
 * Calculates the day before a given 'YYYY-MM-DD' date string.
 */
function getDayBefore(dateStr: string): string {
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
    const [y, m, d] = parts;
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCDate(date.getUTCDate() - 1);
    const prevY = date.getUTCFullYear();
    const prevM = String(date.getUTCMonth() + 1).padStart(2, '0');
    const prevD = String(date.getUTCDate()).padStart(2, '0');
    return `${prevY}-${prevM}-${prevD}`;
}

/**
 * Returns the effective_to date for a version in history.
 * If provided explicitly by backend, uses it (null means "Present").
 * If undefined, computes it from the next version's effective_from (day before),
 * or returns null ("Present") if it is the latest version.
 */
function resolveEffectiveTo(
    item: WorkloadSettingsHistoryItem,
    sortedHistoryAsc: WorkloadSettingsHistoryItem[]
): string | null {
    if (item.effective_to !== undefined) {
        return item.effective_to;
    }
    const idx = sortedHistoryAsc.findIndex(h => h.effective_from === item.effective_from);
    if (idx >= 0 && idx < sortedHistoryAsc.length - 1) {
        const nextItem = sortedHistoryAsc[idx + 1];
        if (nextItem?.effective_from) {
            return getDayBefore(nextItem.effective_from);
        }
    }
    return null;
}

/**
 * Formats "Saved by: created_by on created_at."
 * The date represents the date on which the user updated/saved the version (defaults to today's update date).
 */
function formatSavedBy(
    item: {
        effective_from?: string;
        created_by?: string | { username?: string; email?: string; first_name?: string; last_name?: string } | null;
        created_at?: string | null;
    },
    metaStore?: Record<string, { created_by?: string; created_at?: string }>,
    currentUser?: { first_name?: string; last_name?: string; username?: string; email?: string } | null
): string {
    const key = item.effective_from || '';
    const storedMeta = key ? metaStore?.[key] : undefined;

    let author = '';
    if (typeof item.created_by === 'string' && item.created_by.trim()) {
        author = item.created_by.trim();
    } else if (item.created_by && typeof item.created_by === 'object') {
        const cb = item.created_by;
        author = cb.first_name
            ? `${cb.first_name} ${cb.last_name || ''}`.trim()
            : cb.username || cb.email || '';
    } else if (storedMeta?.created_by) {
        author = storedMeta.created_by;
    } else if (currentUser) {
        author = currentUser.first_name
            ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim()
            : currentUser.username || currentUser.email || 'Admin';
    } else {
        author = 'Admin';
    }

    // Date on which the user is updating / updated (defaults to today's date)
    const rawDate = item.created_at || storedMeta?.created_at || getTodayStr();
    let dateStr = '';
    if (rawDate) {
        try {
            if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
                const [y, m, d] = rawDate.split('-').map(Number);
                const dt = new Date(y, m - 1, d);
                dateStr = dt.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                });
            } else {
                const dt = new Date(rawDate);
                if (!isNaN(dt.getTime())) {
                    dateStr = dt.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                    });
                } else {
                    dateStr = rawDate;
                }
            }
        } catch {
            dateStr = rawDate;
        }
    }

    if (dateStr) {
        return `Saved by: ${author} on ${dateStr}.`;
    }
    return `Saved by: ${author}.`;
}

/**
 * Formats ranges for a history item (using backend ranges as they are, fallback to ideal range formula)
 */
function formatHistoryRanges(entry: WorkloadSettingsHistoryItem): { junior: string; mid: string; senior: string } {
    if (entry.ranges?.junior && entry.ranges?.mid && entry.ranges?.senior) {
        return {
            junior: `${entry.ranges.junior.min} – ${entry.ranges.junior.max}`,
            mid: `${entry.ranges.mid.min} – ${entry.ranges.mid.max}`,
            senior: `${entry.ranges.senior.min} – ${entry.ranges.senior.max}`,
        };
    }
    const settings = entry.settings || {};
    const under = Math.round(Number(settings.per_sprint_limits?.under ?? 3));
    const over = Math.round(Number(settings.per_sprint_limits?.over ?? 6));
    const jw = Number(settings.seniority_weights?.junior ?? 0.7);
    const mw = Number(settings.seniority_weights?.mid ?? 1.0);
    const sw = Number(settings.seniority_weights?.senior ?? 1.3);
    return {
        junior: formatIdealRange(under * jw, over * jw),
        mid: formatIdealRange(under * mw, over * mw),
        senior: formatIdealRange(under * sw, over * sw),
    };
}

export default function CompanyBaselinePage() {
    const { user } = useAuth();
    const isSuperAdmin = !!user?.is_superuser;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [baseline, setBaseline] = useState<CompanyBaselineData | null>(null);
    const [isFieldChanged, setIsFieldChanged] = useState<boolean>(false);
    const [effectiveFrom, setEffectiveFrom] = useState<string>(getTodayStr());
    const [savedEffectiveFrom, setSavedEffectiveFrom] = useState<string | null>(null);
    const [currentRanges, setCurrentRanges] = useState<WorkloadRanges | null>(null);
    const [showHistory, setShowHistory] = useState<boolean>(false);
    const [deletingDate, setDeletingDate] = useState<string | null>(null);
    const dateInputRef = useRef<HTMLInputElement>(null);

    // Prevent mouse wheel from unintentionally changing number/date inputs when scrolling
    useEffect(() => {
        const handleWindowWheel = () => {
            if (
                document.activeElement instanceof HTMLInputElement &&
                (document.activeElement.type === 'number' || document.activeElement.type === 'date')
            ) {
                document.activeElement.blur();
            }
        };
        window.addEventListener('wheel', handleWindowWheel, { passive: true, capture: true });
        return () => {
            window.removeEventListener('wheel', handleWindowWheel, { capture: true });
        };
    }, []);

    const handleWheelBlur = (e: React.WheelEvent<HTMLInputElement>) => {
        e.currentTarget.blur();
    };

    // Specifically for decimal inputs up to 2 places (e.g. Seniority weights)
    const handleDecimalTwoPlacesKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (['-', '+', 'e', 'E'].includes(e.key)) {
            e.preventDefault();
            return;
        }
        if (e.key === '.' && (e.currentTarget.value.includes('.') || e.currentTarget.value === '')) {
            e.preventDefault();
            return;
        }
        if (/^\d$/.test(e.key)) {
            const val = e.currentTarget.value;
            const dotIndex = val.indexOf('.');
            const selectionStart = e.currentTarget.selectionStart ?? val.length;
            if (dotIndex !== -1 && selectionStart > dotIndex) {
                const decimalPart = val.slice(dotIndex + 1);
                const selectedLength = (e.currentTarget.selectionEnd ?? selectionStart) - selectionStart;
                if (decimalPart.length >= 2 && selectedLength === 0) {
                    e.preventDefault();
                }
            }
        }
    };

    const handleDecimalTwoPlacesPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const text = e.clipboardData.getData('text');
        if (/[-+eE]/.test(text) || text.includes('.')) {
            e.preventDefault();
            let clean = text.replace(/[-+eE]/gi, '');
            if (clean.includes('.')) {
                const [whole, decimal] = clean.split('.');
                clean = `${whole}.${decimal.slice(0, 2)}`;
            }
            if (clean) {
                document.execCommand('insertText', false, clean);
            }
        }
    };

    // Disallow negative sign '-', addition sign '+', and exponential 'e'/'E' in positive numeric inputs
    const handlePositiveNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (['-', '+', 'e', 'E'].includes(e.key)) {
            e.preventDefault();
        }
    };

    // Disallow '-', '+', '.', ',', 'e', 'E' in whole integer inputs
    const handlePositiveIntegerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (['-', '+', '.', ',', 'e', 'E'].includes(e.key)) {
            e.preventDefault();
        }
    };

    const handlePositiveNumberPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const text = e.clipboardData.getData('text');
        if (/[-+eE]/.test(text)) {
            e.preventDefault();
            const clean = text.replace(/[-+eE]/gi, '');
            if (clean) {
                document.execCommand('insertText', false, clean);
            }
        }
    };

    const handlePositiveIntegerPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const text = e.clipboardData.getData('text');
        if (/[.,\-+eE]/.test(text)) {
            e.preventDefault();
            const clean = text.replace(/[^\d]/g, '');
            if (clean) {
                document.execCommand('insertText', false, clean);
            }
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const response = await companyBaseline.getBaseline();
            if (response && response.data) {
                const data: CompanyBaselineData = response.data;
                const activeServerDate = data.workload_settings_effective_from || getTodayStr();
                const history = data.workload_settings_history || [];

                const draft = getDraftDate();

                let chosenDate = activeServerDate;
                let isUnsavedDraft = false;

                if (draft && /^\d{4}-\d{2}-\d{2}$/.test(draft)) {
                    chosenDate = draft;
                    isUnsavedDraft = true;
                }

                const historyMatch = history.find(h => h.effective_from === chosenDate);
                const activeSettings = historyMatch?.settings || data.workload_settings;
                const ranges = historyMatch?.ranges || data.workload_ranges || null;

                setEffectiveFrom(chosenDate);
                setSavedEffectiveFrom(activeServerDate);
                setCurrentRanges(ranges);
                setHasUnsavedChanges(isUnsavedDraft);

                const underLimit = Math.round(Number(activeSettings?.per_sprint_limits?.under ?? 3));
                const overLimit = Math.round(Number(activeSettings?.per_sprint_limits?.over ?? 6));

                const juniorWeight = Number(activeSettings?.seniority_weights?.junior ?? 0.7);
                const midWeight = Number(activeSettings?.seniority_weights?.mid ?? 1.0);
                const seniorWeight = Number(activeSettings?.seniority_weights?.senior ?? 1.3);

                data.workload_settings = {
                    ...(activeSettings || {}),
                    seniority_weights: { junior: juniorWeight, mid: midWeight, senior: seniorWeight },
                    per_sprint_limits: { under: underLimit, over: overLimit },
                };
                setBaseline(data);
                setIsFieldChanged(isUnsavedDraft);
            } else {
                toast.error('Failed to load company baseline data');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error loading baseline');
        } finally {
            setLoading(false);
        }
    };

    const markFieldChanged = () => {
        setIsFieldChanged(true);
    };

    const handleKpiChange = (key: string, value: string | number) => {
        markFieldChanged();
        const cleanVal = typeof value === 'string' ? value.replace(/[-+eE]/gi, '') : value;
        const parsed: number | '' = typeof cleanVal === 'string' ? (cleanVal.trim() === '' ? '' : parseFloat(cleanVal)) : cleanVal;
        const num: number | '' = parsed === '' ? '' : (isNaN(parsed) ? 0 : Math.max(0, parsed));
        setBaseline((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                kpis: {
                    ...prev.kpis,
                    [key]: num,
                },
            };
        });
        setHasUnsavedChanges(true);
    };

    const handleItemVolumeChange = (field: 'total' | 'completed', value: string | number) => {
        markFieldChanged();
        const cleanVal = typeof value === 'string' ? value.replace(/[^\d]/g, '') : String(value);
        const parsed: number | '' = cleanVal.trim() === '' ? '' : parseInt(cleanVal, 10);
        const num: number | '' = parsed === '' ? '' : (isNaN(parsed) ? 0 : Math.max(0, parsed));
        setBaseline((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                kpis: {
                    ...prev.kpis,
                    item_volume: {
                        ...(prev.kpis.item_volume || { total: 0, completed: 0 }),
                        [field]: num,
                    },
                },
            };
        });
        setHasUnsavedChanges(true);
    };

    const handleSeniorityWeightChange = (level: 'junior' | 'mid' | 'senior', value: string) => {
        markFieldChanged();
        let cleanVal = typeof value === 'string' ? value.replace(/[-+eE]/gi, '') : String(value);
        if (cleanVal.includes('.')) {
            const [whole, decimal] = cleanVal.split('.');
            cleanVal = `${whole}.${decimal.slice(0, 2)}`;
        }
        let num: number | string = '';
        if (cleanVal.trim() !== '') {
            if (cleanVal.endsWith('.')) {
                num = cleanVal;
            } else {
                const parsed = parseFloat(cleanVal);
                num = isNaN(parsed) ? '' : (cleanVal.includes('.') ? cleanVal : parsed);
            }
        }
        setBaseline((prev) => {
            if (!prev) return prev;
            const currentWorkloadSettings = prev.workload_settings || {
                seniority_weights: { junior: 0.7, mid: 1.0, senior: 1.3 },
                per_sprint_limits: { under: 3, over: 6 },
            };
            const currentWeights = currentWorkloadSettings.seniority_weights || { junior: 0.7, mid: 1.0, senior: 1.3 };
            return {
                ...prev,
                workload_settings: {
                    ...currentWorkloadSettings,
                    seniority_weights: {
                        ...currentWeights,
                        [level]: num,
                    },
                },
            };
        });
        setHasUnsavedChanges(true);
    };

    const handleSprintLimitChange = (field: 'under' | 'over', value: string) => {
        markFieldChanged();
        const cleanVal = typeof value === 'string' ? value.replace(/[^\d]/g, '') : String(value);
        let num: number | string = '';
        if (cleanVal.trim() !== '') {
            const parsed = parseInt(cleanVal, 10);
            num = isNaN(parsed) ? '' : parsed;
        }
        setBaseline((prev) => {
            if (!prev) return prev;
            const currentWorkloadSettings = prev.workload_settings || {
                seniority_weights: { junior: 0.7, mid: 1.0, senior: 1.3 },
                per_sprint_limits: { under: 3, over: 6 },
            };
            const currentLimits = currentWorkloadSettings.per_sprint_limits || { under: 3, over: 6 };
            return {
                ...prev,
                workload_settings: {
                    ...currentWorkloadSettings,
                    per_sprint_limits: {
                        ...currentLimits,
                        [field]: num,
                    },
                },
            };
        });
        setHasUnsavedChanges(true);
    };

    const handleDateChange = (val: string) => {
        setEffectiveFrom(val);
        setDraftDate(val);
        setHasUnsavedChanges(val !== savedEffectiveFrom);
    };

    const handleSetToToday = () => {
        const today = getTodayStr();
        setEffectiveFrom(today);
        setDraftDate(today);
        setHasUnsavedChanges(today !== savedEffectiveFrom);
    };

    const saveChanges = async () => {
        if (!baseline) return;

        // Superadmin workload settings validation
        if (isSuperAdmin) {
            const junior = Number(baseline.workload_settings?.seniority_weights?.junior ?? 0.7);
            const mid = Number(baseline.workload_settings?.seniority_weights?.mid ?? 1.0);
            const senior = Number(baseline.workload_settings?.seniority_weights?.senior ?? 1.3);
            const under = Number(baseline.workload_settings?.per_sprint_limits?.under ?? 3);
            const over = Number(baseline.workload_settings?.per_sprint_limits?.over ?? 6);

            if (isNaN(junior) || junior < 0.1 || junior > 100) {
                toast.error('Junior weight must be a number between 0.1 and 100');
                return;
            }
            if (isNaN(mid) || mid < 0.1 || mid > 100) {
                toast.error('Mid Senior weight must be a number between 0.1 and 100');
                return;
            }
            if (isNaN(senior) || senior < 0.1 || senior > 100) {
                toast.error('Senior weight must be a number between 0.1 and 100');
                return;
            }
            if (isNaN(under) || !Number.isInteger(under) || under < 0 || under > 100) {
                toast.error('Minimum sprint tasks must be a whole number between 0 and 100');
                return;
            }
            if (isNaN(over) || !Number.isInteger(over) || over < 0 || over > 100) {
                toast.error('Maximum sprint tasks must be a whole number between 0 and 100');
                return;
            }
            if (under >= over) {
                toast.error('Minimum sprint tasks must be strictly below maximum sprint tasks (Min < Max)');
                return;
            }
            if (!effectiveFrom || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
                toast.error('Effective from date must be in YYYY-MM-DD format');
                return;
            }
        }

        // Basic KPI validations
        const compliance = Number(baseline.kpis?.compliance_rate ?? 0);
        if (isNaN(compliance) || compliance < 0 || compliance > 100) {
            toast.error('Compliance rate must be between 0% and 100%');
            return;
        }
        const aiUsage = Number(baseline.kpis?.ai_usage ?? 0);
        if (isNaN(aiUsage) || aiUsage < 0 || aiUsage > 100) {
            toast.error('AI usage must be between 0% and 100%');
            return;
        }
        const volTotal = Number(baseline.kpis?.item_volume?.total ?? 0);
        const volCompleted = Number(baseline.kpis?.item_volume?.completed ?? 0);
        if (isNaN(volTotal) || volTotal < 0) {
            toast.error('Total items cannot be negative');
            return;
        }
        if (isNaN(volCompleted) || volCompleted < 0) {
            toast.error('Completed items cannot be negative');
            return;
        }
        if (volCompleted > volTotal) {
            toast.error('Completed items cannot exceed total items');
            return;
        }
        const velocity = Number(baseline.kpis?.velocity ?? 0);
        if (isNaN(velocity) || velocity < 0) {
            toast.error('Velocity cannot be negative');
            return;
        }
        const cycleTime = Number(baseline.kpis?.cycle_time ?? 0);
        if (isNaN(cycleTime) || cycleTime < 0) {
            toast.error('Cycle time cannot be negative');
            return;
        }
        const defectDensity = Number(baseline.kpis?.defect_density ?? 0);
        if (isNaN(defectDensity) || defectDensity < 0) {
            toast.error('Defect density cannot be negative');
            return;
        }
        const prSpeed = Number(baseline.kpis?.pr_review_speed ?? 0);
        if (isNaN(prSpeed) || prSpeed < 0) {
            toast.error('PR review speed cannot be negative');
            return;
        }

        setSaving(true);
        try {
            const payload: {
                kpis: CompanyBaselineData['kpis'];
                workload_settings?: {
                    seniority_weights: {
                        junior: number;
                        mid: number;
                        senior: number;
                    };
                    per_sprint_limits: {
                        under: number;
                        over: number;
                    };
                };
                workload_settings_effective_from?: string;
            } = {
                kpis: baseline.kpis,
            };

            // Workload settings drive developer status and can only be saved by superadmins
            if (isSuperAdmin) {
                payload.workload_settings = {
                    seniority_weights: {
                        junior: Number(Number(baseline.workload_settings?.seniority_weights?.junior ?? 0.7).toFixed(2)),
                        mid: Number(Number(baseline.workload_settings?.seniority_weights?.mid ?? 1.0).toFixed(2)),
                        senior: Number(Number(baseline.workload_settings?.seniority_weights?.senior ?? 1.3).toFixed(2)),
                    },
                    per_sprint_limits: {
                        under: Math.round(Number(baseline.workload_settings?.per_sprint_limits?.under ?? 3)),
                        over: Math.round(Number(baseline.workload_settings?.per_sprint_limits?.over ?? 6)),
                    },
                };
                if (effectiveFrom) {
                    payload.workload_settings_effective_from = effectiveFrom;
                }
            }

            const res = await companyBaseline.updateBaseline(payload);
            if (res && (res.status_code === 200 || res.status_code === 201)) {
                if (effectiveFrom === savedEffectiveFrom) {
                    toast.success(`Baseline updated: Changes applied to the existing version in effect since ${effectiveFrom}.`);
                } else {
                    toast.success(`Baseline updated: New version created with effective date ${effectiveFrom}.`);
                }
                const authorName = user?.first_name
                    ? `${user.first_name} ${user.last_name || ''}`.trim()
                    : user?.username || user?.email || 'Admin';
                const nowIso = new Date().toISOString();
                saveVersionMeta(effectiveFrom, authorName, nowIso);
                setDraftDate(null);
                setHasUnsavedChanges(false);
                setIsFieldChanged(false);
                setSavedEffectiveFrom(effectiveFrom);
                setEffectiveFrom(effectiveFrom);
                if (res.data) {
                    const data: CompanyBaselineData = res.data;
                    const history = data.workload_settings_history || [];
                    const matchingHistory = history.find(h => h.effective_from === effectiveFrom);
                    const activeSettings = matchingHistory?.settings || data.workload_settings;
                    const ranges = matchingHistory?.ranges || data.workload_ranges || null;

                    const underLimit = Math.round(Number(activeSettings?.per_sprint_limits?.under ?? 3));
                    const overLimit = Math.round(Number(activeSettings?.per_sprint_limits?.over ?? 6));

                    const juniorWeight = Number(activeSettings?.seniority_weights?.junior ?? 0.7);
                    const midWeight = Number(activeSettings?.seniority_weights?.mid ?? 1.0);
                    const seniorWeight = Number(activeSettings?.seniority_weights?.senior ?? 1.3);

                    data.workload_settings = {
                        ...(activeSettings || {}),
                        seniority_weights: { junior: juniorWeight, mid: midWeight, senior: seniorWeight },
                        per_sprint_limits: { under: underLimit, over: overLimit },
                    };
                    setCurrentRanges(ranges);
                    setBaseline(data);
                }
            } else {
                toast.error(res?.message || 'Failed to update');
            }
        } catch (error: unknown) {
            console.error(error);
            const err = error as {
                message?: string;
                response?: {
                    data?: {
                        status_code?: number;
                        message?: string;
                        data?: {
                            non_field_errors?: string[] | string;
                            effective_from?: string[] | string;
                            [key: string]: unknown;
                        };
                    };
                };
            };
            const errData = err?.response?.data;
            if (errData?.status_code === 403) {
                toast.error(errData.message || 'Only superadmins can change workload settings.');
            } else if (errData?.data?.non_field_errors) {
                const msg = Array.isArray(errData.data.non_field_errors)
                    ? errData.data.non_field_errors.join(' ')
                    : errData.data.non_field_errors;
                toast.error(msg);
            } else if (errData?.data?.effective_from) {
                const msg = Array.isArray(errData.data.effective_from)
                    ? errData.data.effective_from.join(' ')
                    : errData.data.effective_from;
                toast.error(`Effective date: ${msg}`);
            } else if (errData?.data && typeof errData.data === 'object') {
                const firstKey = Object.keys(errData.data)[0];
                const firstErr = errData.data[firstKey];
                const msg = Array.isArray(firstErr) ? firstErr.join(' ') : String(firstErr);
                toast.error(`${firstKey}: ${msg}`);
            } else {
                toast.error(errData?.message || err?.message || 'Error saving baseline');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteVersion = async (dateStr: string) => {
        if (!isSuperAdmin) {
            toast.error('Only superadmins can delete workload settings versions.');
            return;
        }
        if (!confirm(`Are you sure you want to delete workload settings saved for ${dateStr}?`)) {
            return;
        }
        setDeletingDate(dateStr);
        try {
            const res = await companyBaseline.deleteWorkloadSettingsVersion(dateStr);
            if (res && res.status_code === 200) {
                toast.success(`Settings version for ${dateStr} deleted`);
                setDraftDate(null);
                if (res.data) {
                    const data: CompanyBaselineData = res.data;
                    const nextDate = data.workload_settings_effective_from || getTodayStr();
                    setEffectiveFrom(nextDate);
                    setSavedEffectiveFrom(nextDate);

                    const activeSettings = data.workload_settings;
                    data.workload_settings = {
                        ...(activeSettings || {}),
                        seniority_weights: {
                            junior: activeSettings?.seniority_weights?.junior ?? 0.7,
                            mid: activeSettings?.seniority_weights?.mid ?? 1.0,
                            senior: activeSettings?.seniority_weights?.senior ?? 1.3,
                        },
                        per_sprint_limits: {
                            under: Math.round(Number(activeSettings?.per_sprint_limits?.under ?? 3)),
                            over: Math.round(Number(activeSettings?.per_sprint_limits?.over ?? 6)),
                        },
                    };
                    setCurrentRanges(data.workload_ranges || null);
                    setBaseline(data);
                    setHasUnsavedChanges(false);
                    setIsFieldChanged(false);
                } else {
                    loadData();
                }
            } else {
                toast.error(res?.message || 'Failed to delete settings version');
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err?.response?.data?.message || 'Error deleting settings version');
        } finally {
            setDeletingDate(null);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <RefreshCcw className="w-8 h-8 text-primary animate-spin" />
                </div>
            </DashboardLayout>
        );
    }

    if (!baseline) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
                    Could not load baseline data.
                </div>
            </DashboardLayout>
        );
    }

    const currentJunior = baseline.workload_settings?.seniority_weights?.junior ?? 0.7;
    const currentMid = baseline.workload_settings?.seniority_weights?.mid ?? 1.0;
    const currentSenior = baseline.workload_settings?.seniority_weights?.senior ?? 1.3;
    const currentUnder = baseline.workload_settings?.per_sprint_limits?.under ?? 3;
    const currentOver = baseline.workload_settings?.per_sprint_limits?.over ?? 6;

    // Superadmin Workload settings validations
    const isJuniorInvalid = currentJunior !== '' && (isNaN(Number(currentJunior)) || Number(currentJunior) < 0.1 || Number(currentJunior) > 100);
    const isMidInvalid = currentMid !== '' && (isNaN(Number(currentMid)) || Number(currentMid) < 0.1 || Number(currentMid) > 100);
    const isSeniorInvalid = currentSenior !== '' && (isNaN(Number(currentSenior)) || Number(currentSenior) < 0.1 || Number(currentSenior) > 100);
    const isWeightInvalid = isJuniorInvalid || isMidInvalid || isSeniorInvalid;

    const isUnderOutOfRange = currentUnder !== '' && (isNaN(Number(currentUnder)) || Number(currentUnder) < 0 || Number(currentUnder) > 100);
    const isOverOutOfRange = currentOver !== '' && (isNaN(Number(currentOver)) || Number(currentOver) < 0 || Number(currentOver) > 100);
    const isLimitOrderInvalid = currentUnder !== '' && currentOver !== '' && !isUnderOutOfRange && !isOverOutOfRange && Number(currentUnder) >= Number(currentOver);
    const isLimitInvalid = isUnderOutOfRange || isOverOutOfRange || isLimitOrderInvalid;

    // KPI validations
    const complianceVal = baseline.kpis?.compliance_rate;
    const isComplianceInvalid = complianceVal !== undefined && complianceVal !== '' && (isNaN(Number(complianceVal)) || Number(complianceVal) < 0 || Number(complianceVal) > 100);

    const aiUsageVal = baseline.kpis?.ai_usage;
    const isAiUsageInvalid = aiUsageVal !== undefined && aiUsageVal !== '' && (isNaN(Number(aiUsageVal)) || Number(aiUsageVal) < 0 || Number(aiUsageVal) > 100);

    const itemTotal = Number(baseline.kpis?.item_volume?.total ?? 0);
    const itemCompleted = Number(baseline.kpis?.item_volume?.completed ?? 0);
    const isItemTotalNegative = itemTotal < 0;
    const isItemCompletedNegative = itemCompleted < 0;
    const isItemCompletedExceedsTotal = !isItemTotalNegative && !isItemCompletedNegative && itemCompleted > itemTotal;
    const isItemVolumeInvalid = isItemTotalNegative || isItemCompletedNegative || isItemCompletedExceedsTotal;

    const isKpiInvalid = isComplianceInvalid || isAiUsageInvalid || isItemVolumeInvalid;
    const isFormInvalid = (isSuperAdmin && (isLimitInvalid || isWeightInvalid)) || isKpiInvalid;

    return (
        <DashboardLayout>
            <div className="space-y-8 pb-24 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-1 flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl border border-primary/20 text-primary">
                                <Building2 className="w-7 h-7" />
                            </div>
                            Company Baseline
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Manage organisation-wide performance targets, developer capacity weights, and sprint compliance thresholds.
                        </p>
                    </div>
                    {hasUnsavedChanges && (
                        <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-500 px-3.5 py-1.5 rounded-full text-xs font-semibold border border-amber-500/20 shadow-sm animate-pulse">
                            <AlertTriangle size={14} />
                            Unsaved Changes
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-8">
                    {/* Section 1: Developer Capacity & Workload Baseline */}
                    <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden">
                        {/* Decorative background subtle glow */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-border">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20">
                                    <Scale className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
                                        Developer Capacity & Workload Baseline
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        Configure seniority multipliers and sprint task thresholds for capacity-based workload compliance.
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {baseline.workload_settings_effective_from && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                        <Calendar size={13} /> In effect since {baseline.workload_settings_effective_from}
                                    </span>
                                )}
                                {isSuperAdmin ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                        <Shield size={13} /> Superadmin Access
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                        <Lock size={13} /> View Only (Superadmin Required)
                                    </span>
                                )}
                            </div>
                        </div>

                        {!isSuperAdmin && (
                            <div className="mt-6 flex items-center gap-2.5 p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl text-xs">
                                <Lock size={16} className="shrink-0" />
                                <span>
                                    Workload and capacity compliance settings can only be modified by Super Administrators. You can view current values, but inputs are locked.
                                </span>
                            </div>
                        )}

                        {/* Formula explainer box */}
                        <div className="mt-6 bg-muted/40 border border-border/80 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
                                    <Info size={14} /> Capacity & Compliance Formula
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    <span className="font-semibold text-foreground">Capacity</span> = Seniority Weight × Project Allocation % &nbsp;•&nbsp;
                                    <span className="font-semibold text-foreground">Ideal Range</span> = (Min to Max Tasks) × Capacity
                                </p>
                            </div>
                            <div className="flex items-center gap-2.5 text-xs text-muted-foreground bg-card/60 px-3.5 py-2 rounded-lg border border-border">
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Underutilised (&lt; Min)
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Balanced (Ideal)
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-rose-500"></span> Overloaded (&gt; Max)
                                </span>
                            </div>
                        </div>

                        {/* Seniority Weights Section (3 fields: Junior, Mid Senior, Senior) */}
                        <div className="mt-8">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                                        <Users size={16} className="text-primary" /> Seniority Level Weights
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Relative capacity multiplier assigned to each developer seniority tier (must be between 0.1 and 100).
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Junior */}
                                <div className="bg-card/60 border border-border rounded-xl p-5 hover:border-border/80 transition-all">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-foreground">Junior</label>
                                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                            Junior Tier
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        Capacity multiplier for Junior engineers (Default: 0.7).
                                    </p>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.1"
                                            disabled={!isSuperAdmin}
                                            value={currentJunior}
                                            onChange={(e) => handleSeniorityWeightChange('junior', e.target.value)}
                                            onKeyDown={handleDecimalTwoPlacesKeyDown}
                                            onPaste={handleDecimalTwoPlacesPaste}
                                            onWheel={handleWheelBlur}
                                            className={`w-full px-3.5 py-2.5 bg-muted/50 border rounded-lg text-foreground focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed transition font-mono text-sm ${
                                                isJuniorInvalid
                                                    ? 'border-destructive focus:border-destructive ring-1 ring-destructive'
                                                    : 'border-border focus:border-primary'
                                            }`}
                                            placeholder="0.70"
                                        />
                                        {isJuniorInvalid && (
                                            <p className="text-xs text-destructive mt-1.5 flex items-center gap-1 font-medium">
                                                <AlertTriangle size={13} className="shrink-0" />
                                                <span>Must be between 0.1 and 100.</span>
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Mid Senior */}
                                <div className="bg-card/60 border border-border rounded-xl p-5 hover:border-border/80 transition-all">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-foreground">Mid Senior</label>
                                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                                            Mid Tier
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        Capacity multiplier for Mid-Senior engineers(Default:1.0).
                                    </p>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.1"
                                            disabled={!isSuperAdmin}
                                            value={currentMid}
                                            onChange={(e) => handleSeniorityWeightChange('mid', e.target.value)}
                                            onKeyDown={handleDecimalTwoPlacesKeyDown}
                                            onPaste={handleDecimalTwoPlacesPaste}
                                            onWheel={handleWheelBlur}
                                            className={`w-full px-3.5 py-2.5 bg-muted/50 border rounded-lg text-foreground focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed transition font-mono text-sm ${
                                                isMidInvalid
                                                    ? 'border-destructive focus:border-destructive ring-1 ring-destructive'
                                                    : 'border-border focus:border-primary'
                                            }`}
                                            placeholder="1.00"
                                        />
                                        {isMidInvalid && (
                                            <p className="text-xs text-destructive mt-1.5 flex items-center gap-1 font-medium">
                                                <AlertTriangle size={13} className="shrink-0" />
                                                <span>Must be between 0.1 and 100.</span>
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Senior */}
                                <div className="bg-card/60 border border-border rounded-xl p-5 hover:border-border/80 transition-all">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-foreground">Senior</label>
                                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20">
                                            Senior Tier
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        Capacity multiplier for Senior engineers(Default:1.3). 
                                    </p>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.1"
                                            disabled={!isSuperAdmin}
                                            value={currentSenior}
                                            onChange={(e) => handleSeniorityWeightChange('senior', e.target.value)}
                                            onKeyDown={handleDecimalTwoPlacesKeyDown}
                                            onPaste={handleDecimalTwoPlacesPaste}
                                            onWheel={handleWheelBlur}
                                            className={`w-full px-3.5 py-2.5 bg-muted/50 border rounded-lg text-foreground focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed transition font-mono text-sm ${
                                                isSeniorInvalid
                                                    ? 'border-destructive focus:border-destructive ring-1 ring-destructive'
                                                    : 'border-border focus:border-primary'
                                            }`}
                                            placeholder="1.30"
                                        />
                                        {isSeniorInvalid && (
                                            <p className="text-xs text-destructive mt-1.5 flex items-center gap-1 font-medium">
                                                <AlertTriangle size={13} className="shrink-0" />
                                                <span>Must be between 0.1 and 100.</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sprint Task Limits for Compliance Section (2 fields: Minimum and Maximum) */}
                        <div className="mt-8 pt-6 border-t border-border">
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                                    <Sliders size={16} className="text-primary" /> Sprint Task Limits (Compliance)
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Expected task/item count range for a 100% capacity developer in one sprint.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Minimum Sprint Tasks */}
                                <div className="bg-card/60 border border-border rounded-xl p-5 hover:border-border/80 transition-all">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-foreground">Minimum Sprint Tasks</label>
                                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                            Min (Underutilised Threshold)
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        Fewer tasks than this × capacity is classified as <span className="text-blue-500 font-medium">Underutilised</span>
                                    </p>
                                    <input
                                        type="number"
                                        step="1"
                                        min="0"
                                        disabled={!isSuperAdmin}
                                        value={currentUnder}
                                        onChange={(e) => handleSprintLimitChange('under', e.target.value)}
                                        onKeyDown={handlePositiveIntegerKeyDown}
                                        onPaste={handlePositiveIntegerPaste}
                                        onWheel={handleWheelBlur}
                                        className={`w-full px-3.5 py-2.5 bg-muted/50 border rounded-lg text-foreground focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed transition font-mono text-sm ${
                                            isUnderOutOfRange
                                                ? 'border-destructive focus:border-destructive ring-1 ring-destructive'
                                                : 'border-border focus:border-primary'
                                        }`}
                                        placeholder="3"
                                    />
                                    {isUnderOutOfRange && (
                                        <p className="text-xs text-destructive mt-1.5 flex items-center gap-1 font-medium">
                                            <AlertTriangle size={13} className="shrink-0" />
                                            <span>Must be between 0 and 100.</span>
                                        </p>
                                    )}
                                </div>

                                {/* Maximum Sprint Tasks */}
                                <div className="bg-card/60 border border-border rounded-xl p-5 hover:border-border/80 transition-all">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-foreground">Maximum Sprint Tasks</label>
                                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                            Max (Overloaded Threshold)
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        More tasks than this × capacity is classified as <span className="text-rose-500 font-medium">Overloaded</span>
                                    </p>
                                    <input
                                        type="number"
                                        step="1"
                                        min="0"
                                        disabled={!isSuperAdmin}
                                        value={currentOver}
                                        onChange={(e) => handleSprintLimitChange('over', e.target.value)}
                                        onKeyDown={handlePositiveIntegerKeyDown}
                                        onPaste={handlePositiveIntegerPaste}
                                        onWheel={handleWheelBlur}
                                        className={`w-full px-3.5 py-2.5 bg-muted/50 border rounded-lg text-foreground focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed transition font-mono text-sm ${
                                            isOverOutOfRange
                                                ? 'border-destructive focus:border-destructive ring-1 ring-destructive'
                                                : 'border-border focus:border-primary'
                                        }`}
                                        placeholder="6"
                                    />
                                    {isOverOutOfRange && (
                                        <p className="text-xs text-destructive mt-1.5 flex items-center gap-1 font-medium">
                                            <AlertTriangle size={13} className="shrink-0" />
                                            <span>Must be between 0 and 100.</span>
                                        </p>
                                    )}
                                </div>

                                {isLimitInvalid && (
                                    <div className="md:col-span-2 flex items-center gap-2 p-3.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-medium">
                                        <AlertTriangle size={16} className="shrink-0" />
                                        <span>
                                            {isUnderOutOfRange
                                                ? `Validation error: Minimum sprint tasks (${currentUnder}) must be between 0 and 100.`
                                                : isOverOutOfRange
                                                ? `Validation error: Maximum sprint tasks (${currentOver}) must be between 0 and 100.`
                                                : `Validation error: Minimum sprint tasks (${currentUnder}) must be strictly less than maximum sprint tasks (${currentOver}).`}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Effective Date & Live Preview Card */}
                        <div className="mt-8 pt-6 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Effective From Date */}
                            <div className="bg-card/60 border border-border rounded-xl p-5">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                        <Calendar size={15} className="text-primary" /> Effective From Date
                                    </label>
                                    <div className="flex items-center gap-2">
                                        {savedEffectiveFrom && effectiveFrom !== savedEffectiveFrom && (
                                            <button
                                                type="button"
                                                disabled={!isSuperAdmin || !isFieldChanged}
                                                onClick={() => {
                                                    setEffectiveFrom(savedEffectiveFrom);
                                                    setDraftDate(null);
                                                    setHasUnsavedChanges(isFieldChanged);
                                                }}
                                                className="text-xs text-muted-foreground hover:text-primary hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Reset to saved effective date"
                                            >
                                                Reset to Saved ({savedEffectiveFrom})
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            disabled={!isFieldChanged}
                                            onClick={handleSetToToday}
                                            className="text-xs text-primary hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                            title={!isFieldChanged ? 'Modify any field above to enable changing the effective date' : undefined}
                                        >
                                            Set to Today
                                        </button>
                                    </div>
                                </div>
                                {(() => {
                                    const activeOrSelectedDate = effectiveFrom || baseline.workload_settings_effective_from;
                                    const historyList = baseline.workload_settings_history || [];
                                    const match = historyList.find(h => h.effective_from === activeOrSelectedDate)
                                        || historyList.find(h => h.effective_from === baseline.workload_settings_effective_from)
                                        || { effective_from: activeOrSelectedDate || getTodayStr() };
                                    const versionsMeta = getStoredVersionsMeta();
                                    const savedByText = formatSavedBy(match, versionsMeta, user);

                                    return (
                                        <div className="text-xs text-muted-foreground mb-3 pb-2.5 border-b border-border/60 space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span>Current version in effect since:</span>
                                                <span className="font-semibold text-foreground font-mono bg-muted px-2 py-0.5 rounded border border-border/60">
                                                    {baseline.workload_settings_effective_from || activeOrSelectedDate}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground font-normal">
                                                {savedByText}
                                            </p>
                                        </div>
                                    );
                                })()}
                                <p className="text-xs text-muted-foreground mb-3">
                                    Sprints starting on or after this date will apply these settings. Past sprints remain unchanged.
                                </p>
                                <div className="relative flex items-center group">
                                    <input
                                        ref={dateInputRef}
                                        type="date"
                                        disabled={!isFieldChanged}
                                        value={effectiveFrom}
                                        onChange={(e) => handleDateChange(e.target.value)}
                                        onWheel={handleWheelBlur}
                                        title={!isFieldChanged ? 'Modify any field above to enable changing the effective date' : undefined}
                                        className="w-full pl-3.5 pr-10 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed transition text-sm [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:z-10"
                                    />
                                    <div
                                        className={`absolute right-3.5 pointer-events-none transition-colors ${
                                            !isFieldChanged
                                                ? 'text-muted-foreground/40'
                                                : 'text-primary group-hover:text-primary/80'
                                        }`}
                                    >
                                        <Calendar size={16} />
                                    </div>
                                </div>
                                {!isFieldChanged && (
                                    <p className="text-[11px] text-muted-foreground/80 mt-1.5 flex items-center gap-1">
                                        <Lock size={12} className="shrink-0 text-muted-foreground/60" />
                                        <span>Modify any field above to enable setting a new effective date.</span>
                                    </p>
                                )}
                                {savedEffectiveFrom && effectiveFrom !== savedEffectiveFrom && (
                                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-amber-500 font-medium bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
                                        <AlertTriangle size={13} className="shrink-0" />
                                        <span>Unsaved date ({effectiveFrom}). Click &ldquo;Save Baseline&rdquo; to persist.</span>
                                    </div>
                                )}
                                {isFieldChanged && effectiveFrom === savedEffectiveFrom && (
                                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-blue-500 font-medium bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg">
                                        <Info size={13} className="shrink-0" />
                                        <span>Effective date unchanged. Updated values will apply to the existing version in effect since {effectiveFrom}.</span>
                                    </div>
                                )}
                            </div>

                            {/* Live Range Preview */}
                            <div className="bg-gradient-to-br from-primary/5 via-card to-card border border-primary/20 rounded-xl p-5 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-2">
                                        <Sparkles size={14} /> {hasUnsavedChanges ? 'Live Task Range Preview' : 'Ideal Task Range'} (at 100% Allocation)
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        {hasUnsavedChanges
                                            ? 'Calculated sprint task ranges with current unsaved inputs:'
                                            : 'Configured ideal task ranges for active workload settings:'}
                                    </p>
                                </div>
                                {(() => {
                                    const liveJunior = formatIdealRange(Number(currentUnder) * Number(currentJunior), Number(currentOver) * Number(currentJunior));
                                    const liveMid = formatIdealRange(Number(currentUnder) * Number(currentMid), Number(currentOver) * Number(currentMid));
                                    const liveSenior = formatIdealRange(Number(currentUnder) * Number(currentSenior), Number(currentOver) * Number(currentSenior));

                                    const juniorRange = hasUnsavedChanges
                                        ? liveJunior
                                        : currentRanges?.junior ? `${currentRanges.junior.min} – ${currentRanges.junior.max}` : liveJunior;
                                    const midRange = hasUnsavedChanges
                                        ? liveMid
                                        : currentRanges?.mid ? `${currentRanges.mid.min} – ${currentRanges.mid.max}` : liveMid;
                                    const seniorRange = hasUnsavedChanges
                                        ? liveSenior
                                        : currentRanges?.senior ? `${currentRanges.senior.min} – ${currentRanges.senior.max}` : liveSenior;

                                    return (
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div className="bg-card/80 p-2.5 rounded-lg border border-border">
                                                <p className="text-[10px] uppercase text-muted-foreground font-semibold">Junior</p>
                                                <p className="text-sm font-bold text-foreground mt-0.5">
                                                    {juniorRange}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">tasks/sprint</p>
                                            </div>
                                            <div className="bg-card/80 p-2.5 rounded-lg border border-border">
                                                <p className="text-[10px] uppercase text-muted-foreground font-semibold">Mid Senior</p>
                                                <p className="text-sm font-bold text-foreground mt-0.5">
                                                    {midRange}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">tasks/sprint</p>
                                            </div>
                                            <div className="bg-card/80 p-2.5 rounded-lg border border-border">
                                                <p className="text-[10px] uppercase text-muted-foreground font-semibold">Senior</p>
                                                <p className="text-sm font-bold text-foreground mt-0.5">
                                                    {seniorRange}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">tasks/sprint</p>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Version History Collapsible */}
                        {baseline.workload_settings_history && baseline.workload_settings_history.length > 0 && (
                            <div className="mt-8 pt-6 border-t border-border">
                                <button
                                    type="button"
                                    onClick={() => setShowHistory(!showHistory)}
                                    className="flex items-center justify-between w-full text-left text-sm font-semibold text-foreground hover:text-primary transition"
                                >
                                    <span className="flex items-center gap-2">
                                        <History size={16} className="text-primary" />
                                        Workload Settings Version History ({baseline.workload_settings_history.length})
                                    </span>
                                    {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>

                                {showHistory && (
                                    <div className="mt-4 space-y-3">
                                        <div className="overflow-x-auto rounded-xl border border-border bg-card/40">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-muted/50 text-muted-foreground border-b border-border uppercase font-semibold">
                                                    <tr>
                                                        <th className="px-4 py-3">Version Period (From – To)</th>
                                                        <th className="px-4 py-3">Ideal Ranges (Jr / Mid / Sr)</th>
                                                        <th className="px-4 py-3">Seniority Weights</th>
                                                        <th className="px-4 py-3">Task Limits</th>
                                                        {isSuperAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {(() => {
                                                        const todayStr = getTodayStr();
                                                        const sortedAsc = [...(baseline.workload_settings_history || [])].sort((a, b) =>
                                                            a.effective_from.localeCompare(b.effective_from)
                                                        );
                                                        const sortedDesc = [...sortedAsc].reverse();
                                                        const activeVersionDate = baseline.workload_settings_effective_from || (
                                                            [...sortedAsc].reverse().find(historyEntry => historyEntry.effective_from <= todayStr)?.effective_from
                                                        );

                                                        return sortedDesc.map((historyEntry, historyIndex) => {
                                                            const settings = historyEntry.settings || {};
                                                            const seniorityWeights: Partial<SeniorityWeights> = settings.seniority_weights || {};
                                                            const sprintLimits: Partial<PerSprintLimits> = settings.per_sprint_limits || {};
                                                            const isFuture = historyEntry.effective_from > todayStr;
                                                            const isCurrentActive = activeVersionDate === historyEntry.effective_from;
                                                            const effectiveTo = resolveEffectiveTo(historyEntry, sortedAsc);
                                                            const savedByText = formatSavedBy(historyEntry, getStoredVersionsMeta(), user);
                                                            const vRanges = formatHistoryRanges(historyEntry);

                                                            return (
                                                                <tr key={historyEntry.effective_from || historyIndex} className="transition hover:bg-muted/20">
                                                                    <td className="px-4 py-3 font-medium text-foreground">
                                                                        <div className="flex items-center gap-2 font-mono">
                                                                            <span>
                                                                                {historyEntry.effective_from} – {effectiveTo || 'Present'}
                                                                            </span>
                                                                            {isCurrentActive && (
                                                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                                                    Active
                                                                                </span>
                                                                            )}
                                                                            {isFuture && (
                                                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                                                                    Upcoming
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-[11px] text-muted-foreground mt-0.5 font-normal">
                                                                            {savedByText}
                                                                        </p>
                                                                    </td>
                                                                    <td className="px-4 py-3 font-mono text-muted-foreground">
                                                                        <div className="space-y-0.5">
                                                                            <div><span className="text-muted-foreground/70">Jr:</span> <span className="text-foreground font-medium">{vRanges.junior}</span></div>
                                                                            <div><span className="text-muted-foreground/70">Mid:</span> <span className="text-foreground font-medium">{vRanges.mid}</span></div>
                                                                            <div><span className="text-muted-foreground/70">Sr:</span> <span className="text-foreground font-medium">{vRanges.senior}</span></div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-muted-foreground font-mono">
                                                                        {seniorityWeights.junior ?? 0.7} / {seniorityWeights.mid ?? 1.0} / {seniorityWeights.senior ?? 1.3}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-muted-foreground font-mono">
                                                                        {sprintLimits.under ?? 3} – {sprintLimits.over ?? 6} tasks
                                                                    </td>
                                                                    {isSuperAdmin && (
                                                                        <td className="px-4 py-3 text-right">
                                                                            <div className="flex items-center justify-end gap-3">
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={deletingDate === historyEntry.effective_from}
                                                                                    onClick={() => handleDeleteVersion(historyEntry.effective_from)}
                                                                                    className="inline-flex items-center gap-1 text-destructive hover:underline disabled:opacity-50"
                                                                                    title="Delete this settings version"
                                                                                >
                                                                                    {deletingDate === historyEntry.effective_from ? (
                                                                                        <RefreshCcw size={12} className="animate-spin" />
                                                                                    ) : (
                                                                                        <Trash2 size={13} />
                                                                                    )}
                                                                                    <span>Delete</span>
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            );
                                                        });
                                                    })()}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Section 2: Key Performance Indicators */}
                    <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
                        <div className="flex items-center gap-3 pb-6 border-b border-border mb-6">
                            <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-foreground">Key Performance Indicators</h2>
                                <p className="text-xs text-muted-foreground">
                                    Target metrics used across sprint performance comparisons and executive dashboards.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Velocity (Points)</label>
                                <p className="text-xs text-muted-foreground mb-2">Target story points completed per sprint.</p>
                                <input
                                    type="number"
                                    min="0"
                                    value={baseline.kpis?.velocity || 0}
                                    onChange={(e) => handleKpiChange('velocity', e.target.value)}
                                    onKeyDown={handlePositiveNumberKeyDown}
                                    onPaste={handlePositiveNumberPaste}
                                    onWheel={handleWheelBlur}
                                    className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary transition font-mono text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Compliance Rate (%)</label>
                                <p className="text-xs text-muted-foreground mb-2">Target security/coding standard compliance (0 – 100%).</p>
                                <input
                                    type="number"
                                    min="0"
                                    value={baseline.kpis?.compliance_rate || 0}
                                    onChange={(e) => handleKpiChange('compliance_rate', e.target.value)}
                                    onKeyDown={handlePositiveNumberKeyDown}
                                    onPaste={handlePositiveNumberPaste}
                                    onWheel={handleWheelBlur}
                                    className={`w-full px-3.5 py-2.5 bg-muted/50 border rounded-lg text-foreground focus:outline-none transition font-mono text-sm ${
                                        isComplianceInvalid
                                            ? 'border-destructive focus:border-destructive ring-1 ring-destructive'
                                            : 'border-border focus:border-primary'
                                    }`}
                                />
                                {isComplianceInvalid && (
                                    <p className="text-xs text-destructive mt-1.5 flex items-center gap-1 font-medium">
                                        <AlertTriangle size={13} className="shrink-0" />
                                        <span>Must be between 0% and 100%.</span>
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Cycle Time (Days)</label>
                                <p className="text-xs text-muted-foreground mb-2">Average time from start to completion.</p>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={baseline.kpis?.cycle_time || 0}
                                    onChange={(e) => handleKpiChange('cycle_time', e.target.value)}
                                    onKeyDown={handlePositiveNumberKeyDown}
                                    onPaste={handlePositiveNumberPaste}
                                    onWheel={handleWheelBlur}
                                    className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary transition font-mono text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Defect Density</label>
                                <p className="text-xs text-muted-foreground mb-2">Bugs per deployment/release.</p>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={baseline.kpis?.defect_density || 0}
                                    onChange={(e) => handleKpiChange('defect_density', e.target.value)}
                                    onKeyDown={handlePositiveNumberKeyDown}
                                    onPaste={handlePositiveNumberPaste}
                                    onWheel={handleWheelBlur}
                                    className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary transition font-mono text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">PR Review Speed (Hours)</label>
                                <p className="text-xs text-muted-foreground mb-2">Average time to review a pull request.</p>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={baseline.kpis?.pr_review_speed || 0}
                                    onChange={(e) => handleKpiChange('pr_review_speed', e.target.value)}
                                    onKeyDown={handlePositiveNumberKeyDown}
                                    onPaste={handlePositiveNumberPaste}
                                    onWheel={handleWheelBlur}
                                    className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary transition font-mono text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">AI Usage (%)</label>
                                <p className="text-xs text-muted-foreground mb-2">Target AI code generation/assistance rate (0 – 100%).</p>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={baseline.kpis?.ai_usage || 0}
                                    onChange={(e) => handleKpiChange('ai_usage', e.target.value)}
                                    onKeyDown={handlePositiveNumberKeyDown}
                                    onPaste={handlePositiveNumberPaste}
                                    onWheel={handleWheelBlur}
                                    className={`w-full px-3.5 py-2.5 bg-muted/50 border rounded-lg text-foreground focus:outline-none transition font-mono text-sm ${
                                        isAiUsageInvalid
                                            ? 'border-destructive focus:border-destructive ring-1 ring-destructive'
                                            : 'border-border focus:border-primary'
                                    }`}
                                />
                                {isAiUsageInvalid && (
                                    <p className="text-xs text-destructive mt-1.5 flex items-center gap-1 font-medium">
                                        <AlertTriangle size={13} className="shrink-0" />
                                        <span>Must be between 0% and 100%.</span>
                                    </p>
                                )}
                            </div>

                            <div className="md:col-span-2 border-t border-border pt-6 mt-2">
                                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Item Volume Targets</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">Total Items</label>
                                        <input
                                            type="number"
                                            step="1"
                                            min="0"
                                            value={baseline.kpis?.item_volume?.total || 0}
                                            onChange={(e) => handleItemVolumeChange('total', e.target.value)}
                                            onKeyDown={handlePositiveIntegerKeyDown}
                                            onPaste={handlePositiveIntegerPaste}
                                            onWheel={handleWheelBlur}
                                            className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary transition font-mono text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">Completed Items</label>
                                        <input
                                            type="number"
                                            step="1"
                                            min="0"
                                            value={baseline.kpis?.item_volume?.completed || 0}
                                            onChange={(e) => handleItemVolumeChange('completed', e.target.value)}
                                            onKeyDown={handlePositiveIntegerKeyDown}
                                            onPaste={handlePositiveIntegerPaste}
                                            onWheel={handleWheelBlur}
                                            className={`w-full px-3.5 py-2.5 bg-muted/50 border rounded-lg text-foreground focus:outline-none transition font-mono text-sm ${
                                                isItemCompletedExceedsTotal
                                                    ? 'border-destructive focus:border-destructive ring-1 ring-destructive'
                                                    : 'border-border focus:border-primary'
                                            }`}
                                        />
                                        {isItemCompletedExceedsTotal && (
                                            <p className="text-xs text-destructive mt-1.5 flex items-center gap-1 font-medium">
                                                <AlertTriangle size={13} className="shrink-0" />
                                                <span>Completed items cannot exceed total items ({itemTotal}).</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Floating Save Button */}
                <div className="fixed bottom-8 right-8 z-20">
                    <button
                        onClick={saveChanges}
                        disabled={saving || !hasUnsavedChanges || isFormInvalid}
                        className={`flex items-center gap-2.5 px-8 py-3.5 rounded-2xl font-semibold transition-all shadow-xl ${
                            hasUnsavedChanges && !isFormInvalid
                                ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/25 hover:scale-105 active:scale-95'
                                : 'bg-muted text-muted-foreground cursor-not-allowed border border-border shadow-none'
                        }`}
                        title={isFormInvalid ? 'Please resolve validation errors before saving' : undefined}
                    >
                        {saving ? (
                            <RefreshCcw className="w-5 h-5 animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        <span>{saving ? 'Saving Baseline...' : 'Save Baseline'}</span>
                    </button>
                </div>
            </div>
        </DashboardLayout>
    );
}

/**
 * Ideal task range shown in the live preview, same rule as the backend `ideal_range`
 * (data/analytics/workload.py): min = ceil(low), Overloaded starts at ceil(high) (at least min + 1),
 * so max = that - 1. Rounds to 6 decimals first so 3 * 0.7 = 2.0999... does not become 3 by float noise.
 * @param low - Min tasks per sprint x seniority weight
 * @param high - Max tasks per sprint x seniority weight
 * @returns The range as "min – max"
 */
function formatIdealRange(low: number, high: number): string {
    const idealMin = Math.ceil(roundTo6(low));
    const idealMax = Math.max(Math.ceil(roundTo6(high)), idealMin + 1) - 1;
    return `${idealMin} – ${idealMax}`;
}

/**
 * Rounds a number to 6 decimal places.
 * @param value - Number to round
 * @returns The rounded number
 */
function roundTo6(value: number): number {
    return Math.round(value * 1e6) / 1e6;
}
