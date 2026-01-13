import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Search, Database, CheckCircle2, AlertTriangle, RefreshCcw, Server } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface VectorizerHealth {
    status: string;
    collections: string[];
    timestamp: string;
    error?: string;
}

interface SearchResult {
    doc_id: string;
    score: number;
    content: string;
    metadata: any;
}

export function VectorizerManage() {
    const [loading, setLoading] = useState(true);
    const [health, setHealth] = useState<VectorizerHealth | null>(null);
    const [msg, setMsg] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
    const [searching, setSearching] = useState(false);
    const [selectedCollection, setSelectedCollection] = useState("voxelpromo-offers");
    const { toast } = useToast();

    useEffect(() => {
        checkHealth();
    }, []);

    const checkHealth = async () => {
        setLoading(true);
        try {
            const response = await api.get("/admin/vectorizer/health");
            if (response.data.success) {
                setHealth(response.data.data);
            }
        } catch (error) {
            console.error("Error checking vectorizer:", error);
            setHealth({ status: "ERROR", collections: [], timestamp: new Date().toISOString() });
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setSearching(true);
        try {
            const response = await api.post("/admin/vectorizer/search", {
                query: searchQuery,
                collection: selectedCollection,
                limit: 5
            });

            if (response.data.success) {
                setSearchResults(response.data.data || []);
            } else {
                setSearchResults([]);
            }
        } catch (error) {
            console.error("Search error:", error);
            toast({
                title: "Search Failed",
                description: "Could not retrieve vector results.",
                variant: "destructive"
            });
        } finally {
            setSearching(false);
        }
    };

    if (loading && !health) {
        return (
            <div className="flex items-center justify-center py-20 text-white/30 animate-pulse">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* Health Status Card */}
            <Card className="rounded-xl border border-white/10 bg-black/20 backdrop-blur-xl overflow-hidden">
                <CardHeader className="bg-white/5 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30">
                                <Server className="h-5 w-5 text-indigo-400" />
                            </div>
                            <div>
                                <CardTitle className="text-lg text-white">Vectorizer Status</CardTitle>
                                <CardDescription className="text-white/50">HiveLLM Vectorizer Service</CardDescription>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={checkHealth}
                            className={cn(
                                "bg-white/5 border-white/10 hover:bg-white/10 hover:text-white transition-all",
                                loading && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <RefreshCcw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                            Check Status
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                        <span className="text-xs font-medium text-white/40 uppercase tracking-wider">Status</span>
                        <div className="flex items-center gap-2">
                            {health?.status === 'ONLINE' ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            ) : (
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                            )}
                            <span className={cn(
                                "text-lg font-semibold",
                                health?.status === 'ONLINE' ? "text-emerald-400" : "text-red-400"
                            )}>
                                {health?.status || 'UNKNOWN'}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <span className="text-xs font-medium text-white/40 uppercase tracking-wider">Collections</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {health?.collections && health.collections.length > 0 ? (
                                health.collections.map(c => (
                                    <Badge key={c} variant="outline" className="bg-white/5 border-white/10 text-white/70">
                                        {c}
                                    </Badge>
                                ))
                            ) : (
                                <span className="text-white/50 text-sm">No collections found</span>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <span className="text-xs font-medium text-white/40 uppercase tracking-wider">Last Check</span>
                        <div className="text-sm text-white/80 font-mono mt-1">
                            {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : '-'}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Semantic Search Playground */}
            <Card className="rounded-xl border border-white/10 bg-black/20 backdrop-blur-xl overflow-hidden">
                <CardHeader className="bg-white/5 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-pink-500/20 border border-pink-500/30">
                            <Search className="h-5 w-5 text-pink-400" />
                        </div>
                        <div>
                            <CardTitle className="text-lg text-white">Semantic Search Playground</CardTitle>
                            <CardDescription className="text-white/50">Test vector embeddings and relevance scoring</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    <div className="flex gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                            <Input
                                placeholder="Enter query (e.g. 'smartphone with good camera')"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="pl-10 bg-black/40 border-white/10 text-white focus:border-pink-500/50 h-10"
                            />
                        </div>
                        <Button
                            onClick={handleSearch}
                            disabled={searching || !health || health.status !== 'ONLINE'}
                            className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0"
                        >
                            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                        </Button>
                    </div>

                    {/* Search Results */}
                    {searchResults && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Separator className="bg-white/10" />
                            <h3 className="text-sm font-medium text-white/60">
                                Results ({searchResults.length})
                            </h3>

                            {searchResults.length === 0 ? (
                                <div className="text-center py-8 text-white/30 italic">
                                    No relevant vectors found for this query.
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {searchResults.map((result, idx) => (
                                        <div key={idx} className="p-4 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <Badge variant="secondary" className="bg-pink-500/10 text-pink-300 hover:bg-pink-500/20 border-0">
                                                    Score: {(result.score * 100).toFixed(1)}%
                                                </Badge>
                                                <span className="text-xs text-white/30 font-mono">ID: {result.doc_id}</span>
                                            </div>
                                            <p className="text-white/80 text-sm leading-relaxed whitespace-pre-line mb-3">
                                                {result.content.substring(0, 200)}...
                                            </p>

                                            {result.metadata && (
                                                <div className="flex flex-wrap gap-2">
                                                    {Object.entries(result.metadata).map(([k, v]) => (
                                                        <span key={k} className="text-[10px] px-2 py-1 rounded bg-black/40 text-white/40 border border-white/5">
                                                            {k}: <span className="text-white/60">{String(v)}</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
    );
}
