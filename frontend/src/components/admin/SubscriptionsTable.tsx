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
import { Loader2, Search, MoreVertical, CreditCard, User, Calendar, RefreshCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";

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

const statusColors: Record<string, string> = {
    active: "bg-green-500/10 text-green-500 border-green-500/20",
    cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
    expired: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    trial: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
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
            // Fetch users with subscription data
            const response = await api.get("/admin/users");

            if (response.data.success) {
                // Backend returns users array directly in 'data', not 'data.users'
                const users = response.data.data || [];

                // Transform users to subscription format
                // Include all users (all have at least a trial plan in the billing system)
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
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome ou email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos Status</SelectItem>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="trial">Trial</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                        <SelectItem value="expired">Expirado</SelectItem>
                        <SelectItem value="pending">Pendente</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={planFilter} onValueChange={setPlanFilter}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Plano" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos Planos</SelectItem>
                        <SelectItem value="trial">Trial</SelectItem>
                        <SelectItem value="basic-monthly">Básico</SelectItem>
                        <SelectItem value="pro">Profissional</SelectItem>
                        <SelectItem value="premium-annual">Premium</SelectItem>
                        <SelectItem value="agency">Agência</SelectItem>
                    </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchSubscriptions}>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Atualizar
                </Button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card rounded-lg p-4 border">
                    <div className="text-2xl font-bold text-green-500">
                        {subscriptions.filter((s) => s.status === "active").length}
                    </div>
                    <div className="text-sm text-muted-foreground">Ativos</div>
                </div>
                <div className="bg-card rounded-lg p-4 border">
                    <div className="text-2xl font-bold text-blue-500">
                        {subscriptions.filter((s) => s.status === "trial").length}
                    </div>
                    <div className="text-sm text-muted-foreground">Em Trial</div>
                </div>
                <div className="bg-card rounded-lg p-4 border">
                    <div className="text-2xl font-bold text-red-500">
                        {subscriptions.filter((s) => s.status === "cancelled").length}
                    </div>
                    <div className="text-sm text-muted-foreground">Cancelados</div>
                </div>
                <div className="bg-card rounded-lg p-4 border">
                    <div className="text-2xl font-bold text-primary">
                        {subscriptions.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Total</div>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Plano</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Início</TableHead>
                            <TableHead>Término</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredSubscriptions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    Nenhuma assinatura encontrada
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredSubscriptions.map((sub) => (
                                <TableRow key={sub._id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                <User className="h-4 w-4 text-primary" />
                                            </div>
                                            <div>
                                                <div className="font-medium">{sub.userName}</div>
                                                <div className="text-sm text-muted-foreground">{sub.userEmail}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize">
                                            {sub.plan.replace("-", " ")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={statusColors[sub.status]}>
                                            {statusLabels[sub.status] || sub.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            {formatDate(sub.startDate)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            {formatDate(sub.endDate)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                                            {sub.price ? formatPrice(sub.price) : "-"}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {sub.status === "active" && (
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => handleCancelSubscription(sub.userId)}
                                                    >
                                                        Cancelar Assinatura
                                                    </DropdownMenuItem>
                                                )}
                                                {sub.status === "cancelled" && (
                                                    <DropdownMenuItem onClick={() => handleReactivateSubscription(sub.userId)}>
                                                        Reativar Assinatura
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem>Ver Detalhes</DropdownMenuItem>
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
