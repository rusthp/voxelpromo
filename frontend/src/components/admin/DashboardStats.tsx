
import { useEffect, useState } from "react";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertTriangle, Users, Database, ShoppingBag } from "lucide-react";

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

export function DashboardStats() {
    const [stats, setStats] = useState<HealthStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/admin/health-stats');
                setStats(response.data.data);
            } catch (error) {
                console.error("Failed to fetch health stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
        // Refresh every 30s
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading || !stats) {
        return <div className="p-4 text-center text-muted-foreground">Carregando métricas...</div>;
    }

    const getHealthColor = (status: string) => {
        switch (status) {
            case 'HEALTHY': return 'text-green-500';
            case 'WARNING': return 'text-yellow-500';
            case 'CRITICAL': return 'text-red-500';
            default: return 'text-gray-500';
        }
    };

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* System Health Card */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Saúde do Sistema</CardTitle>
                    <Activity className={`h-4 w-4 ${getHealthColor(stats.health.status)}`} />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.health.status}</div>
                    <p className="text-xs text-muted-foreground">
                        {stats.health.errorRate24h} erros nas últimas 24h
                    </p>
                </CardContent>
            </Card>

            {/* Users Card */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Usuários Totais</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.users.total}</div>
                    <p className="text-xs text-muted-foreground">
                        +{stats.users.new24h} novos hoje
                    </p>
                </CardContent>
            </Card>

            {/* Active Offers Card */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ofertas Ativas</CardTitle>
                    <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.offers.active}</div>
                    <p className="text-xs text-muted-foreground">
                        {stats.offers.total} total processadas
                    </p>
                </CardContent>
            </Card>

            {/* System Load Card */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Uso de Memória</CardTitle>
                    <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.system.memoryUsedMB} MB</div>
                    <p className="text-xs text-muted-foreground">
                        Uptime: {Math.floor(stats.system.uptime / 3600)}h
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
