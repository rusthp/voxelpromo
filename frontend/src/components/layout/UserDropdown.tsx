import { useNavigate } from 'react-router-dom';
import { User, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export function UserDropdown() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Logout realizado com sucesso!');
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
            toast.error('Erro ao fazer logout');
        }
    };

    const displayName = user?.displayName || user?.username || 'User';
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const avatarUrl = user?.avatarUrl
        ? user.avatarUrl.startsWith('http')
            ? user.avatarUrl
            : `${apiBaseUrl}${user.avatarUrl}`
        : undefined;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="w-9 h-9 rounded-full aspect-square bg-gradient-to-br from-primary to-info flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all focus:outline-none focus:ring-2 focus:ring-primary/50">
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={displayName}
                            className="w-full h-full object-cover rounded-full"
                        />
                    ) : (
                        <span className="text-primary-foreground font-semibold text-sm">
                            {getInitials(displayName)}
                        </span>
                    )}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{displayName}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {user?.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Meu Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configurações</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
