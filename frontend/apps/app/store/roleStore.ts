import { create } from 'zustand';

export interface UserRoleData {
    is_manager?: boolean;
    is_staff?: boolean;
    is_superuser?: boolean;
    permission?: string[];
}

interface RolesState {
    isManager: boolean;
    isStaff: boolean;
    isSuperUser: boolean;
    features: {
        canAccessMessenger: boolean;
        canAccessCompliance: boolean;
        canAccessMetrics: boolean;
    };
    permission: string[];
    setRolesFromUser: (user: UserRoleData | null) => void;
}

export const useRoleStore = create<RolesState>((set) => ({
    isManager: false,
    isStaff: false,
    isSuperUser: false,
    features: {
        canAccessMessenger: true,
        canAccessCompliance: true,
        canAccessMetrics: true,
    },
    permission: [],
    setRolesFromUser: (user) => set({
        isManager: user?.is_manager || false,
        isStaff: user?.is_staff || false,
        isSuperUser: user?.is_superuser || false,
        permission: user?.permission || [],
    }),
}));
