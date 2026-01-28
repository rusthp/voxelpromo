import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Mail, Loader2, AlertCircle } from "lucide-react";
import api from "@/services/api";
import { GoogleLoginButton } from "@/components/GoogleLoginButton";
import { GoogleOAuthProvider } from "@react-oauth/google";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [verificationRequired, setVerificationRequired] = useState(false);
    const [resendingEmail, setResendingEmail] = useState(false);
    const [googleClientId, setGoogleClientId] = useState<string | null>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { login, loginWithGoogle } = useAuth();

    // Show message from registration
    useEffect(() => {
        const state = location.state as { message?: string } | null;
        if (state?.message) {
            toast.info(state.message);
            // Clear the state
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    // Fetch Google OAuth config
    useEffect(() => {
        const fetchGoogleConfig = async () => {
            try {
                const response = await api.get('/auth/google/config');
                if (response.data.configured && response.data.clientId) {
                    setGoogleClientId(response.data.clientId);
                }
            } catch (error) {
                console.error('Failed to fetch Google config:', error);
            }
        };
        fetchGoogleConfig();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setVerificationRequired(false);

        try {
            await login(email, password);
            toast.success("Login realizado com sucesso!");
            navigate("/products");
        } catch (error: any) {
            console.error("Login error:", error);

            // Check if email verification is required
            if (error.response?.data?.requiresVerification) {
                setVerificationRequired(true);
                toast.error("Verifique seu email antes de fazer login.");
            } else {
                toast.error(error.response?.data?.error || "Erro ao fazer login");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResendVerification = async () => {
        if (!email) {
            toast.error("Digite seu email primeiro");
            return;
        }

        setResendingEmail(true);
        try {
            await api.post('/auth/resend-verification', { email });
            toast.success("Email de verificação reenviado! Verifique sua caixa de entrada.");
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Erro ao reenviar email");
        } finally {
            setResendingEmail(false);
        }
    };

    const handleGoogleLogin = async (idToken: string) => {
        try {
            await loginWithGoogle(idToken);
            toast.success("Login realizado com sucesso!");
            navigate("/products");
        } catch (error: any) {
            console.error("Google login error:", error);
            toast.error(error.response?.data?.error || "Erro ao fazer login com Google");
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
                    <CardHeader className="space-y-1 text-center">
                        <CardTitle className="text-2xl font-bold">VoxelPromo</CardTitle>
                        <CardDescription>
                            Entre com suas credenciais para acessar o painel
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Verification Required Alert */}
                        {verificationRequired && (
                            <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-amber-400">
                                            Email não verificado
                                        </p>
                                        <p className="text-xs text-white/60 mt-1">
                                            Verifique sua caixa de entrada e clique no link de confirmação.
                                        </p>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleResendVerification}
                                            disabled={resendingEmail}
                                            className="mt-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 p-0 h-auto"
                                        >
                                            {resendingEmail ? (
                                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                            ) : (
                                                <Mail className="w-3 h-3 mr-1" />
                                            )}
                                            Reenviar email de verificação
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="bg-background"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Senha</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="bg-background"
                                />
                            </div>
                            <Button type="submit" variant="glow" className="w-full" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Entrando...
                                    </>
                                ) : (
                                    "Entrar"
                                )}
                            </Button>
                        </form>

                        {/* Google Login Divider */}
                        {googleClientId && (
                            <>
                                <div className="relative my-4">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-border/50" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-card px-2 text-muted-foreground">ou</span>
                                    </div>
                                </div>

                                {/* Google Login Button */}
                                <GoogleOAuthProvider clientId={googleClientId}>
                                    <GoogleLoginButton
                                        onSuccess={handleGoogleLogin}
                                        onError={(error) => toast.error(error.message || "Erro ao conectar com Google")}
                                        disabled={loading}
                                    />
                                </GoogleOAuthProvider>
                            </>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-primary">
                            Esqueceu sua senha?
                        </Link>
                        <div className="text-sm text-muted-foreground text-center">
                            Não tem uma conta?{' '}
                            <Link to="/register" className="text-primary hover:underline font-medium">
                                Criar conta
                            </Link>
                        </div>
                    </CardFooter>
                </Card>

                {/* Footer */}
                <p className="text-center text-xs text-muted-foreground mt-8">
                    © {new Date().getFullYear()} VoxelPromo. Todos os direitos reservados.
                </p>
            </div>
        </div>
    );
};

export default Login;
