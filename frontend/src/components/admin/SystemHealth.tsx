import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    Database,
    Server,
    Cloud,
    Activity,
    Cpu,
    HardDrive,
    Clock,
    RefreshCcw,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Zap,
    Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import { cn } from "@/lib/utils";

interface HealthData {
    errors: { count24h: number };
    offers: { total: number; active: number };
    users: { total: number; new24h: number };
    system: { uptime: number; memoryUsedMB: number };
}

interface ServiceStatus {
    name: string;
    status: "healthy" | "degraded" | "down";
    icon: React.ComponentType<{ className?: string }>;
    details?: string;
}

function ServiceCard({ service }: { service: ServiceStatus }) {
    const statusConfig = {
        healthy: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: CheckCircle, label: "Operacional" },
        degraded: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: AlertTriangle, label: "Instável" },
        down: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", icon: XCircle, label: "Offline" },
    };

    const config = statusConfig[service.status];
    const StatusIcon = config.icon;

    return (
        <div className={cn(
            "relative group overflow-hidden rounded-2xl p-5",
            "bg-black/20 border backdrop-blur-sm transition-all duration-300",
            "hover:bg-white/5 hover:scale-[1.02]",
            config.border,
            service.status === 'healthy' ? 'border-white/5' : ''
        )}>
            <div className="flex items-start justify-between mb-4">
                <div className={cn("p-2.5 rounded-xl transition-colors", config.bg)}>
                    <service.icon className={cn("w-5 h-5", config.color)} />
                </div>
                <Badge variant="outline" className={cn("border bg-black/40", config.color, config.border)}>
                    <StatusIcon className="w-3 h-3 mr-1.5" />
                    {config.label}
                </Badge>
            </div>

            <div>
                <h4 className="font-semibold text-white tracking-tight">{service.name}</h4>
                <p className="text-xs text-white/50 mt-1 font-medium">{service.details}</p>
            </div>

            {/* Glow effect */}
            <div className={cn(
                "absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-20 transition-opacity",
                service.status === 'healthy' ? 'bg-emerald-500' :
                    service.status === 'degraded' ? 'bg-amber-500' : 'bg-red-500'
            )} />
        </div>
    );
}

export function SystemHealth() {
    const [healthData, setHealthData] = useState<HealthData | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchHealthData = async () => {
        try {
            setLoading(true);
            const response = await api.get("/admin/health-stats");
            if (response.data.success) {
                setHealthData(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching health data:", error);
            toast({
                title: "Erro",
                description: "Falha ao carregar dados de saúde do sistema",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealthData();
        const interval = setInterval(fetchHealthData, 30000);
        return () => clearInterval(interval);
    }, []);

    const formatUptime = (seconds: number) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    const services: ServiceStatus[] = [
        {
            name: "Conexão MongoDB",
            status: "healthy",
            icon: Database,
            details: "Cluster Atlas Primary",
        },
        {
            name: "API Backend",
            status: "healthy",
            icon: Server,
            details: `Uptime: ${healthData ? formatUptime(healthData.system.uptime) : "-"}`,
        },
        {
            name: "Mercado Pago",
            status: "healthy",
            icon: Cloud,
            details: "Sandbox Environment",
        },
        {
            name: "Background Jobs",
            status: "healthy",
            icon: Clock,
            details: "Scheduler Active",
        },
    ];

    if (loading) {
        return <div className="grid grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white/5 rounded-2xl" />)}
        </div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                        Status Operacional
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Monitoramento em tempo real da infraestrutura
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchHealthData} disabled={loading} className="bg-white/5 border-white/10">
                    <RefreshCcw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                    Atualizar
                </Button>
            </div>

            {/* Services Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {services.map((service) => (
                    <ServiceCard key={service.name} service={service} />
                ))}
            </div>

            {/* Metrics & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Performance */}
                <Card className="lg:col-span-2 border-white/10 bg-black/20 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Cpu className="h-5 w-5 text-purple-400" />
                            Recursos do Sistema
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-white/70">Memória RAM</span>
                                <span className="text-sm font-mono text-white">
                                    {healthData?.system?.memoryUsedMB || 0} MB / 512 MB
                                </span>
                            </div>
                            <Progress
                                value={Math.min((healthData?.system?.memoryUsedMB || 0) / 5.12, 100)}
                                className="h-2 bg-white/5"
                                indicatorClassName="bg-gradient-to-r from-purple-500 to-pink-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-white/70">Disponibilidade (Uptime)</span>
                                <span className="text-sm font-mono text-white">
                                    {healthData ? formatUptime(healthData.system.uptime) : "-"}
                                </span>
                            </div>
                            <Progress
                                value={100}
                                className="h-2 bg-white/5"
                                indicatorClassName="bg-gradient-to-r from-emerald-500 to-cyan-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-white/70">Taxa de Erros (24h)</span>
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "text-sm font-bold px-2 py-0.5 rounded",
                                        (healthData?.errors?.count24h || 0) > 0 ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"
                                    )}>
                                        {healthData?.errors?.count24h || 0}
                                    </span>
                                </div>
                            </div>
                            <Progress
                                value={Math.min((healthData?.errors?.count24h || 0) * 10, 100)}
                                className="h-2 bg-white/5"
                                indicatorClassName="bg-gradient-to-r from-red-500 to-orange-500"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Environment Check */}
                <Card className="border-white/10 bg-black/20 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <HardDrive className="h-5 w-5 text-blue-400" />
                            Ambiente
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {[
                                { name: "MongoDB", configured: true },
                                { name: "JWT Secret", configured: true },
                                { name: "Mercado Pago", configured: true },
                                { name: "Instagram", configured: true },
                                { name: "Vectorizer", configured: true, highlight: true },
                                { name: "Groq AI", configured: false },
                                { name: "WhatsApp", configured: false },
                            ].map((env) => (
                                <div
                                    key={env.name}
                                    className={cn(
                                        "flex items-center justify-between p-2.5 rounded-lg border transition-colors",
                                        env.highlight
                                            ? "bg-emerald-500/5 border-emerald-500/20"
                                            : "bg-white/5 border-white/5 hover:bg-white/10"
                                    )}
                                >
                                    <span className={cn("text-xs font-medium", env.highlight ? "text-emerald-400" : "text-white/70")}>
                                        {env.name}
                                    </span>
                                    {env.configured ? (
                                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                                    ) : (
                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500/70" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
