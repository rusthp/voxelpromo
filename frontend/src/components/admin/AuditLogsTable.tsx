
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
import { Loader2, RotateCcw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

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

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todas Categorias</SelectItem>
                        <SelectItem value="AUTH">Autenticação</SelectItem>
                        <SelectItem value="OFFER">Ofertas</SelectItem>
                        <SelectItem value="USER">Usuários</SelectItem>
                        <SelectItem value="SYSTEM">Sistema</SelectItem>
                        <SelectItem value="BILLING">Faturamento</SelectItem>
                    </SelectContent>
                </Select>

                <Button variant="outline" size="icon" onClick={fetchLogs}>
                    <RotateCcw className="h-4 w-4" />
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Data/Hora</TableHead>
                            <TableHead>Ator</TableHead>
                            <TableHead>Ação</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead>Detalhes</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    Nenhum log encontrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => (
                                <TableRow key={log._id}>
                                    <TableCell className="whitespace-nowrap">
                                        {new Date(log.createdAt).toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{log.actor.username}</span>
                                            <span className="text-xs text-muted-foreground">{log.actor.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-sm">{log.action}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{log.category}</Badge>
                                    </TableCell>
                                    <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground font-mono">
                                        {JSON.stringify(log.details)}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
