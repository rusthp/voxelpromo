import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import api from '@/services/api';
import { Loader2, UserPlus, Eye, EyeOff, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Register = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Password validation
    const passwordChecks = {
        length: password.length >= 6,
        match: password === confirmPassword && confirmPassword.length > 0,
    };

    const isFormValid =
        username.length >= 3 &&
        email.includes('@') &&
        passwordChecks.length &&
        passwordChecks.match;

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isFormValid) {
            toast.error('Por favor, preencha todos os campos corretamente');
            return;
        }

        setIsLoading(true);
        try {
            await api.post('/auth/register', {
                username,
                email,
                password,
            });

            toast.success('Conta criada com sucesso! Faça login para continuar.');
            navigate('/login');
        } catch (error: any) {
            console.error('Register error:', error);
            const message = error.response?.data?.error || 'Erro ao criar conta';
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center glow">
                        <span className="text-primary-foreground font-bold text-3xl">V</span>
                    </div>
                </div>

                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">Criar Conta</CardTitle>
                        <CardDescription>
                            Preencha os dados abaixo para criar sua conta
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="seu_username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    minLength={3}
                                    maxLength={30}
                                    disabled={isLoading}
                                    className="bg-background"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Mínimo 3 caracteres, sem espaços
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    className="bg-background"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Senha</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        disabled={isLoading}
                                        className="bg-background pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                                <Input
                                    id="confirmPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    className="bg-background"
                                />
                            </div>

                            {/* Password Requirements */}
                            <div className="space-y-2 text-sm">
                                <div className={cn('flex items-center gap-2', passwordChecks.length ? 'text-success' : 'text-muted-foreground')}>
                                    {passwordChecks.length ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                    <span>Mínimo 6 caracteres</span>
                                </div>
                                <div className={cn('flex items-center gap-2', passwordChecks.match ? 'text-success' : 'text-muted-foreground')}>
                                    {passwordChecks.match ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                    <span>Senhas coincidem</span>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                variant="glow"
                                className="w-full"
                                disabled={isLoading || !isFormValid}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Criando conta...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        Criar Conta
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <div className="text-sm text-muted-foreground text-center">
                            Já tem uma conta?{' '}
                            <Link to="/login" className="text-primary hover:underline font-medium">
                                Fazer login
                            </Link>
                        </div>
                    </CardFooter>
                </Card>

                {/* Footer */}
                <p className="text-center text-xs text-muted-foreground mt-8">
                    © 2024 VoxelPromo. Todos os direitos reservados.
                </p>
            </div>
        </div>
    );
};

export default Register;
