
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
                        className="pl-8"
                    />
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Função</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Data Criação</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    Nenhum usuário encontrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => (
                                <TableRow
                                    key={user._id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => {
                                        setSelectedUserId(user._id);
                                        setDrawerOpen(true);
                                    }}
                                >
                                    <TableCell className="font-medium">{user.username}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={user.isActive ? 'outline' : 'destructive'} className={user.isActive ? "text-green-600 border-green-600" : ""}>
                                            {user.isActive ? 'Ativo' : 'Inativo'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Ações</DropdownMenuLabel>

                                                <DropdownMenuItem onClick={() => {
                                                    setSelectedUserId(user._id);
                                                    setDrawerOpen(true);
                                                }} className="flex items-center gap-2">
                                                    <Eye className="h-4 w-4" />
                                                    Ver Detalhes
                                                </DropdownMenuItem>

                                                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.email)}>
                                                    Copiar Email
                                                </DropdownMenuItem>

                                                <DropdownMenuItem onClick={() => handleImpersonate(user)} className="text-blue-600 focus:text-blue-700 focus:bg-blue-50">
                                                    Entrar como Usuário
                                                </DropdownMenuItem>

                                                {user.role === 'user' ? (
                                                    <DropdownMenuItem onClick={() => handleRoleChange(user._id, 'admin')}>
                                                        Promover a Admin
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <DropdownMenuItem onClick={() => handleRoleChange(user._id, 'user')}>
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
