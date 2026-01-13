import { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign, TrendingUp, TrendingDown, RefreshCcw, CreditCard, ArrowUpRight, ArrowDownRight, Wallet, Receipt } from "lucide-react";
import api from "@/services/api";
import { cn } from "@/lib/utils";

interface FinanceStats {
    mrr: number;
    activeSubscriptions: number;
    revenue: {
        currentMonth: number;
        lastMonth: number;
        growth: number;
    };
    recentTransactions: any[];
}

interface StatCardProps {
    title: string;
    value: string;
    subtitle: string;
    icon: React.ReactNode;
    trend?: {
        value: number;
        isPositive: boolean;
        label: string;
    };
    gradient: string;
    iconBg: string;
}

function StatCard({ title, value, subtitle, icon, trend, gradient, iconBg }: StatCardProps) {
    return (
        <div className={cn(
            "relative overflow-hidden rounded-2xl p-6",
            "bg-gradient-to-br border border-white/10",
            "backdrop-blur-xl shadow-2xl",
            "transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
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
                        {trend.value}% {trend.label}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="relative z-10">
                <p className="text-sm text-white/60 font-medium mb-1">{title}</p>
                <p className="text-3xl font-bold text-white tracking-tight mb-1">{value}</p>
                <p className="text-xs text-white/40">{subtitle}</p>
            </div>
        </div>
    );
}

export function FinancialReports() {
    const [stats, setStats] = useState<FinanceStats | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const response = await api.get("/admin/finance/stats");
            if (response.data.success) {
                setStats(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching finance stats:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value / 100);
    };

    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-40 rounded-2xl bg-white/5 animate-pulse" />
                ))}
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="space-y-8">
            <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={fetchStats} className="bg-white/5 hover:bg-white/10 border-white/10">
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Atualizar Dados
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* MRR Card */}
                <StatCard
                    title="MRR Estimado"
                    value={formatCurrency(stats.mrr)}
                    subtitle="Receita Recorrente Mensal (Base: planos ativos)"
                    icon={<Wallet className="w-6 h-6 text-white" />}
                    gradient="from-cyan-950/80 to-cyan-900/40"
                    iconBg="from-cyan-500 to-cyan-600"
                />

                {/* Revenue Card */}
                <StatCard
                    title="Faturamento (Mês)"
                    value={formatCurrency(stats.revenue.currentMonth)}
                    subtitle="Total processado neste mês"
                    icon={<DollarSign className="w-6 h-6 text-white" />}
                    trend={{
                        value: Math.abs(stats.revenue.growth),
                        isPositive: stats.revenue.growth >= 0,
                        label: "vs mês anterior"
                    }}
                    gradient="from-emerald-950/80 to-emerald-900/40"
                    iconBg="from-emerald-500 to-emerald-600"
                />

                {/* Subscriptions Card */}
                <StatCard
                    title="Assinaturas Ativas"
                    value={stats.activeSubscriptions.toString()}
                    subtitle="Clientes com planos ativos"
                    icon={<CreditCard className="w-6 h-6 text-white" />}
                    gradient="from-violet-950/80 to-violet-900/40"
                    iconBg="from-violet-500 to-violet-600"
                />
            </div>

            {/* Recent Transactions Table */}
            <Card className="border-white/10 bg-black/20 backdrop-blur-xl shadow-2xl overflow-hidden">
                <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-orange-500/10">
                            <Receipt className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                            <CardTitle>Transações Recentes</CardTitle>
                            <CardDescription>
                                Histórico detalhado dos últimos pagamentos
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {stats.recentTransactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-white/5 rounded-xl border border-dashed border-white/10 m-4">
                            <Receipt className="w-12 h-12 mb-3 opacity-20" />
                            <p>Nenhuma transação registrada ainda.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-muted-foreground">
                                        <th className="text-left py-4 px-4 font-medium">Data</th>
                                        <th className="text-left py-4 px-4 font-medium">Usuário</th>
                                        <th className="text-left py-4 px-4 font-medium">Plano</th>
                                        <th className="text-right py-4 px-4 font-medium">Valor</th>
                                        <th className="text-center py-4 px-4 font-medium">Status</th>
                                        <th className="text-center py-4 px-4 font-medium">Método</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.recentTransactions.map((tx: any) => (
                                        <tr key={tx._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="py-4 px-4 text-white/80">
                                                {new Date(tx.createdAt).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="py-4 px-4 font-medium text-white">
                                                {tx.userName || tx.userEmail || "—"}
                                            </td>
                                            <td className="py-4 px-4 text-white/70">
                                                <Badge variant="outline" className="border-white/10 bg-white/5">
                                                    {tx.planId}
                                                </Badge>
                                            </td>
                                            <td className="py-4 px-4 text-right font-mono text-emerald-400">
                                                {formatCurrency(tx.amount)}
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <Badge
                                                    variant={null}
                                                    className={cn(
                                                        "uppercase text-[10px] tracking-wider font-bold border-0",
                                                        tx.status === "approved" ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" :
                                                            tx.status === "pending" ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" :
                                                                "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                                    )}
                                                >
                                                    {tx.status === "approved" ? "Aprovado" :
                                                        tx.status === "pending" ? "Pendente" :
                                                            tx.status === "rejected" ? "Rejeitado" : tx.status}
                                                </Badge>
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <span className="text-xs uppercase font-medium text-white/50">
                                                    {tx.paymentMethod}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

