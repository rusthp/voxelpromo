import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersTable } from "@/components/admin/UsersTable";
import { AuditLogsTable } from "@/components/admin/AuditLogsTable";
import { DashboardStats } from "@/components/admin/DashboardStats";
import { SubscriptionsTable } from "@/components/admin/SubscriptionsTable";
import { SystemHealth } from "@/components/admin/SystemHealth";
import { GlobalSettings } from "@/components/admin/GlobalSettings";
import { NewsList } from "@/components/admin/news/NewsList";
import { VectorizerManage } from "@/components/admin/VectorizerManage";
import { Shield, Key, FileText, Activity, CreditCard, Server, Settings, Megaphone, DollarSign, BrainCircuit } from "lucide-react";
import { Layout } from "@/components/layout/Layout";

import { FinancialReports } from "@/components/admin/FinancialReports";

const Admin = () => {
    const [activeTab, setActiveTab] = useState("dashboard");

    return (
        <Layout>
            <div className="container py-6 space-y-8 animate-in fade-in duration-500">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard (Cockpit)</h1>
                        <p className="text-muted-foreground mt-2">
                            Visão operacional e controle total do sistema VoxelPromo.
                        </p>
                    </div>
                </div>

                <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList className="flex flex-wrap gap-2 h-auto p-2">
                        <TabsTrigger value="dashboard" className="flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            Visão Geral
                        </TabsTrigger>
                        <TabsTrigger value="finance" className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Financeiro
                        </TabsTrigger>
                        <TabsTrigger value="subscriptions" className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Assinaturas
                        </TabsTrigger>
                        <TabsTrigger value="users" className="flex items-center gap-2">
                            <Key className="h-4 w-4" />
                            Usuários
                        </TabsTrigger>
                        <TabsTrigger value="system" className="flex items-center gap-2">
                            <Server className="h-4 w-4" />
                            Sistema
                        </TabsTrigger>
                        <TabsTrigger value="vectors" className="flex items-center gap-2">
                            <BrainCircuit className="h-4 w-4" />
                            IA & Vetores
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            Configurações
                        </TabsTrigger>
                        <TabsTrigger value="logs" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Audit Logs
                        </TabsTrigger>
                        <TabsTrigger value="news" className="flex items-center gap-2">
                            <Megaphone className="h-4 w-4" />
                            Novidades
                        </TabsTrigger>
                    </TabsList>

                    {/* Tab: Dashboard */}
                    <TabsContent value="dashboard" className="space-y-4">
                        <DashboardStats />
                    </TabsContent>

                    {/* Tab: Finance */}
                    <TabsContent value="finance" className="space-y-4">
                        <FinancialReports />
                    </TabsContent>

                    {/* Tab: Subscriptions */}
                    <TabsContent value="subscriptions" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Gerenciamento de Assinaturas</CardTitle>
                                <CardDescription>
                                    Visualize todas as assinaturas, status de pagamentos e gerencie planos.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <SubscriptionsTable />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab: Users */}
                    <TabsContent value="users" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Gerenciamento de Usuários</CardTitle>
                                <CardDescription>
                                    Visualize usuários, altere funções (Admin/User) e verifique status.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <UsersTable />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab: System Health */}
                    <TabsContent value="system" className="space-y-4">
                        <SystemHealth />
                    </TabsContent>

                    {/* Tab: Vectorizer / AI */}
                    <TabsContent value="vectors" className="space-y-4">
                        <VectorizerManage />
                    </TabsContent>

                    {/* Tab: Global Settings */}
                    <TabsContent value="settings" className="space-y-4">
                        <GlobalSettings />
                    </TabsContent>

                    {/* Tab: Audit Logs */}
                    <TabsContent value="logs" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Logs de Auditoria</CardTitle>
                                <CardDescription>
                                    Rastreamento completo de ações no sistema para segurança e compliance.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <AuditLogsTable />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab: News */}
                    <TabsContent value="news" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Gerenciamento de Novidades</CardTitle>
                                <CardDescription>
                                    Publique atualizações, correções e anúncios para os usuários.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <NewsList />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs >
            </div >
        </Layout >
    );
};

export default Admin;
