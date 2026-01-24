import { useEffect, useState } from "react";
import api from "@/services/api";
import { Activity, Users, ShoppingBag, TrendingUp, Zap, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface HealthStats {
    health: {
        status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
        errorRate24h: number;
    };
    offers: {
        total: number;
        active: number;
        new24h: number;
    };
    users: {
        total: number;
        new24h: number;
    };
    system: {
        uptime: number;
        memoryUsedMB: number;
    };
}

interface StatCardProps {
    title: string;
    value: React.ReactNode;
    subtitle: string;
    icon: React.ReactNode;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    gradient: string;
    iconBg: string;
}

function StatCard({ title, value, subtitle, icon, trend, gradient, iconBg }: StatCardProps) {
    return (
        <div className="flex flex-col gap-2">
            {/* Title outside the card */}
            <p className="text-sm text-white/70 font-medium px-1">{title}</p>

            <div className={cn(
                "relative overflow-hidden rounded-2xl p-6",
                "bg-gradient-to-br border border-white/10",
                "backdrop-blur-xl shadow-2xl",
                "transition-all duration-300 hover:scale-[1.02] hover:shadow-cyan-500/10",
                gradient
            )}>
                {/* Decorative glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-white/5 blur-3xl" />

                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className={cn(
                        "p-3 rounded-xl",
                        "bg-gradient-to-br shadow-lg",
                        iconBg
                    )}>
                        {icon}
                    </div>
                    {trend && (
                        <div className={cn(
                            "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
                            trend.isPositive
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-red-500/20 text-red-400"
                        )}>
                            {trend.isPositive ? (
                                <ArrowUpRight className="w-3 h-3" />
                            ) : (
                                <ArrowDownRight className="w-3 h-3" />
                            )}
                            {trend.value > 0 ? '+' : ''}{trend.value}%
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="relative z-10">
                    <p className="text-3xl font-bold text-white tracking-tight mb-1">{value}</p>
                    <p className="text-xs text-white/40">{subtitle}</p>
                </div>
            </div>
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="relative overflow-hidden rounded-2xl p-6 bg-white/5 animate-pulse">
                    <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-white/10" />
                    </div>
                    <div className="space-y-2">
                        <div className="h-4 w-24 bg-white/10 rounded" />
                        <div className="h-8 w-32 bg-white/10 rounded" />
                        <div className="h-3 w-20 bg-white/10 rounded" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function DashboardStats() {
    const [stats, setStats] = useState<HealthStats | null>(null);
    const [mrr, setMrr] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [healthRes, financeRes] = await Promise.all([
                    api.get('/admin/health-stats'),
                    api.get('/admin/finance/stats')
                ]);
                setStats(healthRes.data.data);
                if (financeRes.data.success) {
                    setMrr(financeRes.data.data.mrr);
                }
            } catch (error) {
                console.error("Failed to fetch stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading || !stats) {
        return <LoadingSkeleton />;
    }

    const getHealthStatus = () => {
        switch (stats.health.status) {
            case 'HEALTHY': return { text: 'Operacional', color: 'text-emerald-400' };
            case 'WARNING': return { text: 'Atenção', color: 'text-amber-400' };
            case 'CRITICAL': return { text: 'Crítico', color: 'text-red-400' };
            default: return { text: 'Desconhecido', color: 'text-gray-400' };
        }
    };

    const healthStatus = getHealthStatus();
    const formattedMrr = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format((mrr || 0) / 100);

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* System Health */}
            <StatCard
                title="Saúde do Sistema"
                value={
                    <span className={healthStatus.color}>{healthStatus.text}</span>
                }
                subtitle={`${stats.health.errorRate24h} erros nas últimas 24h`}
                icon={<Zap className="w-6 h-6 text-white" />}
                gradient="from-emerald-950/80 to-emerald-900/40"
                iconBg="from-emerald-500 to-emerald-600"
            />

            {/* Users */}
            <StatCard
                title="Usuários Ativos"
                value={stats.users.total.toLocaleString('pt-BR')}
                subtitle={`+${stats.users.new24h} novos hoje`}
                icon={<Users className="w-6 h-6 text-white" />}
                trend={stats.users.new24h > 0 ? { value: stats.users.new24h, isPositive: true } : undefined}
                gradient="from-blue-950/80 to-blue-900/40"
                iconBg="from-blue-500 to-blue-600"
            />

            {/* Offers */}
            <StatCard
                title="Ofertas Ativas"
                value={stats.offers.active.toLocaleString('pt-BR')}
                subtitle={`${stats.offers.total.toLocaleString('pt-BR')} total processadas`}
                icon={<ShoppingBag className="w-6 h-6 text-white" />}
                gradient="from-purple-950/80 to-purple-900/40"
                iconBg="from-purple-500 to-purple-600"
            />

            {/* Revenue */}
            <StatCard
                title="Receita Mensal (MRR)"
                value={formattedMrr}
                subtitle="Estimativa atual"
                icon={<TrendingUp className="w-6 h-6 text-white" />}
                gradient="from-cyan-950/80 to-cyan-900/40"
                iconBg="from-cyan-500 to-cyan-600"
            />
        </div>
    );
}
