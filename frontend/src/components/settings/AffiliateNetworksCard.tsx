import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, TestTube2, Link, Globe } from "lucide-react";
import { ConfigState } from "@/types/settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AffiliateNetworksCardProps {
    config: ConfigState;
    setConfig: React.Dispatch<React.SetStateAction<ConfigState>>;
    testing: string | null;
    onTest: (service: string) => void;
}

export function AffiliateNetworksCard({
    config,
    setConfig,
    testing,
    onTest,
}: AffiliateNetworksCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-purple-500" />
                    Redes de Afiliados
                </CardTitle>
                <CardDescription>Configure suas redes de afiliados: Awin, Lomadee, Afilio e Rakuten</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="awin" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="awin">Awin</TabsTrigger>
                        <TabsTrigger value="lomadee">Lomadee</TabsTrigger>
                        <TabsTrigger value="afilio">Afilio</TabsTrigger>
                        <TabsTrigger value="rakuten">Rakuten</TabsTrigger>
                    </TabsList>

                    {/* AWIN */}
                    <TabsContent value="awin" className="space-y-4 mt-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Link className="w-5 h-5 text-blue-500" />
                                <span className="font-medium">Awin</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <Switch
                                    checked={config.awin?.enabled || false}
                                    onCheckedChange={(checked) =>
                                        setConfig({ ...config, awin: { ...config.awin!, enabled: checked } })
                                    }
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onTest('awin')}
                                    disabled={testing === 'awin'}
                                >
                                    {testing === 'awin' ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube2 className="w-4 h-4" />}
                                    Testar
                                </Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>API Token</Label>
                                <Input
                                    type="password"
                                    placeholder="Token da API Awin"
                                    value={config.awin?.apiToken || ''}
                                    onChange={(e) =>
                                        setConfig({ ...config, awin: { ...config.awin!, apiToken: e.target.value } })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Publisher ID</Label>
                                <Input
                                    placeholder="ID do Publisher"
                                    value={config.awin?.publisherId || ''}
                                    onChange={(e) =>
                                        setConfig({ ...config, awin: { ...config.awin!, publisherId: e.target.value } })
                                    }
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label>Data Feed API Key</Label>
                                <Input
                                    type="password"
                                    placeholder="Chave do Product Data Feed"
                                    value={config.awin?.dataFeedApiKey || ''}
                                    onChange={(e) =>
                                        setConfig({ ...config, awin: { ...config.awin!, dataFeedApiKey: e.target.value } })
                                    }
                                />
                            </div>
                        </div>
                    </TabsContent>

                    {/* LOMADEE */}
                    <TabsContent value="lomadee" className="space-y-4 mt-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Link className="w-5 h-5 text-green-500" />
                                <span className="font-medium">Lomadee</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <Switch
                                    checked={config.lomadee?.enabled || false}
                                    onCheckedChange={(checked) =>
                                        setConfig({ ...config, lomadee: { ...config.lomadee!, enabled: checked } })
                                    }
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onTest('lomadee')}
                                    disabled={testing === 'lomadee'}
                                >
                                    {testing === 'lomadee' ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube2 className="w-4 h-4" />}
                                    Testar
                                </Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>App Token</Label>
                                <Input
                                    type="password"
                                    placeholder="Token do aplicativo Lomadee"
                                    value={config.lomadee?.appToken || ''}
                                    onChange={(e) =>
                                        setConfig({ ...config, lomadee: { ...config.lomadee!, appToken: e.target.value } })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Source ID</Label>
                                <Input
                                    placeholder="ID da fonte de tráfego"
                                    value={config.lomadee?.sourceId || ''}
                                    onChange={(e) =>
                                        setConfig({ ...config, lomadee: { ...config.lomadee!, sourceId: e.target.value } })
                                    }
                                />
                            </div>
                        </div>
                    </TabsContent>

                    {/* AFILIO */}
                    <TabsContent value="afilio" className="space-y-4 mt-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Link className="w-5 h-5 text-orange-500" />
                                <span className="font-medium">Afilio</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <Switch
                                    checked={config.afilio?.enabled || false}
                                    onCheckedChange={(checked) =>
                                        setConfig({ ...config, afilio: { ...config.afilio!, enabled: checked } })
                                    }
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onTest('afilio')}
                                    disabled={testing === 'afilio'}
                                >
                                    {testing === 'afilio' ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube2 className="w-4 h-4" />}
                                    Testar
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>API Token</Label>
                            <Input
                                type="password"
                                placeholder="Token da API Afilio"
                                value={config.afilio?.apiToken || ''}
                                onChange={(e) =>
                                    setConfig({ ...config, afilio: { ...config.afilio!, apiToken: e.target.value } })
                                }
                            />
                        </div>
                    </TabsContent>

                    {/* RAKUTEN */}
                    <TabsContent value="rakuten" className="space-y-4 mt-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Link className="w-5 h-5 text-red-500" />
                                <span className="font-medium">Rakuten</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <Switch
                                    checked={config.rakuten?.enabled || false}
                                    onCheckedChange={(checked) =>
                                        setConfig({ ...config, rakuten: { ...config.rakuten!, enabled: checked } })
                                    }
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onTest('rakuten')}
                                    disabled={testing === 'rakuten'}
                                >
                                    {testing === 'rakuten' ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube2 className="w-4 h-4" />}
                                    Testar
                                </Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Client ID</Label>
                                <Input
                                    placeholder="ID do cliente Rakuten"
                                    value={config.rakuten?.clientId || ''}
                                    onChange={(e) =>
                                        setConfig({ ...config, rakuten: { ...config.rakuten!, clientId: e.target.value } })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Client Secret</Label>
                                <Input
                                    type="password"
                                    placeholder="Secret do cliente"
                                    value={config.rakuten?.clientSecret || ''}
                                    onChange={(e) =>
                                        setConfig({ ...config, rakuten: { ...config.rakuten!, clientSecret: e.target.value } })
                                    }
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label>Site ID (SID)</Label>
                                <Input
                                    placeholder="ID do site"
                                    value={config.rakuten?.sid || ''}
                                    onChange={(e) =>
                                        setConfig({ ...config, rakuten: { ...config.rakuten!, sid: e.target.value } })
                                    }
                                />
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
