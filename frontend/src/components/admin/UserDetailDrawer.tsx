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
    LogIn
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

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
            <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {details?.user.username || 'Carregando...'}
                    </SheetTitle>
                    <SheetDescription>
                        {details?.user.email}
                    </SheetDescription>
                </SheetHeader>

                {loading ? (
                    <div className="py-8 text-center text-muted-foreground">Carregando...</div>
                ) : details ? (
                    <ScrollArea className="h-[calc(100vh-120px)] pr-4">
                        <div className="space-y-6 mt-6">

                            {/* Quick Actions */}
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold">Ações Rápidas</h3>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={handleImpersonate}
                                    >
                                        <LogIn className="h-4 w-4 mr-2" />
                                        Entrar como Usuário
                                    </Button>
                                </div>
                            </div>

                            <Separator />

                            {/* User Info */}
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold">Informações</h3>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Conta criada:</span>
                                        <p className="font-medium">{new Date(details.user.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Última atividade:</span>
                                        <p className="font-medium flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {details.activity.lastActive
                                                ? new Date(details.activity.lastActive).toLocaleString()
                                                : 'Nunca'}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Plano:</span>
                                        <p className="font-medium">
                                            <Badge variant="outline">{details.usage.planTier}</Badge>
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Função:</span>
                                        <p className="font-medium">
                                            <Badge variant={details.user.role === 'admin' ? 'default' : 'secondary'}>
                                                {details.user.role}
                                            </Badge>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Usage Stats */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4" />
                                    Uso
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Posts hoje</span>
                                        <span className="font-medium">{details.usage.postsToday} / {details.usage.postsLimit}</span>
                                    </div>
                                    <Progress value={usagePercentage} className="h-2" />
                                </div>
                            </div>

                            <Separator />

                            {/* Health Status */}
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    Saúde
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-3 border rounded-lg">
                                        <p className="text-2xl font-bold text-red-500">{details.activity.errors24h}</p>
                                        <p className="text-xs text-muted-foreground">Erros (24h)</p>
                                    </div>
                                    <div className="p-3 border rounded-lg">
                                        <p className="text-2xl font-bold text-orange-500">{details.activity.errors7d}</p>
                                        <p className="text-xs text-muted-foreground">Erros (7d)</p>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Recent Activity */}
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <Activity className="h-4 w-4" />
                                    Atividade Recente
                                </h3>
                                {details.activity.recent.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {details.activity.recent.map((log: any, idx: number) => (
                                            <div key={idx} className="flex items-start gap-2 p-2 rounded-lg border text-sm">
                                                <div className="flex-1">
                                                    <p className="font-medium font-mono text-xs">{log.action}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(log.createdAt).toLocaleString()}
                                                    </p>
                                                </div>
                                                <Badge variant={log.status === 'SUCCESS' ? 'outline' : 'destructive'} className="text-xs">
                                                    {log.status}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>
                    </ScrollArea>
                ) : null}
            </SheetContent>
        </Sheet>
    );
}
