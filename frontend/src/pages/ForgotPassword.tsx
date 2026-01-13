import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/services/api";
import { CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await api.post("/auth/forgot-password", { email });
            setSubmitted(true);
            toast.success("Solicitação enviada!");
        } catch (error: any) {
            // Still show success (security: don't reveal if email exists)
            setSubmitted(true);
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
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
                            <div className="flex justify-center mb-4">
                                <CheckCircle2 className="w-16 h-16 text-green-500" />
                            </div>
                            <CardTitle className="text-2xl font-bold">Verifique seu email</CardTitle>
                            <CardDescription className="text-base">
                                Se existe uma conta com o email <strong>{email}</strong>,
                                você receberá um link para redefinir sua senha.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
                                <p>• O link expira em <strong>15 minutos</strong></p>
                                <p>• Verifique também sua pasta de spam</p>
                                <p>• Caso não receba, tente novamente</p>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4">
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
                        <CardTitle className="text-2xl font-bold">Esqueceu sua senha?</CardTitle>
                        <CardDescription>
                            Digite seu email e enviaremos um link para redefinir sua senha
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
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
                                    autoFocus
                                />
                            </div>
                            <Button type="submit" variant="glow" className="w-full" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    "Enviar link de redefinição"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <div className="text-sm text-muted-foreground text-center">
                            Lembrou sua senha?{' '}
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

export default ForgotPassword;
