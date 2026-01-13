import { useState, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Search, MoreVertical, CreditCard, User, Calendar, RefreshCcw, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import { cn } from "@/lib/utils";

interface Subscription {
    _id: string;
    userId: string;
    userName: string;
    userEmail: string;
    plan: string;
    status: "active" | "cancelled" | "expired" | "trial" | "pending";
    startDate: string;
    endDate: string;
    price: number;
    paymentMethod?: string;
}

const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
    active: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
    cancelled: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
    expired: { bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/20" },
    trial: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
    pending: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
};

const statusLabels: Record<string, string> = {
    active: "Ativo",
    cancelled: "Cancelado",
    expired: "Expirado",
    trial: "Trial",
    pending: "Pendente",
};

export function SubscriptionsTable() {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [planFilter, setPlanFilter] = useState<string>("all");
    const { toast } = useToast();

    useEffect(() => {
        fetchSubscriptions();
    }, []);

    const fetchSubscriptions = async () => {
        try {
            setLoading(true);
            const response = await api.get("/admin/users");

            if (response.data.success) {
                const users = response.data.data || [];
                const subs: Subscription[] = users.map((user: any) => ({
                    _id: user._id,
                    userId: user._id,
                    userName: user.name || user.username,
                    userEmail: user.email,
                    plan: user.billing?.plan || user.subscription?.plan || "trial",
                    status: user.subscription?.status || (user.billing?.plan ? "active" : "trial"),
                    startDate: user.subscription?.startDate || user.createdAt,
                    endDate: user.subscription?.endDate || "",
                    price: user.subscription?.price || 0,
                    paymentMethod: user.subscription?.paymentMethod,
                }));
                setSubscriptions(subs);
            }
        } catch (error) {
            console.error("Error fetching subscriptions:", error);
            toast({
                title: "Erro",
                description: "Falha ao carregar assinaturas",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCancelSubscription = async (userId: string) => {
        try {
            await api.patch(`/admin/users/${userId}/subscription`, { status: "cancelled" });
            toast({
                title: "Sucesso",
                description: "Assinatura cancelada com sucesso",
            });
            fetchSubscriptions();
        } catch (error) {
            toast({
                title: "Erro",
                description: "Falha ao cancelar assinatura",
                variant: "destructive",
            });
        }
    };

    const handleReactivateSubscription = async (userId: string) => {
        try {
            await api.patch(`/admin/users/${userId}/subscription`, { status: "active" });
            toast({
                title: "Sucesso",
                description: "Assinatura reativada com sucesso",
            });
            fetchSubscriptions();
        } catch (error) {
            toast({
                title: "Erro",
                description: "Falha ao reativar assinatura",
                variant: "destructive",
            });
        }
    };

    const filteredSubscriptions = subscriptions.filter((sub) => {
        const matchesSearch =
            sub.userName.toLowerCase().includes(search.toLowerCase()) ||
            sub.userEmail.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
        const matchesPlan = planFilter === "all" || sub.plan === planFilter;
        return matchesSearch && matchesStatus && matchesPlan;
    });

    const formatDate = (dateString: string) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString("pt-BR");
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(price / 100);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 text-white/30 animate-pulse">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="flex-1 w-full sm:max-w-md relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input
                        placeholder="Buscar por nome ou email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 bg-black/20 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50"
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[150px] bg-black/20 border-white/10 text-white focus:ring-0">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 text-white">
                            <SelectItem value="all">Todos Status</SelectItem>
                            <SelectItem value="active">Ativo</SelectItem>
                            <SelectItem value="trial">Trial</SelectItem>
                            <SelectItem value="cancelled">Cancelado</SelectItem>
                            <SelectItem value="expired">Expirado</SelectItem>
                            <SelectItem value="pending">Pendente</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={planFilter} onValueChange={setPlanFilter}>
                        <SelectTrigger className="w-[150px] bg-black/20 border-white/10 text-white focus:ring-0">
                            <SelectValue placeholder="Plano" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 text-white">
                            <SelectItem value="all">Todos Planos</SelectItem>
                            <SelectItem value="trial">Trial</SelectItem>
                            <SelectItem value="basic-monthly">Básico</SelectItem>
                            <SelectItem value="pro">Profissional</SelectItem>
                            <SelectItem value="premium-annual">Premium</SelectItem>
                            <SelectItem value="agency">Agência</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button
                        variant="outline"
                        onClick={fetchSubscriptions}
                        className="bg-white/5 border-white/10 hover:bg-white/10 hover:text-white"
                    >
                        <RefreshCcw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Ativos", value: subscriptions.filter((s) => s.status === "active").length, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
                    { label: "Em Trial", value: subscriptions.filter((s) => s.status === "trial").length, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
                    { label: "Cancelados", value: subscriptions.filter((s) => s.status === "cancelled").length, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
                    { label: "Total", value: subscriptions.length, color: "text-white", bg: "bg-white/5 border-white/10" },
                ].map((stat, idx) => (
                    <div key={idx} className={cn("rounded-xl p-4 border backdrop-blur-sm", stat.bg)}>
                        <div className={cn("text-2xl font-bold", stat.color)}>
                            {stat.value}
                        </div>
                        <div className="text-sm text-white/50">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="rounded-xl border border-white/10 bg-black/20 backdrop-blur-xl overflow-hidden shadow-2xl">
                <Table>
                    <TableHeader className="bg-white/5">
                        <TableRow className="border-white/5 hover:bg-transparent">
                            <TableHead className="text-white/60">Usuário</TableHead>
                            <TableHead className="text-white/60">Plano</TableHead>
                            <TableHead className="text-white/60">Status</TableHead>
                            <TableHead className="text-white/60">Início</TableHead>
                            <TableHead className="text-white/60">Término</TableHead>
                            <TableHead className="text-white/60">Valor</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredSubscriptions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12 text-white/30">
                                    Nenhuma assinatura encontrada
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredSubscriptions.map((sub) => (
                                <TableRow key={sub._id} className="border-white/5 hover:bg-white/5 transition-colors group">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center border border-white/10">
                                                <User className="h-4 w-4 text-white/70" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-white/90">{sub.userName}</div>
                                                <div className="text-xs text-white/50">{sub.userEmail}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize bg-white/5 border-white/10 text-white/70 font-normal">
                                            <Tag className="w-3 h-3 mr-1 opacity-50" />
                                            {sub.plan.replace("-", " ")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={cn("border", statusStyles[sub.status]?.bg, statusStyles[sub.status]?.text, statusStyles[sub.status]?.border)}>
                                            {statusLabels[sub.status] || sub.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-white/60 text-sm">
                                            {formatDate(sub.startDate)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-white/60 text-sm">
                                            {formatDate(sub.endDate)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-white/80 font-mono text-sm">
                                            {sub.price ? formatPrice(sub.price) : "-"}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-white/50 hover:text-white hover:bg-white/10">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
                                                {sub.status === "active" && (
                                                    <DropdownMenuItem
                                                        className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
                                                        onClick={() => handleCancelSubscription(sub.userId)}
                                                    >
                                                        Cancelar Assinatura
                                                    </DropdownMenuItem>
                                                )}
                                                {sub.status === "cancelled" && (
                                                    <DropdownMenuItem
                                                        onClick={() => handleReactivateSubscription(sub.userId)}
                                                        className="text-emerald-400 focus:text-emerald-300 focus:bg-emerald-500/10 cursor-pointer"
                                                    >
                                                        Reativar Assinatura
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem className="text-white focus:bg-white/10 cursor-pointer">Ver Detalhes</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
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
