import { useRoleStore } from '../store/roleStore';

export function usePermissions() {
    const isManager = useRoleStore((state) => state.isManager);
    const isStaff = useRoleStore((state) => state.isStaff);
    const isSuperUser = useRoleStore((state) => state.isSuperUser);
    const features = useRoleStore((state) => state.features);

    return {
        features,
        isManager,
        isStaff,
        isSuperUser,
    };
}
