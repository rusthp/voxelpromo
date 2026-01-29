import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import api from '@/services/api';

export interface UserPreferences {
    theme: 'dark' | 'light';
    emailNotifications: boolean;
    pushNotifications: boolean;
    niche?: 'tech' | 'fashion' | 'health' | 'home' | 'sports' | 'games' | 'general' | null;
}

export interface User {
    id: string;
    username: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
    role: 'admin' | 'user';
    preferences?: UserPreferences;
    createdAt?: string;
    lastLogin?: string;
    billing?: {
        type: 'individual' | 'company';
        document: string;
        name: string;
        phone?: string;
        address?: {
            street: string;
            number: string;
            complement?: string;
            neighborhood: string;
            city: string;
            state: string;
            zipCode: string;
        };
    };
    plan?: {
        tier: 'free' | 'pro' | 'agency';
        status: 'active' | 'trialing' | 'past_due' | 'canceled';
        validUntil?: string;
        limits?: {
            postsPerDay: number;
        };
    };
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    loginWithGoogle: (idToken: string) => Promise<void>;
    logout: () => Promise<void>;
    updateUser: (userData: Partial<User>) => void;
    refreshProfile: () => Promise<void>;
}

const AUTH_TOKEN_KEY = 'token';
const AUTH_USER_KEY = 'user';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(() => {
        const stored = localStorage.getItem(AUTH_USER_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch {
                return null;
            }
        }
        return null;
    });
    const [isLoading, setIsLoading] = useState(true);

    const isAuthenticated = !!user;

    // Refresh profile from server
    const refreshProfile = useCallback(async () => {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (!token) {
            setIsLoading(false);
            return;
        }

        try {
            const response = await api.get('/profile');
            const profile = response.data.profile;

            const userData: User = {
                id: profile.id,
                username: profile.username,
                email: profile.email,
                displayName: profile.displayName,
                avatarUrl: profile.avatarUrl,
                role: profile.role,
                preferences: profile.preferences,
                createdAt: profile.createdAt,
                lastLogin: profile.lastLogin,
                billing: profile.billing,
                plan: profile.plan,
            };

            setUser(userData);
            localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userData));
        } catch (error) {
            console.error('Failed to refresh profile:', error);
            // Token might be invalid, clear auth state
            localStorage.removeItem(AUTH_TOKEN_KEY);
            localStorage.removeItem(AUTH_USER_KEY);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Check auth on mount
    useEffect(() => {
        refreshProfile();
    }, [refreshProfile]);

    const login = async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password });
        const { accessToken, user: userData } = response.data;

        localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userData));
        setUser(userData);

        // Refresh to get full profile data
        await refreshProfile();
    };

    const loginWithGoogle = async (idToken: string) => {
        const response = await api.post('/auth/google', { idToken });
        const { accessToken, user: userData } = response.data;

        localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userData));
        setUser(userData);

        // Refresh to get full profile data
        await refreshProfile();
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem(AUTH_TOKEN_KEY);
            localStorage.removeItem(AUTH_USER_KEY);
            setUser(null);
        }
    };

    const updateUser = (userData: Partial<User>) => {
        if (user) {
            const updatedUser = { ...user, ...userData };
            setUser(updatedUser);
            localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated,
                isLoading,
                login,
                loginWithGoogle,
                logout,
                updateUser,
                refreshProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
