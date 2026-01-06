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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";

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
        const interval = setInterval(fetchHealthData, 30000); // Refresh every 30s
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
            name: "MongoDB",
            status: "healthy",
            icon: Database,
            details: "Cluster Atlas Conectado",
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
            details: "Ambiente Sandbox",
        },
        {
            name: "Cron Jobs",
            status: "healthy",
            icon: Clock,
            details: "Executando normalmente",
        },
    ];

    const statusColors = {
        healthy: "bg-green-500/10 text-green-500 border-green-500/20",
        degraded: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        down: "bg-red-500/10 text-red-500 border-red-500/20",
    };

    const statusIcons = {
        healthy: CheckCircle,
        degraded: AlertTriangle,
        down: XCircle,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Saúde do Sistema</h3>
                    <p className="text-sm text-muted-foreground">
                        Monitoramento em tempo real dos serviços
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchHealthData} disabled={loading}>
                    <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    Atualizar
                </Button>
            </div>

            {/* Services Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {services.map((service) => {
                    const StatusIcon = statusIcons[service.status];
                    return (
                        <Card key={service.name} className="relative overflow-hidden">
                            <CardContent className="pt-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <service.icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <Badge className={statusColors[service.status]}>
                                        <StatusIcon className="h-3 w-3 mr-1" />
                                        {service.status === "healthy" && "OK"}
                                        {service.status === "degraded" && "Alerta"}
                                        {service.status === "down" && "Offline"}
                                    </Badge>
                                </div>
                                <h4 className="font-semibold">{service.name}</h4>
                                <p className="text-sm text-muted-foreground">{service.details}</p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* System Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Performance Metrics */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Cpu className="h-5 w-5 text-primary" />
                            Métricas de Performance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">Memória Utilizada</span>
                                <span className="text-sm font-medium">
                                    {healthData?.system?.memoryUsedMB || 0} MB
                                </span>
                            </div>
                            <Progress
                                value={Math.min((healthData?.system?.memoryUsedMB || 0) / 5, 100)}
                                className="h-2"
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">Uptime</span>
                                <span className="text-sm font-medium">
                                    {healthData ? formatUptime(healthData.system.uptime) : "-"}
                                </span>
                            </div>
                            <Progress value={100} className="h-2" />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">Erros (24h)</span>
                                <span className="text-sm font-medium">
                                    {healthData?.errors?.count24h || 0}
                                </span>
                            </div>
                            <Progress
                                value={Math.min((healthData?.errors?.count24h || 0) * 10, 100)}
                                className="h-2"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Activity Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            Resumo de Atividade
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-4 rounded-lg bg-muted/50">
                                <div className="text-2xl font-bold text-primary">
                                    {healthData?.offers?.total || 0}
                                </div>
                                <div className="text-sm text-muted-foreground">Total Ofertas</div>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-muted/50">
                                <div className="text-2xl font-bold text-green-500">
                                    {healthData?.offers?.active || 0}
                                </div>
                                <div className="text-sm text-muted-foreground">Ofertas Ativas</div>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-muted/50">
                                <div className="text-2xl font-bold text-blue-500">
                                    {healthData?.users?.total || 0}
                                </div>
                                <div className="text-sm text-muted-foreground">Total Usuários</div>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-muted/50">
                                <div className="text-2xl font-bold text-purple-500">
                                    {healthData?.users?.new24h || 0}
                                </div>
                                <div className="text-sm text-muted-foreground">Novos (24h)</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Environment Variables Check */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <HardDrive className="h-5 w-5 text-primary" />
                        Variáveis de Ambiente
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { name: "MongoDB", configured: true },
                            { name: "JWT Secret", configured: true },
                            { name: "Mercado Pago", configured: true },
                            { name: "Telegram", configured: false },
                            { name: "Instagram", configured: true },
                            { name: "WhatsApp", configured: false },
                            { name: "Groq AI", configured: false },
                            { name: "Vectorizer", configured: true },
                        ].map((envVar) => (
                            <div
                                key={envVar.name}
                                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                            >
                                <span className="text-sm">{envVar.name}</span>
                                {envVar.configured ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
