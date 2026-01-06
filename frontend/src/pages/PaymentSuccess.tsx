import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function PaymentSuccess() {
    const navigate = useNavigate();

    useEffect(() => {
        // Auto redirect after 5 seconds
        const timer = setTimeout(() => {
            navigate('/');
        }, 5000);

        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto mb-4">
                        <CheckCircle className="h-16 w-16 text-green-500" />
                    </div>
                    <CardTitle className="text-2xl">Pagamento Confirmado!</CardTitle>
                    <CardDescription>
                        Sua assinatura foi ativada com sucesso
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="bg-muted p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                            Você receberá um email de confirmação com os detalhes da sua assinatura.
                        </p>
                    </div>

                    <p className="text-sm">
                        Redirecionando para o dashboard em 5 segundos...
                    </p>
                </CardContent>

                <CardFooter>
                    <Button
                        className="w-full"
                        onClick={() => navigate('/')}
                    >
                        Ir para Dashboard
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
