import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Package, Share2, Target, RefreshCw, MousePointerClick, BarChart2 } from "lucide-react";
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
    RadialBarChart,
    RadialBar,
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

// Custom tooltip for bar chart
const BarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border border-border bg-background/95 p-3 shadow-xl text-sm backdrop-blur">
            <p className="font-semibold text-foreground mb-2">{label}</p>
            {payload.map((p: any) => (
                <div key={p.name} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.fill || p.color }} />
                    <span className="text-muted-foreground">{p.name}:</span>
                    <span className="font-medium text-foreground">{p.value.toLocaleString("pt-BR")}</span>
                </div>
            ))}
        </div>
    );
};

// Custom center label for donut chart
const DonutCenter = ({ cx, cy, total }: { cx: number; cy: number; total: number }) => (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
        <tspan x={cx} dy="-0.4em" className="fill-foreground" style={{ fontSize: 22, fontWeight: 700, fill: "white" }}>
            {total.toLocaleString("pt-BR")}
        </tspan>
        <tspan x={cx} dy="1.4em" style={{ fontSize: 11, fill: "#888" }}>
            ofertas
        </tspan>
    </text>
);

const Analytics = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [sourceStats, setSourceStats] = useState<SourceStats[]>([]);
    const [clickStats, setClickStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchStats(); }, []);

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

    const pieData = stats ? [
        { name: "Publicadas", value: stats.posted, color: "#22c55e" },
        { name: "Aguardando", value: stats.notPosted, color: "#f59e0b" },
    ] : [];

    // Grouped bar: total + posted per source — sorted by total desc
    const barData = [...sourceStats]
        .sort((a, b) => b.total - a.total)
        .map((s) => ({
            name: s.source.charAt(0).toUpperCase() + s.source.slice(1),
            Total: s.total,
            Publicadas: s.posted,
            color: SOURCE_COLORS[s.source] || "#8884d8",
        }));

    // Clicks by channel radial chart
    const clicksByChannel: { name: string; clicks: number; fill: string }[] =
        (clickStats?.clicksByChannel || []).map((c: any, i: number) => ({
            name: c.channel || c._id || `Canal ${i + 1}`,
            clicks: c.count || c.clicks || 0,
            fill: Object.values(SOURCE_COLORS)[i % Object.values(SOURCE_COLORS).length] as string,
        }));

    const kpiCards = [
        { label: "Total de Ofertas", value: stats?.total || 0, sub: "Coletadas no sistema", icon: Package, color: "text-foreground" },
        { label: "Publicadas", value: stats?.posted || 0, sub: `${postRate}% do total`, icon: Share2, color: "text-green-500" },
        { label: "Aguardando", value: stats?.notPosted || 0, sub: `${pendingRate}% do total`, icon: Target, color: "text-yellow-500" },
        { label: "Desconto Médio", value: `${stats?.avgDiscount?.toFixed(1) || 0}%`, sub: "Todas as ofertas", icon: TrendingUp, color: "text-cyan-400" },
        { label: "Cliques Hoje", value: clickStats?.clicksToday || 0, sub: "Links rastreados", icon: MousePointerClick, color: "text-blue-400" },
    ];

    return (
        <Layout>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <BarChart2 className="w-6 h-6 text-cyan-400" />
                            Analytics
                        </h1>
                        <p className="text-muted-foreground text-sm">Acompanhe o desempenho das suas ofertas</p>
                    </div>
                    <Button onClick={fetchStats} disabled={loading} variant="outline" size="sm" className="gap-2">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                    </div>
                ) : (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {kpiCards.map(({ label, value, sub, icon: Icon, color }) => (
                                <Card key={label} className="hover:border-border/80 transition-colors">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
                                        <Icon className={`h-4 w-4 ${color}`} />
                                    </CardHeader>
                                    <CardContent>
                                        <div className={`text-2xl font-bold ${color}`}>{typeof value === "number" ? value.toLocaleString("pt-BR") : value}</div>
                                        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Grouped Bar Chart — 2/3 width */}
                            <Card className="lg:col-span-2">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">Ofertas por Fonte</CardTitle>
                                    <CardDescription>Total coletado vs publicado por marketplace</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {barData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={280}>
                                            <BarChart data={barData} barGap={4} barCategoryGap="30%">
                                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                                <XAxis
                                                    dataKey="name"
                                                    stroke="#666"
                                                    tick={{ fill: "#aaa", fontSize: 12 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <YAxis
                                                    stroke="#666"
                                                    tick={{ fill: "#aaa", fontSize: 11 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    width={40}
                                                />
                                                <Tooltip content={<BarTooltip />} cursor={{ fill: "#ffffff08" }} />
                                                <Legend
                                                    wrapperStyle={{ fontSize: 12, color: "#aaa", paddingTop: 8 }}
                                                    iconType="circle"
                                                    iconSize={8}
                                                />
                                                <Bar dataKey="Total" name="Total" radius={[4, 4, 0, 0]} maxBarSize={36}>
                                                    {barData.map((entry, i) => (
                                                        <Cell key={i} fill={entry.color} fillOpacity={0.5} />
                                                    ))}
                                                </Bar>
                                                <Bar dataKey="Publicadas" name="Publicadas" radius={[4, 4, 0, 0]} maxBarSize={36}>
                                                    {barData.map((entry, i) => (
                                                        <Cell key={i} fill={entry.color} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                                            Nenhuma oferta coletada ainda
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Donut Chart — 1/3 width */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">Status de Publicação</CardTitle>
                                    <CardDescription>Publicadas vs aguardando</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {stats && stats.total > 0 ? (
                                        <ResponsiveContainer width="100%" height={280}>
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    cx="50%"
                                                    cy="45%"
                                                    innerRadius={70}
                                                    outerRadius={100}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                    strokeWidth={0}
                                                >
                                                    {pieData.map((entry, i) => (
                                                        <Cell key={i} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <DonutCenter cx={150} cy={126} total={stats.total} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }}
                                                    formatter={(value: number) => [value.toLocaleString("pt-BR"), ""]}
                                                />
                                                <Legend
                                                    iconType="circle"
                                                    iconSize={8}
                                                    wrapperStyle={{ fontSize: 12, color: "#aaa" }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                                            Nenhuma oferta ainda
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Clicks by Channel */}
                        {clicksByChannel.length > 0 && (
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">Cliques por Canal</CardTitle>
                                    <CardDescription>Distribuição de cliques nos links de afiliado</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <RadialBarChart
                                            innerRadius="20%"
                                            outerRadius="90%"
                                            data={clicksByChannel}
                                            startAngle={180}
                                            endAngle={0}
                                        >
                                            <RadialBar dataKey="clicks" cornerRadius={4} label={{ position: "insideStart", fill: "#fff", fontSize: 11 }} />
                                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#aaa" }} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }}
                                            />
                                        </RadialBarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        )}

                        {/* Source Details Table */}
                        {sourceStats.length > 0 && (
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">Detalhes por Fonte</CardTitle>
                                    <CardDescription>Estatísticas detalhadas de cada marketplace</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-border">
                                                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Fonte</th>
                                                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Total</th>
                                                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Publicadas</th>
                                                    <th className="py-3 px-4 text-muted-foreground font-medium">Taxa de Publicação</th>
                                                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Desc. Médio</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {[...sourceStats]
                                                    .sort((a, b) => b.total - a.total)
                                                    .map((source) => (
                                                        <tr key={source.source} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                                                            <td className="py-3 px-4">
                                                                <div className="flex items-center gap-2">
                                                                    <div
                                                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                                        style={{ backgroundColor: SOURCE_COLORS[source.source] || "#888" }}
                                                                    />
                                                                    <span className="font-medium">
                                                                        {source.source.charAt(0).toUpperCase() + source.source.slice(1)}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="text-right py-3 px-4 tabular-nums">
                                                                {source.total.toLocaleString("pt-BR")}
                                                            </td>
                                                            <td className="text-right py-3 px-4 text-green-500 tabular-nums">
                                                                {source.posted.toLocaleString("pt-BR")}
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex-1 bg-muted rounded-full h-1.5 min-w-[80px]">
                                                                        <div
                                                                            className="h-1.5 rounded-full transition-all"
                                                                            style={{
                                                                                width: `${Math.min(source.postingRate, 100)}%`,
                                                                                backgroundColor: SOURCE_COLORS[source.source] || "#888",
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
                                                                        {source.postingRate}%
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="text-right py-3 px-4 text-cyan-400 tabular-nums">
                                                                {source.avgDiscount}%
                                                            </td>
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
