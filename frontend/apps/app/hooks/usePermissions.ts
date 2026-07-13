import { useCallback } from 'react';
import { useRoleStore } from '../store/roleStore';

export function usePermissions() {
    const isManager = useRoleStore((state) => state.isManager);
    const isStaff = useRoleStore((state) => state.isStaff);
    const isSuperUser = useRoleStore((state) => state.isSuperUser);
    const features = useRoleStore((state) => state.features);

    const permission = useRoleStore((state) => state.permission);

    const hasPermission = useCallback((perm: string) => permission.includes(perm), [permission]);

    return {
        features,
        isManager,
        isStaff,
        isSuperUser,
        hasPermission,
    };
}
