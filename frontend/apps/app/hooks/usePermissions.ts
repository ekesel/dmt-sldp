import { useAuth } from '../context/AuthContext';

export function usePermissions() {
    const { user } = useAuth();

    // Extensible feature flags. 
    // Set to true currently to allow all users access per user request,
    // but the infrastructure is here to restrict in the future.
    const features = {
        canAccessMessenger: true, // example: user?.is_manager || user?.is_staff || user?.is_superuser
        canAccessCompliance: true,
        canAccessMetrics: true,
    };

    return {
        features,
        isManager: user?.is_manager || false,
        isStaff: user?.is_staff || false,
        isSuperUser: user?.is_superuser || false,
    };
}
