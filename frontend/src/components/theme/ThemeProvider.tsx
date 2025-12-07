import { ReactNode } from 'react';
import { ThemeContext, useThemeProvider } from '@/hooks/useTheme';

interface ThemeProviderProps {
    children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
    const themeContext = useThemeProvider();

    return (
        <ThemeContext.Provider value={themeContext}>
            {children}
        </ThemeContext.Provider>
    );
}
