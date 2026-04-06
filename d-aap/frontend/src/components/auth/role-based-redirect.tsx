import { Navigate } from 'react-router-dom';
import { useAuthProfile } from '@/hooks/use-api-queries';

export function RoleBasedRedirect() {
    const { data: profile, isLoading } = useAuthProfile();

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    const userRole = profile?.role?.toUpperCase();

    if (userRole === 'ADMIN') {
        return <Navigate to="/app/management" replace />;
    }

    return <Navigate to="/app/aureus" replace />;
}
