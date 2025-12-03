'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface PostHistory {
    _id: string;
    offerId: {
        _id: string;
        title: string;
        imageUrl: string;
        productUrl: string;
        source: string;
        discountPercentage: number;
        currentPrice: number;
    };
    platform: 'telegram' | 'x' | 'whatsapp';
    postedAt: string;
    postContent: string;
    status: 'success' | 'failed';
    error?: string;
}

interface PostStats {
    total: number;
    success: number;
    failed: number;
    successRate: string;
    byPlatform: Array<{
        _id: string;
        total: number;
        success: number;
        failed: number;
    }>;
}

export default function HistoryPage() {
    const [posts, setPosts] = useState<PostHistory[]>([]);
    const [stats, setStats] = useState<PostStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<{
        platform?: string;
        status?: string;
    }>({});

    useEffect(() => {
        fetchHistory();
        fetchStats();
    }, [filter]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filter.platform) params.append('platform', filter.platform);
            if (filter.status) params.append('status', filter.status);

            const response = await api.get(`/posts/history?${params.toString()}`);
            setPosts(response.data.posts);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await api.get('/posts/history/stats');
            setStats(response.data.stats);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const getPlatformIcon = (platform: string) => {
        switch (platform) {
            case 'telegram':
                return '📱';
            case 'x':
                return '𝕏';
            case 'whatsapp':
                return '💬';
            default:
                return '📨';
        }
    };

    const getPlatformColor = (platform: string) => {
        switch (platform) {
            case 'telegram':
                return 'bg-blue-500';
            case 'x':
                return 'bg-gray-900';
            case 'whatsapp':
                return 'bg-green-500';
            default:
                return 'bg-gray-500';
        }
    };

    if (loading && posts.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
                <div className="flex items-center justify-center h-96">
                    <div className="text-white text-xl">Carregando histórico...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-white mb-4">📜 Histórico de Posts</h1>
                    <p className="text-gray-400">Rastreamento completo de todas as postagens nas redes sociais</p>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-gradient-to-br from-blue-600 to-blue-400 rounded-2xl p-6">
                            <div className="text-4xl mb-2">📊</div>
                            <div className="text-white/80 text-sm font-medium mb-1">Total</div>
                            <div className="text-white text-3xl font-bold">{stats.total}</div>
                        </div>
                        <div className="bg-gradient-to-br from-green-600 to-green-400 rounded-2xl p-6">
                            <div className="text-4xl mb-2">✅</div>
                            <div className="text-white/80 text-sm font-medium mb-1">Sucesso</div>
                            <div className="text-white text-3xl font-bold">{stats.success}</div>
                        </div>
                        <div className="bg-gradient-to-br from-red-600 to-red-400 rounded-2xl p-6">
                            <div className="text-4xl mb-2">❌</div>
                            <div className="text-white/80 text-sm font-medium mb-1">Falhas</div>
                            <div className="text-white text-3xl font-bold">{stats.failed}</div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-600 to-purple-400 rounded-2xl p-6">
                            <div className="text-4xl mb-2">📈</div>
                            <div className="text-white/80 text-sm font-medium mb-1">Taxa de Sucesso</div>
                            <div className="text-white text-3xl font-bold">{stats.successRate}%</div>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="bg-gray-800 rounded-2xl p-6 mb-8">
                    <h2 className="text-white text-xl font-bold mb-4">Filtros</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Plataforma</label>
                            <select
                                value={filter.platform || ''}
                                onChange={(e) => setFilter({ ...filter, platform: e.target.value || undefined })}
                                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Todas</option>
                                <option value="telegram">Telegram</option>
                                <option value="x">X (Twitter)</option>
                                <option value="whatsapp">WhatsApp</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Status</label>
                            <select
                                value={filter.status || ''}
                                onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
                                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Todos</option>
                                <option value="success">Sucesso</option>
                                <option value="failed">Falha</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={() => setFilter({})}
                                className="w-full bg-gray-700 hover:bg-gray-600 text-white rounded-lg px-4 py-2 transition-colors"
                            >
                                Limpar Filtros
                            </button>
                        </div>
                    </div>
                </div>

                {/* Posts List */}
                <div className="bg-gray-800 rounded-2xl p-6">
                    <h2 className="text-white text-xl font-bold mb-6">Posts Recentes</h2>
                    {posts.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">📭</div>
                            <div className="text-gray-400 text-lg">Nenhum post encontrado</div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {posts.map((post) => (
                                <div
                                    key={post._id}
                                    className="bg-gray-700/50 rounded-xl p-4 hover:bg-gray-700 transition-colors"
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Offer Image */}
                                        <img
                                            src={post.offerId.imageUrl}
                                            alt={post.offerId.title}
                                            className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                                        />

                                        {/* Post Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4 mb-2">
                                                <h3 className="text-white font-medium truncate">{post.offerId.title}</h3>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <span
                                                        className={`${getPlatformColor(post.platform)} text-white text-xs px-3 py-1 rounded-full flex items-center gap-1`}
                                                    >
                                                        {getPlatformIcon(post.platform)} {post.platform}
                                                    </span>
                                                    <span
                                                        className={`${post.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                                                            } text-white text-xs px-3 py-1 rounded-full`}
                                                    >
                                                        {post.status === 'success' ? '✓ Sucesso' : '✗ Falha'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="text-sm text-gray-400 mb-3">
                                                <span className="mr-4">
                                                    📅 {new Date(post.postedAt).toLocaleString('pt-BR')}
                                                </span>
                                                <span className="mr-4 capitalize">🏷️ {post.offerId.source}</span>
                                                <span>💰 R$ {post.offerId.currentPrice.toFixed(2)}</span>
                                            </div>

                                            {/* Post Content Preview */}
                                            <div className="bg-gray-800 rounded-lg p-3 mb-2">
                                                <p className="text-gray-300 text-sm line-clamp-3">{post.postContent}</p>
                                            </div>

                                            {/* Error Message */}
                                            {post.error && (
                                                <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
                                                    <p className="text-red-400 text-sm">⚠️ Erro: {post.error}</p>
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div className="flex gap-2 mt-3">
                                                <a
                                                    href={post.offerId.productUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-400 hover:text-blue-300 text-sm"
                                                >
                                                    🔗 Ver Produto
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
