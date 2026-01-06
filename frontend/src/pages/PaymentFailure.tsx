import { useNavigate, useSearchParams } from "react-router-dom";
import { XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function PaymentFailure() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const isPending = searchParams.get('status') === 'pending';

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto mb-4">
                        {isPending ? (
                            <AlertTriangle className="h-16 w-16 text-yellow-500" />
                        ) : (
                            <XCircle className="h-16 w-16 text-red-500" />
                        )}
                    </div>
                    <CardTitle className="text-2xl">
                        {isPending ? 'Pagamento Pendente' : 'Pagamento Não Confirmado'}
                    </CardTitle>
                    <CardDescription>
                        {isPending
                            ? 'Seu pagamento está sendo processado'
                            : 'Não foi possível processar seu pagamento'
                        }
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {isPending ? (
                        <Alert>
                            <AlertDescription>
                                Seu pagamento via PIX está pendente. Assim que for confirmado,
                                sua assinatura será ativada automaticamente.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="bg-muted p-4 rounded-lg space-y-2">
                            <p className="text-sm text-muted-foreground">
                                Possíveis motivos:
                            </p>
                            <ul className="text-sm text-muted-foreground text-left space-y-1">
                                <li>• Cartão recusado</li>
                                <li>• Saldo insuficiente</li>
                                <li>• Dados incorretos</li>
                                <li>• Limite excedido</li>
                            </ul>
                        </div>
                    )}

                    <p className="text-sm">
                        Entre em contato com o suporte se o problema persistir.
                    </p>
                </CardContent>

                <CardFooter className="flex gap-3">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => navigate('/')}
                    >
                        Voltar ao Início
                    </Button>
                    <Button
                        className="flex-1"
                        onClick={() => navigate('/pricing')}
                    >
                        Tentar Novamente
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
