import { useState, useEffect } from "react";
import api from "@/services/api";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RotateCcw, Shield, Activity, User, CreditCard, Lock, Terminal } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface AuditLog {
    _id: string;
    actor: {
        username: string;
        email: string;
        role: string;
    };
    action: string;
    category: string;
    details?: any;
    createdAt: string;
}

export function AuditLogsTable() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState<string>("ALL");
    const { toast } = useToast();

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (category !== "ALL") params.category = category;

            const response = await api.get('/admin/audit-logs', { params });
            setLogs(response.data.data);
        } catch (error) {
            console.error("Failed to fetch logs", error);
            toast({
                variant: "destructive",
                title: "Erro ao carregar logs",
                description: "Não foi possível buscar os logs de auditoria."
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [category]);

    const getCategoryStyles = (cat: string) => {
        switch (cat) {
            case 'AUTH': return { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: Lock };
            case 'OFFER': return { color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", icon: Activity };
            case 'USER': return { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: User };
            case 'BILLING': return { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: CreditCard };
            case 'SYSTEM': return { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", icon: Terminal };
            default: return { color: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/20", icon: Shield };
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-[180px] bg-black/20 border-white/10 text-white focus:ring-0 focus:ring-offset-0">
                        <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                        <SelectItem value="ALL">Todas Categorias</SelectItem>
                        <SelectItem value="AUTH">Autenticação</SelectItem>
                        <SelectItem value="OFFER">Ofertas</SelectItem>
                        <SelectItem value="USER">Usuários</SelectItem>
                        <SelectItem value="SYSTEM">Sistema</SelectItem>
                        <SelectItem value="BILLING">Faturamento</SelectItem>
                    </SelectContent>
                </Select>

                <Button variant="outline" size="icon" onClick={fetchLogs} className="bg-white/5 border-white/10 hover:bg-white/10 hover:text-white">
                    <RotateCcw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 backdrop-blur-xl overflow-hidden shadow-2xl">
                <Table>
                    <TableHeader className="bg-white/5">
                        <TableRow className="border-white/5 hover:bg-transparent">
                            <TableHead className="text-white/60">Data/Hora</TableHead>
                            <TableHead className="text-white/60">Ator</TableHead>
                            <TableHead className="text-white/60">Ação</TableHead>
                            <TableHead className="text-white/60">Categoria</TableHead>
                            <TableHead className="text-white/60">Detalhes</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-purple-500" />
                                </TableCell>
                            </TableRow>
                        ) : logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    Nenhum log encontrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => {
                                const style = getCategoryStyles(log.category);
                                const Icon = style.icon;
                                return (
                                    <TableRow key={log._id} className="border-white/5 hover:bg-white/5 transition-colors">
                                        <TableCell className="whitespace-nowrap text-white/70 text-xs">
                                            {new Date(log.createdAt).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-white text-sm">{log.actor.username}</span>
                                                <span className="text-[10px] text-white/40">{log.actor.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-white/80">{log.action}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn("text-[10px] font-bold border", style.color, style.bg, style.border)}>
                                                <Icon className="w-3 h-3 mr-1" />
                                                {log.category}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="max-w-[300px]">
                                            <code className="text-[10px] text-white/50 bg-black/30 px-2 py-1 rounded block truncate font-mono">
                                                {JSON.stringify(log.details)}
                                            </code>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
