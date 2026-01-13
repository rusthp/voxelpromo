
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Search, Loader2, Eye } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { UserDetailDrawer } from "./UserDetailDrawer";

interface User {
    _id: string;
    username: string;
    email: string;
    role: 'admin' | 'user';
    isActive: boolean;
    lastLogin?: string;
    createdAt: string;
}

export function UsersTable() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const { toast } = useToast();


    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/users', {
                params: { search }
            });
            setUsers(response.data.data);
        } catch (error) {
            console.error("Failed to fetch users", error);
            toast({
                variant: "destructive",
                title: "Erro ao carregar usuários",
                description: "Não foi possível buscar a lista de usuários."
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(fetchUsers, 500); // Debounce
        return () => clearTimeout(timeout);
    }, [search]);

    const handleRoleChange = async (userId: string, newRole: 'admin' | 'user') => {
        try {
            await api.patch(`/admin/users/${userId}/role`, { role: newRole });
            toast({
                title: "Permissão atualizada",
                description: `O usuário agora é ${newRole}.`
            });
            fetchUsers(); // Refresh list
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro",
                description: "Falha ao atualizar permissão."
            });
        }
    };

    const handleStatusChange = async (userId: string, isActive: boolean) => {
        try {
            await api.patch(`/admin/users/${userId}/status`, { isActive });
            toast({
                title: isActive ? "Usuário ativado" : "Usuário suspenso",
                description: `Status do usuário atualizado com sucesso.`
            });
            fetchUsers(); // Refresh list
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro",
                description: "Falha ao atualizar status do usuário."
            });
        }
    };

    const handleImpersonate = async (user: User) => {
        if (!window.confirm(`Você tem certeza que deseja entrar como ${user.username}?`)) {
            return;
        }

        try {
            const response = await api.post(`/admin/impersonate/${user._id}`);
            const { accessToken } = response.data;

            if (accessToken) {
                // Save admin token if we want to add an "Exit Revert" feature later
                // For now, just swap
                localStorage.setItem('token', accessToken);
                toast({
                    title: "Acesso concedido",
                    description: `Você está logado como ${user.username}. Redirecionando...`
                });

                // Force reload to apply new token state
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
            }
        } catch (error) {
            console.error("Impersonation failed", error);
            toast({
                variant: "destructive",
                title: "Falha ao entrar",
                description: "Não foi possível realizar o impersonation."
            });
        }
    };


    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome ou email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 bg-black/20 border-white/10 text-white placeholder:text-white/40 focus:border-purple-500/50"
                    />
                </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 backdrop-blur-xl overflow-hidden shadow-2xl">
                <Table>
                    <TableHeader className="bg-white/5">
                        <TableRow className="border-white/5 hover:bg-transparent">
                            <TableHead className="text-white/60">Usuário</TableHead>
                            <TableHead className="text-white/60">Email</TableHead>
                            <TableHead className="text-white/60">Função</TableHead>
                            <TableHead className="text-white/60">Status</TableHead>
                            <TableHead className="text-white/60">Data Criação</TableHead>
                            <TableHead className="text-right text-white/60">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-purple-500" />
                                </TableCell>
                            </TableRow>
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    Nenhum usuário encontrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => (
                                <TableRow
                                    key={user._id}
                                    className="cursor-pointer border-white/5 hover:bg-white/5 transition-colors"
                                    onClick={() => {
                                        setSelectedUserId(user._id);
                                        setDrawerOpen(true);
                                    }}
                                >
                                    <TableCell className="font-medium text-white">{user.username}</TableCell>
                                    <TableCell className="text-white/80">{user.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={null} className={`
                                            border-0 uppercase text-[10px] font-bold tracking-wider
                                            ${user.role === 'admin'
                                                ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                                                : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                                            }
                                        `}>
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={null} className={`
                                            border-0 uppercase text-[10px] font-bold tracking-wider
                                            ${user.isActive
                                                ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                                : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                            }
                                        `}>
                                            {user.isActive ? 'Ativo' : 'Inativo'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-white/60">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-white">
                                                <DropdownMenuLabel className="text-white/50">Ações</DropdownMenuLabel>

                                                <DropdownMenuItem onClick={() => {
                                                    setSelectedUserId(user._id);
                                                    setDrawerOpen(true);
                                                }} className="flex items-center gap-2 focus:bg-white/10 focus:text-white cursor-pointer">
                                                    <Eye className="h-4 w-4" />
                                                    Ver Detalhes
                                                </DropdownMenuItem>

                                                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.email)} className="focus:bg-white/10 focus:text-white cursor-pointer">
                                                    Copiar Email
                                                </DropdownMenuItem>

                                                {user.isActive ? (
                                                    <DropdownMenuItem
                                                        onClick={() => handleStatusChange(user._id, false)}
                                                        className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
                                                    >
                                                        Suspender Usuário
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <DropdownMenuItem
                                                        onClick={() => handleStatusChange(user._id, true)}
                                                        className="text-emerald-400 focus:text-emerald-300 focus:bg-emerald-500/10 cursor-pointer"
                                                    >
                                                        Ativar Usuário
                                                    </DropdownMenuItem>
                                                )}

                                                <DropdownMenuItem onClick={() => handleImpersonate(user)} className="text-blue-400 focus:text-blue-300 focus:bg-blue-500/10 cursor-pointer">
                                                    Entrar como Usuário
                                                </DropdownMenuItem>

                                                {user.role === 'user' ? (
                                                    <DropdownMenuItem onClick={() => handleRoleChange(user._id, 'admin')} className="focus:bg-white/10 focus:text-white cursor-pointer">
                                                        Promover a Admin
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <DropdownMenuItem onClick={() => handleRoleChange(user._id, 'user')} className="focus:bg-white/10 focus:text-white cursor-pointer">
                                                        Rebaixar para User
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <UserDetailDrawer
                userId={selectedUserId}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
            />
        </div>
    );
}
