import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

/**
 * Global expiration warning banner.
 * Shown when the user's subscription has ≤ 2 days remaining.
 * Appears at the top of the authenticated layout on all pages.
 */
export function ExpirationBanner() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Don't show for admins
    if (!user || user.role === 'admin') return null;

    const daysRemaining = user.plan?.daysRemaining;
    const status = user.plan?.status;

    // Only show when 1-2 days remaining AND subscription is still active/trialing
    if (
        daysRemaining === undefined ||
        daysRemaining === null ||
        daysRemaining > 2 ||
        daysRemaining <= 0 ||
        status === 'expired' ||
        status === 'canceled'
    ) {
        return null;
    }

    const isUrgent = daysRemaining <= 1;
    const message = daysRemaining === 1
        ? 'Seu acesso expira amanhã!'
        : `Seu acesso expira em ${daysRemaining} dias.`;

    return (
        <div
            className={`
                w-full px-4 py-3 flex items-center justify-between gap-4
                border-b transition-colors
                ${isUrgent
                    ? 'bg-red-500/10 border-red-500/20 text-red-400'
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                }
            `}
        >
            <div className="flex items-center gap-3 min-w-0">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium truncate">
                    ⚠️ {message} Renove para manter o acesso a todas as funcionalidades.
                </span>
            </div>
            <button
                onClick={() => navigate('/pricing')}
                className={`
                    flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold
                    whitespace-nowrap transition-colors
                    ${isUrgent
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-amber-500 hover:bg-amber-600 text-black'
                    }
                `}
            >
                Renovar
                <ArrowRight className="w-4 h-4" />
            </button>
        </div>
    );
}

export default ExpirationBanner;
