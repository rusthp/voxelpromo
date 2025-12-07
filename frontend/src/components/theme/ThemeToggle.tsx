import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    className="w-9 h-9 rounded-xl hover:bg-secondary transition-all duration-300"
                >
                    {theme === 'dark' ? (
                        <Sun className="w-5 h-5 text-yellow-400 transition-transform duration-300 hover:rotate-12" />
                    ) : (
                        <Moon className="w-5 h-5 text-primary transition-transform duration-300 hover:-rotate-12" />
                    )}
                    <span className="sr-only">
                        {theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
                    </span>
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>{theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}</p>
            </TooltipContent>
        </Tooltip>
    );
}
