import { useState, useEffect } from 'react';
import {
    CreditCard,
    QrCode,
    Calendar,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Pause,
    Play,
    Loader2,
    Clock,
    Shield,
    Sparkles,
    ArrowUpRight,
    Receipt,
    Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import api from '@/services/api';
import { cn } from '@/lib/utils';

interface Subscription {
    planId: string;
    status: 'authorized' | 'active' | 'pending' | 'paused' | 'cancelled' | 'canceled' | 'expired' | 'past_due';
    accessType: 'recurring' | 'fixed';
    startDate: string;
    nextBillingDate?: string;
    endDate?: string;
    paymentMethod?: 'card' | 'pix' | 'boleto';
    lastPaymentDate?: string;
    failedAttempts?: number;
    provider?: 'mercadopago' | 'stripe';
}

interface SubscriptionData {
    subscription: Subscription | null;
    hasAccess: boolean;
    daysRemaining: number;
    isRecurring: boolean;
    canCancel: boolean;
}

const PLAN_CONFIG: Record<string, { name: string; color: string; gradient: string; icon: typeof Zap }> = {
    trial: { name: 'Teste Grátis', color: 'text-zinc-400', gradient: 'from-zinc-500 to-zinc-600', icon: Shield },
    'basic-monthly': { name: 'Básico', color: 'text-cyan-400', gradient: 'from-cyan-500 to-blue-500', icon: Zap },
    pro: { name: 'Profissional', color: 'text-purple-400', gradient: 'from-purple-500 to-pink-500', icon: Sparkles },
    agency: { name: 'Agência', color: 'text-amber-400', gradient: 'from-amber-500 to-orange-500', icon: Sparkles },
    'premium-annual': { name: 'Premium Anual', color: 'text-emerald-400', gradient: 'from-emerald-500 to-teal-500', icon: Sparkles }
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle }> = {
    authorized: { label: 'Ativa', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: CheckCircle },
    active: { label: 'Ativa', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: CheckCircle },
    pending: { label: 'Pendente', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: Clock },
    paused: { label: 'Pausada', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: Pause },
    cancelled: { label: 'Cancelada', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: XCircle },
    canceled: { label: 'Cancelada', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: XCircle },
    expired: { label: 'Expirada', color: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/30', icon: AlertTriangle }
};

export function SubscriptionManager() {
    const [data, setData] = useState<SubscriptionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const { toast } = useToast();

    const fetchSubscription = async () => {
        try {
            const response = await api.get('/payments/subscription');
            setData(response.data.data);
        } catch (error: any) {
            console.error('Failed to fetch subscription:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível carregar os dados da assinatura.'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubscription();
    }, []);

    const handlePortalSession = async () => {
        setActionLoading('portal');
        try {
            const response = await api.post('/payments/portal-session');
            if (response.data.url) {
                window.location.href = response.data.url;
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.response?.data?.error || 'Erro ao abrir portal de faturamento.'
            });
        } finally {
            setActionLoading(null);
        }
    };

    const handleCancel = async () => {
        setActionLoading('cancel');
        try {
            const response = await api.post('/payments/subscription/cancel');
            toast({
                title: 'Assinatura cancelada',
                description: response.data.message
            });
            setShowCancelConfirm(false);
            fetchSubscription();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.response?.data?.error || 'Falha ao cancelar assinatura.'
            });
        } finally {
            setActionLoading(null);
        }
    };

    const handlePause = async () => {
        setActionLoading('pause');
        try {
            const response = await api.post('/payments/subscription/pause');
            toast({
                title: 'Assinatura pausada',
                description: response.data.message
            });
            fetchSubscription();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.response?.data?.error || 'Falha ao pausar assinatura.'
            });
        } finally {
            setActionLoading(null);
        }
    };

    const handleReactivate = async () => {
        setActionLoading('reactivate');
        try {
            const response = await api.post('/payments/subscription/reactivate');
            toast({
                title: 'Assinatura reativada',
                description: response.data.message
            });
            fetchSubscription();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.response?.data?.error || 'Falha ao reativar assinatura.'
            });
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                    <span className="text-sm text-white/40">Carregando assinatura...</span>
                </div>
            </div>
        );
    }

    if (!data || !data.subscription) {
        return (
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/80 to-black/60 backdrop-blur-xl p-8">
                <div className="text-center max-w-md mx-auto">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
                        <Shield className="w-8 h-8 text-cyan-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Sem assinatura ativa</h3>
                    <p className="text-sm text-white/50 mb-6">
                        Escolha um plano para desbloquear todas as funcionalidades do VoxelPromo.
                    </p>
                    <Button
                        onClick={() => window.location.href = '/pricing'}
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0 px-6"
                    >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Ver Planos
                    </Button>
                </div>
            </div>
        );
    }
    const { subscription, hasAccess, daysRemaining, isRecurring, canCancel } = data;
    const planConfig = PLAN_CONFIG[subscription.planId] || PLAN_CONFIG['basic-monthly'];
    const PlanIcon = planConfig.icon;
    const provider = subscription.provider || 'mercadopago'; // or 'stripe'

    const normalizedStatus = subscription.status === 'active' ? 'authorized' : subscription.status;
    const statusConfig = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG.pending;
    const StatusIcon = statusConfig.icon;

    const PaymentMethodIcon = subscription.paymentMethod === 'card' ? CreditCard : QrCode;

    return (
        <div className="space-y-6">
            {/* Main Card */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/80 to-black/60 backdrop-blur-xl overflow-hidden">
                {/* Header Gradient */}
                <div className={cn("h-2 bg-gradient-to-r", planConfig.gradient)} />

                <div className="p-6">
                    {/* Plan & Status */}
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className={cn("w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center", planConfig.gradient)}>
                                <PlanIcon className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-bold text-white">
                                        Plano {planConfig.name}
                                    </h3>
                                    <span className={cn(
                                        "px-2.5 py-1 rounded-full text-xs font-medium border",
                                        statusConfig.bg, statusConfig.color, statusConfig.border
                                    )}>
                                        <StatusIcon className="w-3 h-3 inline mr-1" />
                                        {statusConfig.label}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 mt-1 text-sm text-white/50">
                                    <span className="flex items-center gap-1.5">
                                        <PaymentMethodIcon className="w-4 h-4" />
                                        {subscription.paymentMethod === 'card' ? 'Cartão' :
                                            subscription.paymentMethod === 'pix' ? 'Pix' : 'Boleto'}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4" />
                                        Desde {new Date(subscription.startDate).toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Access Badge */}
                        <div className={cn(
                            "px-4 py-2 rounded-xl border",
                            hasAccess
                                ? 'bg-emerald-500/10 border-emerald-500/30'
                                : 'bg-red-500/10 border-red-500/30'
                        )}>
                            <span className={cn(
                                "font-semibold",
                                hasAccess ? 'text-emerald-400' : 'text-red-400'
                            )}>
                                {hasAccess ? '✓ Acesso Ativo' : '✕ Sem Acesso'}
                            </span>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white/5 border border-white/5 rounded-xl p-4 hover:bg-white/[0.07] transition-colors">
                            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">
                                {isRecurring ? 'Próxima Cobrança' : 'Acesso até'}
                            </p>
                            <p className="text-xl font-bold text-white">
                                {subscription.nextBillingDate
                                    ? new Date(subscription.nextBillingDate).toLocaleDateString('pt-BR')
                                    : 'N/A'}
                            </p>
                        </div>

                        <div className="bg-white/5 border border-white/5 rounded-xl p-4 hover:bg-white/[0.07] transition-colors">
                            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Dias Restantes</p>
                            <p className={cn(
                                "text-xl font-bold",
                                daysRemaining <= 5 ? 'text-amber-400' : 'text-white'
                            )}>
                                {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}
                            </p>
                        </div>

                        <div className="bg-white/5 border border-white/5 rounded-xl p-4 hover:bg-white/[0.07] transition-colors">
                            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Tipo de Cobrança</p>
                            <p className="text-xl font-bold text-white">
                                {isRecurring ? 'Recorrente' : 'Avulso'}
                            </p>
                        </div>
                    </div>

                    {/* Warnings */}
                    {daysRemaining <= 5 && daysRemaining > 0 && !isRecurring && (
                        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-amber-400">Seu acesso expira em breve!</p>
                                <p className="text-sm text-white/50 mt-1">
                                    Renove sua assinatura para manter o acesso às funcionalidades premium.
                                </p>
                            </div>
                        </div>
                    )}

                    {subscription.failedAttempts && subscription.failedAttempts > 0 && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-red-400">Problema com pagamento</p>
                                <p className="text-sm text-white/50 mt-1">
                                    Houve {subscription.failedAttempts} tentativa(s) de cobrança falhada(s). Verifique os dados do seu cartão.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3 pt-4 border-t border-white/5">

                        {/* Stripe Portal Button */}
                        {provider === 'stripe' && isRecurring && (
                            <Button
                                onClick={handlePortalSession}
                                disabled={actionLoading === 'portal'}
                                className="bg-white/10 hover:bg-white/20 text-white border-0"
                            >
                                {actionLoading === 'portal' ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <ArrowUpRight className="w-4 h-4 mr-2" />
                                )}
                                Gerenciar Assinatura (Portal)
                            </Button>
                        )}


                        {!isRecurring && hasAccess && (
                            <Button
                                onClick={() => window.location.href = `/checkout/${subscription.planId}`}
                                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0"
                            >
                                <ArrowUpRight className="w-4 h-4 mr-2" />
                                Renovar Assinatura
                            </Button>
                        )}

                        {/* Legacy / Manual Actions for Non-Stripe */}
                        {provider !== 'stripe' && isRecurring && (subscription.status === 'authorized' || subscription.status === 'active') && (
                            <Button
                                variant="outline"
                                onClick={handlePause}
                                disabled={actionLoading === 'pause'}
                                className="border-white/10 text-white/70 hover:bg-white/5 hover:text-white"
                            >
                                {actionLoading === 'pause' ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Pause className="w-4 h-4 mr-2" />
                                )}
                                Pausar
                            </Button>
                        )}

                        {provider !== 'stripe' && subscription.status === 'paused' && (
                            <Button
                                onClick={handleReactivate}
                                disabled={actionLoading === 'reactivate'}
                                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0"
                            >
                                {actionLoading === 'reactivate' ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Play className="w-4 h-4 mr-2" />
                                )}
                                Reativar
                            </Button>
                        )}

                        <Button
                            variant="ghost"
                            onClick={() => window.location.href = '/pricing'}
                            className="text-white/50 hover:text-white hover:bg-white/5"
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Mudar Plano
                        </Button>

                        {provider !== 'stripe' && canCancel && !showCancelConfirm && (
                            <Button
                                variant="ghost"
                                onClick={() => setShowCancelConfirm(true)}
                                className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10 ml-auto"
                            >
                                Cancelar Assinatura
                            </Button>
                        )}
                    </div>

                    {/* Cancel Confirmation */}
                    {showCancelConfirm && (
                        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <p className="font-medium text-white mb-2">
                                Tem certeza que deseja cancelar?
                            </p>
                            <p className="text-sm text-white/50 mb-4">
                                Você manterá acesso até o fim do período pago atual. Após isso, perderá acesso às funcionalidades premium.
                            </p>
                            <div className="flex gap-3">
                                <Button
                                    variant="destructive"
                                    onClick={handleCancel}
                                    disabled={actionLoading === 'cancel'}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    {actionLoading === 'cancel' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Sim, cancelar
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowCancelConfirm(false)}
                                    className="border-white/10 text-white/70 hover:bg-white/5"
                                >
                                    Manter assinatura
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a
                    href="/pricing"
                    className="group p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/[0.08] transition-all flex items-center gap-4"
                >
                    <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <p className="font-medium text-white group-hover:text-purple-400 transition-colors">Comparar Planos</p>
                        <p className="text-sm text-white/40">Veja todos os recursos de cada plano</p>
                    </div>
                </a>

                <a
                    href="#"
                    onClick={(e) => {
                        e.preventDefault();
                        if (provider === 'stripe' && isRecurring) {
                            handlePortalSession();
                        }
                    }}
                    className="group p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/[0.08] transition-all flex items-center gap-4 cursor-pointer"
                >
                    <div className="p-3 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20">
                        <Receipt className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                        <p className="font-medium text-white group-hover:text-cyan-400 transition-colors">Histórico de Faturas</p>
                        <p className="text-sm text-white/40">Visualize seus pagamentos anteriores</p>
                    </div>
                </a>
            </div>
        </div>
    );
}

export default SubscriptionManager;
