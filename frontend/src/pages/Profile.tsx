import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { toast } from 'sonner';
import api from '@/services/api';
import { Save, Loader2, User, Bell, Palette, Lock } from 'lucide-react';

const Profile = () => {
    const { user, updateUser, refreshProfile } = useAuth();
    const { theme, setTheme } = useTheme();

    const [displayName, setDisplayName] = useState(user?.displayName || user?.username || '');
    const [emailNotifications, setEmailNotifications] = useState(user?.preferences?.emailNotifications ?? true);
    const [pushNotifications, setPushNotifications] = useState(user?.preferences?.pushNotifications ?? true);
    const [isSaving, setIsSaving] = useState(false);

    // Password change
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    useEffect(() => {
        if (user) {
            setDisplayName(user.displayName || user.username || '');
            setEmailNotifications(user.preferences?.emailNotifications ?? true);
            setPushNotifications(user.preferences?.pushNotifications ?? true);
        }
    }, [user]);

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            await api.put('/profile', {
                displayName,
                preferences: {
                    theme,
                    emailNotifications,
                    pushNotifications,
                },
            });

            updateUser({
                displayName,
                preferences: {
                    theme: theme as 'dark' | 'light',
                    emailNotifications,
                    pushNotifications,
                },
            });

            toast.success('Perfil atualizado com sucesso!');
        } catch (error: any) {
            console.error('Save profile error:', error);
            toast.error(error.response?.data?.error || 'Erro ao salvar perfil');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error('As senhas não coincidem');
            return;
        }

        if (newPassword.length < 6) {
            toast.error('A nova senha deve ter pelo menos 6 caracteres');
            return;
        }

        setIsChangingPassword(true);
        try {
            await api.put('/auth/change-password', {
                currentPassword,
                newPassword,
            });

            toast.success('Senha alterada com sucesso! Faça login novamente.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error('Change password error:', error);
            toast.error(error.response?.data?.error || 'Erro ao alterar senha');
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleAvatarChange = (newUrl: string | undefined) => {
        updateUser({ avatarUrl: newUrl });
        refreshProfile();
    };

    return (
        <Layout>
            <div className="p-6 space-y-6 max-w-4xl mx-auto">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Meu Perfil</h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie suas informações pessoais e preferências
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {/* Avatar Card */}
                    <Card className="md:col-span-1">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="w-5 h-5" />
                                Avatar
                            </CardTitle>
                            <CardDescription>Sua foto de perfil</CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center">
                            <AvatarUpload
                                currentAvatarUrl={user?.avatarUrl}
                                displayName={user?.displayName || user?.username}
                                onAvatarChange={handleAvatarChange}
                                size="lg"
                            />
                        </CardContent>
                    </Card>

                    {/* Profile Info Card */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Informações do Perfil</CardTitle>
                            <CardDescription>Atualize suas informações pessoais</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="username">Username</Label>
                                    <Input
                                        id="username"
                                        value={user?.username || ''}
                                        disabled
                                        className="bg-muted"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        O username não pode ser alterado
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        value={user?.email || ''}
                                        disabled
                                        className="bg-muted"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        O email não pode ser alterado
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="displayName">Nome de Exibição</Label>
                                <Input
                                    id="displayName"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="Como você quer ser chamado"
                                />
                            </div>

                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>Membro desde:</span>
                                <span>
                                    {user?.createdAt
                                        ? new Date(user.createdAt).toLocaleDateString('pt-BR')
                                        : '-'}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Preferences Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="w-5 h-5" />
                            Preferências
                        </CardTitle>
                        <CardDescription>Configure suas preferências de notificação e aparência</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Theme */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                    <Palette className="w-4 h-4" />
                                    <Label>Tema Escuro</Label>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Ativar o modo escuro para reduzir o brilho
                                </p>
                            </div>
                            <Switch
                                checked={theme === 'dark'}
                                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                            />
                        </div>

                        <Separator />

                        {/* Email Notifications */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Notificações por Email</Label>
                                <p className="text-sm text-muted-foreground">
                                    Receber atualizações importantes por email
                                </p>
                            </div>
                            <Switch
                                checked={emailNotifications}
                                onCheckedChange={setEmailNotifications}
                            />
                        </div>

                        {/* Push Notifications */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Notificações Push</Label>
                                <p className="text-sm text-muted-foreground">
                                    Receber notificações no navegador
                                </p>
                            </div>
                            <Switch
                                checked={pushNotifications}
                                onCheckedChange={setPushNotifications}
                            />
                        </div>

                        <div className="pt-4">
                            <Button onClick={handleSaveProfile} disabled={isSaving}>
                                {isSaving ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4 mr-2" />
                                )}
                                Salvar Alterações
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Change Password Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lock className="w-5 h-5" />
                            Alterar Senha
                        </CardTitle>
                        <CardDescription>Atualize sua senha de acesso</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="currentPassword">Senha Atual</Label>
                                <Input
                                    id="currentPassword"
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="newPassword">Nova Senha</Label>
                                    <Input
                                        id="newPassword"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <Button type="submit" variant="outline" disabled={isChangingPassword}>
                                {isChangingPassword ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Lock className="w-4 h-4 mr-2" />
                                )}
                                Alterar Senha
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
};

export default Profile;
