import { Navigate, useLocation } from 'react-router-dom';
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
    const location = useLocation();
    const { isAuthenticated, isLoading, user } = useAuth();

    // Whitelist routes that expired users can access
    const ALLOWED_EXPIRED_ROUTES = [
        '/pricing',
        '/settings',
        '/contact',
        '/logout'
    ];

    const isAllowedRoute = ALLOWED_EXPIRED_ROUTES.some(route => location.pathname.startsWith(route)) || location.pathname.startsWith('/checkout');

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

    // Subscription Enforcement
    if (user && !user.role?.includes('admin')) { // Admins bypass subscription checks
        const status = user.plan?.status;
        const validUntil = user.plan?.validUntil ? new Date(user.plan.validUntil) : null;
        const now = new Date();

        const isExpired = (status === 'canceled' || status === 'past_due' || status === 'expired') &&
            (validUntil && validUntil < now);

        // Also check if status is specifically 'expired' (custom status we might set)

        // If the user has NO plan (e.g. initial state bug) or is expired
        // But we default to ACTIVE in model so likely 'free' users are treated as active?
        // Let's assume 'free' tier has 'active' status but might have limits. 
        // If the goal is "Lock out if subscription EXPIRED", we focus on that.
        // If user is on 'free' plan, maybe they can access? 
        // User request: "lock out users if their subscription has expired"

        if (isExpired && !isAllowedRoute) {
            return <Navigate to="/pricing" replace />;
        }
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        // User is authenticated but doesn't have the required role
        return <Navigate to="/dashboard" replace />; // Redirect to dashboard (no admin access)
    }

    return <>{children}</>;
}
