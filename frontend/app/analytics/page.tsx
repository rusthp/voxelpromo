'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Analytics {
    dateRange: {
        start: Date;
        end: Date;
        days: number;
    };
    offersBySource: Array<{
        source: string;
        count: number;
        avgDiscount: number;
        totalRevenue: number;
    }>;
    offersByCategory: Array<{
        category: string;
        count: number;
        avgDiscount: number;
    }>;
    offersByDay: Array<{
        date: string;
        count: number;
        avgDiscount: number;
    }>;
    topOffers: any[];
    postingStats: {
        totalOffers: number;
        postedOffers: number;
        scheduledOffers: number;
    };
    conversionRate: number;
}

export default function AnalyticsPage() {
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);

    useEffect(() => {
        fetchAnalytics();
    }, [days]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/stats/analytics?days=${days}`);
            setAnalytics(response.data.analytics);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
                <div className="flex items-center justify-center h-96">
                    <div className="text-white text-xl">Carregando analytics...</div>
                </div>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
                <div className="flex items-center justify-center h-96">
                    <div className="text-red-400 text-xl">Erro ao carregar analytics</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-white mb-4">📊 Analytics Dashboard</h1>
                    <p className="text-gray-400">Análise detalhada de ofertas e desempenho</p>
                </div>

                {/* Period Selector */}
                <div className="mb-8 flex gap-4">
                    {[7, 15, 30, 60, 90].map((d) => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={`px-6 py-2 rounded-lg font-medium transition-all ${days === d
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50'
                                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                        >
                            {d} dias
                        </button>
                    ))}
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Total de Ofertas"
                        value={analytics.postingStats.totalOffers.toLocaleString()}
                        icon="📦"
                        gradient="from-blue-600 to-blue-400"
                    />
                    <StatCard
                        title="Ofertas Postadas"
                        value={analytics.postingStats.postedOffers.toLocaleString()}
                        icon="✅"
                        gradient="from-green-600 to-green-400"
                    />
                    <StatCard
                        title="Taxa de Conversão"
                        value={`${analytics.conversionRate}%`}
                        icon="📈"
                        gradient="from-purple-600 to-purple-400"
                    />
                    <StatCard
                        title="Agendadas"
                        value={analytics.postingStats.scheduledOffers.toLocaleString()}
                        icon="⏰"
                        gradient="from-orange-600 to-orange-400"
                    />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Offers by Source */}
                    <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
                        <h2 className="text-2xl font-bold text-white mb-6">Ofertas por Fonte</h2>
                        <div className="space-y-4">
                            {analytics.offersBySource.map((source, index) => (
                                <div key={index} className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-2">
                                            <span className="text-gray-300 font-medium capitalize">{source.source}</span>
                                            <span className="text-white font-bold">{source.count}</span>
                                        </div>
                                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                                                style={{
                                                    width: `${(source.count / Math.max(...analytics.offersBySource.map((s) => s.count))) * 100}%`,
                                                }}
                                            />
                                        </div>
                                        <div className="mt-1 text-sm text-gray-400">
                                            Desconto médio: {source.avgDiscount}%
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Categories */}
                    <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
                        <h2 className="text-2xl font-bold text-white mb-6">Top Categorias</h2>
                        <div className="space-y-4">
                            {analytics.offersByCategory.slice(0, 5).map((category, index) => (
                                <div key={index} className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-2">
                                            <span className="text-gray-300 font-medium">{category.category}</span>
                                            <span className="text-white font-bold">{category.count}</span>
                                        </div>
                                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                                                style={{
                                                    width: `${(category.count / Math.max(...analytics.offersByCategory.map((c) => c.count))) * 100}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Time Series Chart */}
                <div className="bg-gray-800 rounded-2xl p-6 shadow-xl mb-8">
                    <h2 className="text-2xl font-bold text-white mb-6">Ofertas ao Longo do Tempo</h2>
                    <div className="relative h-64">
                        <svg width="100%" height="100%" className="overflow-visible">
                            {analytics.offersByDay.map((day, index) => {
                                const x = (index / (analytics.offersByDay.length - 1)) * 100;
                                const maxCount = Math.max(...analytics.offersByDay.map((d) => d.count));
                                const y = 100 - (day.count / maxCount) * 80;

                                return (
                                    <g key={index}>
                                        <circle cx={`${x}%`} cy={`${y}%`} r="4" fill="#3b82f6" className="hover:r-6 transition-all" />
                                        {index > 0 && (
                                            <line
                                                x1={`${((index - 1) / (analytics.offersByDay.length - 1)) * 100}%`}
                                                y1={`${100 - (analytics.offersByDay[index - 1].count / maxCount) * 80}%`}
                                                x2={`${x}%`}
                                                y2={`${y}%`}
                                                stroke="#3b82f6"
                                                strokeWidth="2"
                                            />
                                        )}
                                    </g>
                                );
                            })}
                        </svg>
                    </div>
                    <div className="flex justify-between text-sm text-gray-400 mt-4">
                        <span>{analytics.offersByDay[0]?.date}</span>
                        <span>{analytics.offersByDay[analytics.offersByDay.length - 1]?.date}</span>
                    </div>
                </div>

                {/* Top Offers Table */}
                <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
                    <h2 className="text-2xl font-bold text-white mb-6">🔥 Top 10 Ofertas (Desconto)</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-700">
                                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Produto</th>
                                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Fonte</th>
                                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Desconto</th>
                                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Preço</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analytics.topOffers.map((offer, index) => (
                                    <tr key={index} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <img src={offer.imageUrl} alt={offer.title} className="w-12 h-12 rounded object-cover" />
                                                <div>
                                                    <div className="text-white font-medium truncate max-w-md">{offer.title}</div>
                                                    <div className="text-xs text-gray-400">{new Date(offer.createdAt).toLocaleDateString()}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-sm capitalize">
                                                {offer.source}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <span className="text-green-400 font-bold">{offer.discountPercentage.toFixed(0)}%</span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="text-white font-bold">R$ {offer.currentPrice.toFixed(2)}</div>
                                            <div className="text-xs text-gray-400 line-through">R$ {offer.originalPrice.toFixed(2)}</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({
    title,
    value,
    icon,
    gradient,
}: {
    title: string;
    value: string;
    icon: string;
    gradient: string;
}) {
    return (
        <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-6 shadow-xl`}>
            <div className="text-4xl mb-2">{icon}</div>
            <div className="text-white/80 text-sm font-medium mb-1">{title}</div>
            <div className="text-white text-3xl font-bold">{value}</div>
        </div>
    );
}
