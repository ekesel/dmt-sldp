import { create } from 'zustand';

interface RolesState {
    isManager: boolean;
    isStaff: boolean;
    isSuperUser: boolean;
    features: {
        canAccessMessenger: boolean;
        canAccessCompliance: boolean;
        canAccessMetrics: boolean;
    };
    setRolesFromUser: (user: any | null) => void;
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
    setRolesFromUser: (user) => set({
        isManager: user?.is_manager || false,
        isStaff: user?.is_staff || false,
        isSuperUser: user?.is_superuser || false,
    }),
}));
