import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Package, Share2, Target } from "lucide-react";
import api from "@/services/api";

interface Stats {
    total: number;
    posted: number;
    notPosted: number;
    avgDiscount: number;
}

const Analytics = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await api.get('/stats');
            setStats(response.data);
        } catch (error) {
            console.error("Error fetching analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    const postRate = stats ? Math.round((stats.posted / stats.total) * 100) || 0 : 0;
    const pendingRate = stats ? Math.round((stats.notPosted / stats.total) * 100) || 0 : 0;

    return (
        <Layout>
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
                        <p className="text-muted-foreground">Acompanhe o desempenho das suas ofertas</p>
                    </div>
                    <button
                        onClick={fetchStats}
                        className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                    >
                        Atualizar
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <>
                        {/* Overview Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total de Ofertas</CardTitle>
                                    <Package className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats?.total || 0}</div>
                                    <p className="text-xs text-muted-foreground">Coletadas no sistema</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Publicadas</CardTitle>
                                    <Share2 className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats?.posted || 0}</div>
                                    <p className="text-xs text-muted-foreground">
                                        {postRate}% do total
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Aguardando</CardTitle>
                                    <Target className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats?.notPosted || 0}</div>
                                    <p className="text-xs text-muted-foreground">
                                        {pendingRate}% do total
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Desconto Médio</CardTitle>
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats?.avgDiscount.toFixed(1) || 0}%</div>
                                    <p className="text-xs text-muted-foreground">Todas as ofertas</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Performance Metrics */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Taxa de Publicação</CardTitle>
                                    <CardDescription>
                                        Percentual de ofertas publicadas vs. pendentes
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium">Publicadas</span>
                                                <span className="text-sm text-muted-foreground">{postRate}%</span>
                                            </div>
                                            <div className="w-full bg-secondary rounded-full h-2">
                                                <div
                                                    className="bg-success h-2 rounded-full transition-all duration-500"
                                                    style={{ width: `${postRate}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium">Aguardando</span>
                                                <span className="text-sm text-muted-foreground">{pendingRate}%</span>
                                            </div>
                                            <div className="w-full bg-secondary rounded-full h-2">
                                                <div
                                                    className="bg-warning h-2 rounded-full transition-all duration-500"
                                                    style={{ width: `${pendingRate}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Resumo Geral</CardTitle>
                                    <CardDescription>
                                        Visão geral do desempenho do sistema
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Total de Ofertas</span>
                                            <span className="text-sm font-bold">{stats?.total || 0}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Ofertas Publicadas</span>
                                            <span className="text-sm font-bold text-success">{stats?.posted || 0}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Ofertas Pendentes</span>
                                            <span className="text-sm font-bold text-warning">{stats?.notPosted || 0}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Desconto Médio</span>
                                            <span className="text-sm font-bold text-primary">{stats?.avgDiscount.toFixed(1) || 0}%</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Placeholder for Future Charts */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Ofertas ao Longo do Tempo</CardTitle>
                                <CardDescription>
                                    Gráfico de ofertas coletadas (em breve)
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-center h-64 text-muted-foreground">
                                    <div className="text-center">
                                        <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>Gráficos detalhados serão adicionados em breve</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </Layout>
    );
};

export default Analytics;
