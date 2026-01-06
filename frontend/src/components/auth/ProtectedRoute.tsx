import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

/**
 * ProtectedRoute component that redirects to login if user is not authenticated.
 * Also checks for specific roles if allowedRoles is provided.
 * Shows a loading spinner while checking authentication status.
 */
export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading, user } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        // User is authenticated but doesn't have the required role
        return <Navigate to="/dashboard" replace />; // Redirect to dashboard (no admin access)
    }

    return <>{children}</>;
}
