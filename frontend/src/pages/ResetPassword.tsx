import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { CheckCircle2, XCircle, ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";

const ResetPassword = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [validating, setValidating] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [success, setSuccess] = useState(false);

    // Validate token on mount
    useEffect(() => {
        const validateToken = async () => {
            if (!token) {
                setValidating(false);
                setTokenValid(false);
                return;
            }

            try {
                const response = await api.get(`/auth/validate-reset-token/${token}`);
                setTokenValid(response.data.valid);
            } catch (error) {
                setTokenValid(false);
            } finally {
                setValidating(false);
            }
        };

        validateToken();
    }, [token]);

    const validatePassword = (pwd: string): string[] => {
        const errors: string[] = [];
        if (pwd.length < 8) errors.push("Mínimo 8 caracteres");
        if (!/\d/.test(pwd)) errors.push("Pelo menos 1 número");
        return errors;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate password
        const errors = validatePassword(password);
        if (errors.length > 0) {
            toast.error(errors.join(", "));
            return;
        }

        if (password !== confirmPassword) {
            toast.error("As senhas não coincidem");
            return;
        }

        setLoading(true);

        try {
            await api.post(`/auth/reset-password/${token}`, { password });
            setSuccess(true);
            toast.success("Senha redefinida com sucesso!");
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Erro ao redefinir senha");
        } finally {
            setLoading(false);
        }
    };

    // Loading state
    if (validating) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="w-full max-w-md text-center">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
                    <p className="mt-4 text-muted-foreground">Validando link...</p>
                </div>
            </div>
        );
    }

    // Invalid/expired token
    if (!tokenValid && !success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="w-full max-w-md">
                    <div className="flex justify-center mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-destructive/20 flex items-center justify-center">
                            <XCircle className="w-10 h-10 text-destructive" />
                        </div>
                    </div>

                    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                        <CardHeader className="space-y-1 text-center">
                            <CardTitle className="text-2xl font-bold">Link expirado</CardTitle>
                            <CardDescription className="text-base">
                                Este link de redefinição expirou ou é inválido.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
                                <p>Os links de redefinição são válidos por apenas <strong>15 minutos</strong> por segurança.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4">
                            <Link to="/forgot-password" className="w-full">
                                <Button variant="glow" className="w-full">
                                    Solicitar novo link
                                </Button>
                            </Link>
                            <Link to="/login" className="w-full">
                                <Button variant="outline" className="w-full">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Voltar para Login
                                </Button>
                            </Link>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        );
    }

    // Success state
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="w-full max-w-md">
                    <div className="flex justify-center mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center">
                            <CheckCircle2 className="w-10 h-10 text-green-500" />
                        </div>
                    </div>

                    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                        <CardHeader className="space-y-1 text-center">
                            <CardTitle className="text-2xl font-bold">Senha redefinida!</CardTitle>
                            <CardDescription className="text-base">
                                Sua senha foi alterada com sucesso. Você já pode fazer login com sua nova senha.
                            </CardDescription>
                        </CardHeader>
                        <CardFooter className="flex flex-col gap-4">
                            <Button
                                variant="glow"
                                className="w-full"
                                onClick={() => navigate("/login")}
                            >
                                Ir para Login
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        );
    }

    // Password reset form
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
                        <CardTitle className="text-2xl font-bold">Redefinir Senha</CardTitle>
                        <CardDescription>
                            Digite sua nova senha abaixo
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">Nova Senha</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={8}
                                        className="bg-background pr-10"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Mínimo 8 caracteres com pelo menos 1 número
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                                <Input
                                    id="confirmPassword"
                                    type={showPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    className="bg-background"
                                />
                            </div>
                            <Button type="submit" variant="glow" className="w-full" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Redefinindo...
                                    </>
                                ) : (
                                    "Redefinir Senha"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <div className="text-sm text-muted-foreground text-center">
                            <Link to="/login" className="text-primary hover:underline font-medium">
                                Voltar para login
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

export default ResetPassword;
