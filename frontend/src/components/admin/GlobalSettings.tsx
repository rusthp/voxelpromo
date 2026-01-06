import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Settings,
    DollarSign,
    Bell,
    Shield,
    Save,
    RefreshCcw,
    AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";

interface Plan {
    id: string;
    name: string;
    price: number;
    cycle: string;
    isActive: boolean;
}

interface GlobalConfig {
    maintenanceMode: boolean;
    registrationEnabled: boolean;
    maxOffersPerUser: number;
    trialDays: number;
    globalNotification: string;
}

export function GlobalSettings() {
    const [plans, setPlans] = useState<Plan[]>([
        { id: "trial", name: "Trial", price: 0, cycle: "7 dias", isActive: true },
        { id: "basic-monthly", name: "Básico", price: 2990, cycle: "mensal", isActive: true },
        { id: "pro", name: "Profissional", price: 4990, cycle: "mensal", isActive: true },
        { id: "premium-annual", name: "Premium", price: 99900, cycle: "anual", isActive: true },
        { id: "agency", name: "Agência", price: 19990, cycle: "mensal", isActive: true },
    ]);

    const [config, setConfig] = useState<GlobalConfig>({
        maintenanceMode: false,
        registrationEnabled: true,
        maxOffersPerUser: 1000,
        trialDays: 7,
        globalNotification: "",
    });

    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    const handlePlanPriceChange = (planId: string, newPrice: string) => {
        const priceInCents = Math.round(parseFloat(newPrice.replace(",", ".")) * 100);
        setPlans((prev) =>
            prev.map((p) => (p.id === planId ? { ...p, price: priceInCents } : p))
        );
    };

    const handlePlanToggle = (planId: string) => {
        setPlans((prev) =>
            prev.map((p) => (p.id === planId ? { ...p, isActive: !p.isActive } : p))
        );
    };

    const handleConfigChange = (key: keyof GlobalConfig, value: any) => {
        setConfig((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // In a real implementation, this would save to the backend
            await new Promise((resolve) => setTimeout(resolve, 1000));
            toast({
                title: "Sucesso",
                description: "Configurações salvas com sucesso",
            });
        } catch (error) {
            toast({
                title: "Erro",
                description: "Falha ao salvar configurações",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const formatPrice = (priceInCents: number) => {
        return (priceInCents / 100).toFixed(2).replace(".", ",");
    };

    return (
        <div className="space-y-6">
            {/* Warning Banner */}
            {config.maintenanceMode && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <div>
                        <h4 className="font-medium text-yellow-500">Modo de Manutenção Ativo</h4>
                        <p className="text-sm text-muted-foreground">
                            O sistema está em manutenção. Usuários não poderão acessar.
                        </p>
                    </div>
                </div>
            )}

            {/* Plans Configuration */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-primary" />
                        Planos e Preços
                    </CardTitle>
                    <CardDescription>
                        Configure os preços e status dos planos de assinatura
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {plans.map((plan) => (
                            <div
                                key={plan.id}
                                className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                            >
                                <div className="flex items-center gap-4">
                                    <Switch
                                        checked={plan.isActive}
                                        onCheckedChange={() => handlePlanToggle(plan.id)}
                                    />
                                    <div>
                                        <div className="font-medium flex items-center gap-2">
                                            {plan.name}
                                            {!plan.isActive && (
                                                <Badge variant="outline" className="text-xs">
                                                    Desativado
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            Ciclo: {plan.cycle}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">R$</span>
                                    <Input
                                        type="text"
                                        value={formatPrice(plan.price)}
                                        onChange={(e) => handlePlanPriceChange(plan.id, e.target.value)}
                                        className="w-24 text-right"
                                        disabled={plan.id === "trial"}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* System Configuration */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-primary" />
                        Configurações do Sistema
                    </CardTitle>
                    <CardDescription>
                        Controle comportamentos globais da plataforma
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-base">Modo de Manutenção</Label>
                            <p className="text-sm text-muted-foreground">
                                Bloqueia o acesso de usuários ao sistema
                            </p>
                        </div>
                        <Switch
                            checked={config.maintenanceMode}
                            onCheckedChange={(v) => handleConfigChange("maintenanceMode", v)}
                        />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-base">Registro de Novos Usuários</Label>
                            <p className="text-sm text-muted-foreground">
                                Permite que novos usuários se registrem
                            </p>
                        </div>
                        <Switch
                            checked={config.registrationEnabled}
                            onCheckedChange={(v) => handleConfigChange("registrationEnabled", v)}
                        />
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Máximo de Ofertas por Usuário</Label>
                            <Input
                                type="number"
                                value={config.maxOffersPerUser}
                                onChange={(e) =>
                                    handleConfigChange("maxOffersPerUser", parseInt(e.target.value))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Dias de Trial</Label>
                            <Input
                                type="number"
                                value={config.trialDays}
                                onChange={(e) =>
                                    handleConfigChange("trialDays", parseInt(e.target.value))
                                }
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-primary" />
                        Notificação Global
                    </CardTitle>
                    <CardDescription>
                        Exiba uma mensagem para todos os usuários
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Mensagem</Label>
                        <Input
                            placeholder="Ex: Sistema será atualizado às 22h..."
                            value={config.globalNotification}
                            onChange={(e) =>
                                handleConfigChange("globalNotification", e.target.value)
                            }
                        />
                    </div>
                    {config.globalNotification && (
                        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                            <p className="text-sm">
                                <strong>Preview:</strong> {config.globalNotification}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end gap-4">
                <Button variant="outline">
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Resetar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                        <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar Configurações
                </Button>
            </div>
        </div>
    );
}
