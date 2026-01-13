import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Package, Share2, Target, RefreshCw, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/services/api";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from "recharts";

interface Stats {
    total: number;
    posted: number;
    notPosted: number;
    avgDiscount: number;
    bySource?: { _id: string; count: number }[];
}

interface SourceStats {
    source: string;
    total: number;
    posted: number;
    avgDiscount: number;
    postingRate: number;
}

// Cores para cada fonte
const SOURCE_COLORS: Record<string, string> = {
    amazon: "#FF9900",
    aliexpress: "#E62E04",
    shopee: "#EE4D2D",
    mercadolivre: "#FFE600",
    awin: "#2E7D32",
    lomadee: "#1976D2",
    afilio: "#9C27B0",
    rakuten: "#BF0000",
    rss: "#607D8B",
    manual: "#757575",
};

const Analytics = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [sourceStats, setSourceStats] = useState<SourceStats[]>([]);
    const [clickStats, setClickStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const [statsRes, sourcesRes, clicksRes] = await Promise.all([
                api.get('/stats'),
                api.get('/stats/sources').catch(() => ({ data: { sources: [] } })),
                api.get('/stats/clicks').catch(() => ({ data: { clicksToday: 0, clicksByChannel: [] } })),
            ]);

            setStats(statsRes.data);
            setSourceStats(sourcesRes.data.sources || []);
            setClickStats(clicksRes.data);
        } catch (error) {
            console.error("Error fetching analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    const postRate = stats ? Math.round((stats.posted / stats.total) * 100) || 0 : 0;
    const pendingRate = stats ? Math.round((stats.notPosted / stats.total) * 100) || 0 : 0;

    // Dados para gráfico de pizza (status de publicação)
    const pieData = stats ? [
        { name: "Publicadas", value: stats.posted, color: "#22c55e" },
        { name: "Aguardando", value: stats.notPosted, color: "#f59e0b" },
    ] : [];

    // Dados para gráfico de barras (por fonte)
    const barData = sourceStats.map((s) => ({
        name: s.source.charAt(0).toUpperCase() + s.source.slice(1),
        total: s.total,
        posted: s.posted,
        fill: SOURCE_COLORS[s.source] || "#8884d8",
    }));

    return (
        <Layout>
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
                        <p className="text-muted-foreground">Acompanhe o desempenho das suas ofertas</p>
                    </div>
                    <Button onClick={fetchStats} disabled={loading} variant="outline" className="gap-2">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <>
                        {/* Overview Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                                    <div className="text-2xl font-bold text-green-500">{stats?.posted || 0}</div>
                                    <p className="text-xs text-muted-foreground">{postRate}% do total</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Aguardando</CardTitle>
                                    <Target className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-yellow-500">{stats?.notPosted || 0}</div>
                                    <p className="text-xs text-muted-foreground">{pendingRate}% do total</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Desconto Médio</CardTitle>
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-primary">{stats?.avgDiscount?.toFixed(1) || 0}%</div>
                                    <p className="text-xs text-muted-foreground">Todas as ofertas</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Cliques Hoje</CardTitle>
                                    <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-blue-500">{clickStats?.clicksToday || 0}</div>
                                    <p className="text-xs text-muted-foreground">Links rastreados</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Ofertas por Fonte - Bar Chart */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Ofertas por Fonte</CardTitle>
                                    <CardDescription>Distribuição de ofertas coletadas por marketplace</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {barData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={barData} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                                <XAxis type="number" stroke="#888" />
                                                <YAxis dataKey="name" type="category" width={100} stroke="#888" />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                                                    labelStyle={{ color: "#fff" }}
                                                />
                                                <Bar dataKey="total" name="Total" radius={[0, 4, 4, 0]}>
                                                    {barData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-64 text-muted-foreground">
                                            Nenhuma oferta coletada ainda
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Status de Publicação - Pie Chart */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Status de Publicação</CardTitle>
                                    <CardDescription>Proporção de ofertas publicadas vs pendentes</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {stats && stats.total > 0 ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                    labelLine={false}
                                                >
                                                    {pieData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                                                />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-64 text-muted-foreground">
                                            Nenhuma oferta coletada ainda
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Source Details Table */}
                        {sourceStats.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Detalhes por Fonte</CardTitle>
                                    <CardDescription>Estatísticas detalhadas de cada marketplace</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-border">
                                                    <th className="text-left py-3 px-4">Fonte</th>
                                                    <th className="text-right py-3 px-4">Total</th>
                                                    <th className="text-right py-3 px-4">Publicadas</th>
                                                    <th className="text-right py-3 px-4">Taxa</th>
                                                    <th className="text-right py-3 px-4">Desc. Médio</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sourceStats.map((source) => (
                                                    <tr key={source.source} className="border-b border-border/50 hover:bg-muted/50">
                                                        <td className="py-3 px-4 flex items-center gap-2">
                                                            <div
                                                                className="w-3 h-3 rounded-full"
                                                                style={{ backgroundColor: SOURCE_COLORS[source.source] || "#888" }}
                                                            />
                                                            {source.source.charAt(0).toUpperCase() + source.source.slice(1)}
                                                        </td>
                                                        <td className="text-right py-3 px-4">{source.total}</td>
                                                        <td className="text-right py-3 px-4 text-green-500">{source.posted}</td>
                                                        <td className="text-right py-3 px-4">{source.postingRate}%</td>
                                                        <td className="text-right py-3 px-4 text-primary">{source.avgDiscount}%</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
};

export default Analytics;
