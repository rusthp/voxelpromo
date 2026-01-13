import { useEffect, useState } from "react";
import api from "@/services/api";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    User,
    Activity,
    AlertTriangle,
    Calendar,
    TrendingUp,
    Clock,
    LogIn,
    Shield,
    CheckCircle2
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface UserDetailDrawerProps {
    userId: string | null;
    open: boolean;
    onClose: () => void;
}

interface UserDetails {
    user: any;
    activity: {
        recent: any[];
        errors24h: number;
        errors7d: number;
        lastActive: string;
    };
    usage: {
        postsToday: number;
        postsLimit: number;
        planTier: string;
    };
}

export function UserDetailDrawer({ userId, open, onClose }: UserDetailDrawerProps) {
    const [details, setDetails] = useState<UserDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (open && userId) {
            fetchDetails();
        }
    }, [open, userId]);

    const fetchDetails = async () => {
        if (!userId) return;

        setLoading(true);
        try {
            const response = await api.get(`/admin/users/${userId}/details`);
            setDetails(response.data.data);
        } catch (error) {
            console.error("Failed to fetch user details", error);
            toast({
                variant: "destructive",
                title: "Erro",
                description: "Não foi possível carregar os detalhes do usuário."
            });
        } finally {
            setLoading(false);
        }
    };

    const handleImpersonate = async () => {
        if (!userId) return;

        if (!window.confirm(`Entrar como ${details?.user.username}?`)) {
            return;
        }

        try {
            const response = await api.post(`/admin/impersonate/${userId}`);
            const { accessToken } = response.data;

            if (accessToken) {
                localStorage.setItem('token', accessToken);
                toast({
                    title: "Acesso concedido",
                    description: `Logado como ${details?.user.username}. Redirecionando...`
                });

                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Falha",
                description: "Não foi possível realizar o impersonation."
            });
        }
    };

    if (!details && !loading) {
        return null;
    }

    const usagePercentage = details
        ? (details.usage.postsToday / details.usage.postsLimit) * 100
        : 0;

    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent className="w-[400px] sm:w-[540px] border-l border-white/10 bg-black/40 backdrop-blur-2xl text-white">
                <SheetHeader className="pb-4 border-b border-white/10">
                    <SheetTitle className="flex items-center gap-3 text-white">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <User className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex flex-col items-start gap-0.5">
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                                {details?.user.username || 'Carregando...'}
                            </span>
                            <SheetDescription className="text-white/40 text-xs">
                                {details?.user.email}
                            </SheetDescription>
                        </div>
                    </SheetTitle>
                </SheetHeader>

                {loading ? (
                    <div className="py-20 text-center text-white/30 animate-pulse">
                        Carregando detalhes do usuário...
                    </div>
                ) : details ? (
                    <ScrollArea className="h-[calc(100vh-120px)] pr-4 -mr-4">
                        <div className="space-y-8 mt-6 pr-4">

                            {/* Quick Actions */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">Ações Rápidas</h3>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 bg-white/5 border-white/10 hover:bg-purple-500/20 hover:text-purple-300 hover:border-purple-500/50 transition-all font-medium"
                                        onClick={handleImpersonate}
                                    >
                                        <LogIn className="h-4 w-4 mr-2" />
                                        Entrar como {details.user.username}
                                    </Button>
                                </div>
                            </div>

                            {/* User Info Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Shield className={`h-4 w-4 ${details.user.role === 'admin' ? 'text-purple-400' : 'text-blue-400'}`} />
                                        <span className="text-xs text-white/60">Função</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-lg">{details.user.role === 'admin' ? 'Administrador' : 'Usuário'}</span>
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calendar className="h-4 w-4 text-emerald-400" />
                                        <span className="text-xs text-white/60">Desde</span>
                                    </div>
                                    <div className="font-semibold text-lg">
                                        {new Date(details.user.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>

                            {/* Plan & Usage */}
                            <div className="p-5 rounded-xl bg-gradient-to-br from-white/5 to-transparent border border-white/5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-cyan-400" />
                                        <span className="font-semibold">Plano Atual</span>
                                    </div>
                                    <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 px-3 py-1">
                                        {details.usage.planTier}
                                    </Badge>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-white/60">
                                        <span>Consumo de Posts (Diário)</span>
                                        <span>{usagePercentage.toFixed(0)}% Utilizado</span>
                                    </div>
                                    <Progress
                                        value={usagePercentage}
                                        className="h-2 bg-black/40"
                                        indicatorClassName="bg-gradient-to-r from-cyan-500 to-blue-500"
                                    />
                                    <div className="flex justify-between text-[10px] text-white/40 font-mono">
                                        <span>0</span>
                                        <span>{details.usage.postsToday} / {details.usage.postsLimit}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Health Status */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    Saúde & Erros
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 rounded-lg border border-white/5 bg-red-500/5 hover:bg-red-500/10 transition-colors">
                                        <p className="text-3xl font-bold text-red-500 mb-1">{details.activity.errors24h}</p>
                                        <p className="text-xs text-red-300/60 font-medium uppercase tracking-wide">Erros 24h</p>
                                    </div>
                                    <div className="p-3 rounded-lg border border-white/5 bg-orange-500/5 hover:bg-orange-500/10 transition-colors">
                                        <p className="text-3xl font-bold text-orange-500 mb-1">{details.activity.errors7d}</p>
                                        <p className="text-xs text-orange-300/60 font-medium uppercase tracking-wide">Erros 7 dias</p>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 flex items-center gap-2">
                                        <Activity className="h-4 w-4" />
                                        Atividade Recente
                                    </h3>
                                    <div className="text-[10px] text-white/30 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Último acesso: {details.activity.lastActive ? new Date(details.activity.lastActive).toLocaleString() : 'N/A'}
                                    </div>
                                </div>

                                <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
                                    {details.activity.recent.length === 0 ? (
                                        <div className="p-8 text-center text-sm text-white/30">Nenhuma atividade registrada Recentemente.</div>
                                    ) : (
                                        <div className="divide-y divide-white/5">
                                            {details.activity.recent.map((log: any, idx: number) => (
                                                <div key={idx} className="flex items-center justify-between p-3 hover:bg-white/5 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn("w-1.5 h-1.5 rounded-full", log.status === 'SUCCESS' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]")} />
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium text-white/90">{log.action}</span>
                                                            <span className="text-[10px] text-white/40">{new Date(log.createdAt).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                    <Badge variant="outline" className={cn("text-[10px] border-0",
                                                        log.status === 'SUCCESS' ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                                                    )}>
                                                        {log.status}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </ScrollArea>
                ) : null}
            </SheetContent>
        </Sheet>
    );
}
