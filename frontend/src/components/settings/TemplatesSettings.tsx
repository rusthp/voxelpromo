import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/components/ui/use-toast';
import { MessageTemplate, TemplateTone } from '@/types/settings';
import { Loader2, Plus, Pencil, Trash2, Check, RefreshCw, FileText, Play } from 'lucide-react';
import api from '@/services/api';
import { HelpTip } from '@/components/ui/help-tip';

// Default template examples for each tone
const DEFAULT_TEMPLATES: Record<TemplateTone, { name: string; content: string }> = {
    casual: {
        name: 'Template Casual',
        content: `Gente, olha o que eu achei! 😱

{title} tá com um preço surreal hoje!

Tava {originalPrice}, mas agora tá saindo por só <b>{price}</b>!
Isso é {discountPercent} de desconto! 🤯

Aproveita aqui: {link}

Corre que o estoque voa! 🏃‍♀️`
    },
    professional: {
        name: 'Template Profissional',
        content: `📊 <b>Oportunidade de Economia</b>

<b>{title}</b>

Preço original: {originalPrice}
Preço promocional: <b>{price}</b>
Economia: {discountPercent}

✅ Produto verificado
✅ Entrega garantida

Acesse: {link}

#Economia #Promoção`
    },
    urgent: {
        name: 'Template Urgente',
        content: `⚠️ <b>ÚLTIMAS UNIDADES!</b> ⚠️

🔥 {title}

❌ Era: {originalPrice}
✅ Agora: <b>{price}</b>
📉 {discountPercent} OFF

⏰ OFERTA POR TEMPO LIMITADO!

👉 COMPRAR AGORA: {link}

🚨 Não perca! Estoque acabando!`
    },
    viral: {
        name: 'Template Viral',
        content: `🚨 <b>IMPERDÍVEL! BAIXOU MUITO!</b> 🚨

📦 <b>{title}</b>

🔥 De: <del>{originalPrice}</del>
💰 <b>Por: {price}</b>
📉 <b>{discountPercent} OFF</b>

💳 <i>Pagamento seguro</i>

🏃‍♂️ Corra antes que acabe:
👉 {link}

#Ofertas #Promoção`
    },
    storytelling: {
        name: 'Template História',
        content: `📖 Deixa eu te contar uma coisa...

Eu estava navegando hoje e encontrei algo que precisei compartilhar com vocês.

<b>{title}</b>

Sabe aquele produto que você fica de olho esperando baixar? Pois é, baixou! 🎉

De {originalPrice} para apenas <b>{price}</b> – são {discountPercent} de desconto real.

Não sei até quando vai durar, mas se você estava esperando o momento certo... é agora.

👉 {link}

#Dica #Oportunidade`
    }
};

export const TemplatesSettings: React.FC = () => {
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const { toast } = useToast();

    // Dialog states
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);

    // Form states
    const [formData, setFormData] = useState<Partial<MessageTemplate>>({
        name: '',
        tone: 'casual',
        content: '',
        isActive: true,
        isDefault: false,
    });

    // Test Dialog states
    const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
    const [testResult, setTestResult] = useState<{ rendered: string, offer: any } | null>(null);
    const [testingTemplateId, setTestingTemplateId] = useState<string | null>(null);

    // Handle tone change - auto-fill with default template for that tone
    const handleToneChange = (newTone: TemplateTone) => {
        // Only auto-fill if creating new template (not editing)
        if (!editingTemplate) {
            const defaultTemplate = DEFAULT_TEMPLATES[newTone];
            setFormData({
                ...formData,
                tone: newTone,
                name: formData.name || defaultTemplate.name,
                content: defaultTemplate.content,
            });
        } else {
            setFormData({ ...formData, tone: newTone });
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/templates');
            setTemplates(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching templates:', error);
            toast({
                title: 'Error',
                description: 'Failed to load templates',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleInitializeDefaults = async () => {
        setActionLoading(true);
        try {
            await api.post('/templates/init');
            toast({
                title: 'Success',
                description: 'Default templates initialized successfully',
            });
            fetchTemplates();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to initialize default templates',
                variant: 'destructive',
            });
        } finally {
            setActionLoading(false);
        }
    };

    const handleOpenDialog = (template?: MessageTemplate) => {
        if (template) {
            setEditingTemplate(template);
            setFormData({
                name: template.name,
                tone: template.tone,
                content: template.content,
                isActive: template.isActive,
                isDefault: template.isDefault,
            });
        } else {
            setEditingTemplate(null);
            const defaultTone: TemplateTone = 'casual';
            const defaultTemplate = DEFAULT_TEMPLATES[defaultTone];
            setFormData({
                name: defaultTemplate.name,
                tone: defaultTone,
                content: defaultTemplate.content,
                isActive: true,
                isDefault: false,
            });
        }
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.content) {
            toast({
                title: 'Validation Error',
                description: 'Name and Content are required',
                variant: 'destructive',
            });
            return;
        }

        setActionLoading(true);
        try {
            const url = editingTemplate
                ? `/templates/${editingTemplate._id}`
                : '/templates';

            if (editingTemplate) {
                await api.put(url, formData);
            } else {
                await api.post(url, formData);
            }

            toast({
                title: 'Success',
                description: `Template ${editingTemplate ? 'updated' : 'created'} successfully`,
            });
            setIsDialogOpen(false);
            fetchTemplates();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to save template',
                variant: 'destructive',
            });
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        setActionLoading(true);
        try {
            await api.delete(`/templates/${id}`);
            toast({
                title: 'Success',
                description: 'Template deleted successfully',
            });
            fetchTemplates();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete template',
                variant: 'destructive',
            });
        } finally {
            setActionLoading(false);
        }
    };

    const handleSetDefault = async (template: MessageTemplate) => {
        if (template.isDefault) return; // Already default

        setActionLoading(true);
        try {
            // First update this one to default
            await api.put(`/templates/${template._id}`, { ...template, isDefault: true });

            toast({
                title: 'Success',
                description: 'Default template updated',
            });
            fetchTemplates();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to set default template',
                variant: 'destructive',
            });
        } finally {
            setActionLoading(false);
        }
    };

    const handleTest = async (id: string) => {
        setTestingTemplateId(id);
        setTestResult(null); // Clear previous result
        setIsTestDialogOpen(true);

        try {
            const { data } = await api.post(`/templates/${id}/test`, {});
            setTestResult(data);
        } catch (error: any) {
            toast({
                title: 'Test Failed',
                description: error.response?.data?.error || error.message || 'Could not test template',
                variant: 'destructive',
            });
            setIsTestDialogOpen(false);
        } finally {
            setTestingTemplateId(null);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Message Templates</CardTitle>
                        <CardDescription>
                            Manage templates for AI fallback and automation.
                            One template must be set as Default.
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleInitializeDefaults} disabled={actionLoading}>
                            <RefreshCw className={`mr-2 h-4 w-4 ${actionLoading ? 'animate-spin' : ''}`} />
                            Reset Defaults
                        </Button>
                        <Button onClick={() => handleOpenDialog()} disabled={actionLoading}>
                            <Plus className="mr-2 h-4 w-4" />
                            New Template
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <HelpTip
                        id="templates-settings"
                        title="📝 O que são templates?"
                        description="Templates definem como suas ofertas aparecem no Telegram/WhatsApp. Escolha o tom que combina com seu público."
                    />
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">
                            No templates found. Click "Reset Defaults" to get started.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Tone</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {templates.map((template) => (
                                    <TableRow key={template._id}>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span>{template.name}</span>
                                                {template.isDefault && (
                                                    <Badge variant="secondary" className="w-fit mt-1 text-xs">Default</Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{template.tone}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {template.isActive ? (
                                                <div className="flex items-center text-green-500 text-sm">
                                                    <Check className="mr-1 h-3 w-3" /> Active
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">Inactive</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Test Template"
                                                    onClick={() => handleTest(template._id)}
                                                >
                                                    <Play className="h-4 w-4" />
                                                </Button>
                                                {!template.isDefault && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        title="Set as Default"
                                                        onClick={() => handleSetDefault(template)}
                                                    >
                                                        Set Default
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleOpenDialog(template)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>

                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="text-destructive">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Are you sure you want to delete "{template.name}"? This action cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(template._id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>

                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Edit/Create Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingTemplate ? 'Edit Template' : 'New Template'}</DialogTitle>
                        <DialogDescription>
                            Configure the message template. Use variables like {'{title}'}, {'{price}'}, {'{link}'}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Standard Viral Post"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tone">Tone</Label>
                                <Select
                                    value={formData.tone}
                                    onValueChange={(value: TemplateTone) => handleToneChange(value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select tone" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="casual">Casual</SelectItem>
                                        <SelectItem value="professional">Profissional</SelectItem>
                                        <SelectItem value="urgent">Urgente</SelectItem>
                                        <SelectItem value="viral">Viral</SelectItem>
                                        <SelectItem value="storytelling">História</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="content">Template Content</Label>
                            <Textarea
                                id="content"
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                className="h-[300px] font-mono text-sm"
                                placeholder="<b>{title}</b>\n\n💰 {price}\n..."
                            />
                            <p className="text-xs text-muted-foreground">
                                Available variables: {'{title}'}, {'{price}'}, {'{originalPrice}'}, {'{discount}'}, {'{link}'}, {'{category}'}.
                                HTML supported (e.g. &lt;b&gt;bold&lt;/b&gt;).
                            </p>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="isActive"
                                    checked={formData.isActive}
                                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                                />
                                <Label htmlFor="isActive">Active</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="isDefault"
                                    checked={formData.isDefault}
                                    onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                                />
                                <Label htmlFor="isDefault">Default Fallback</Label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={actionLoading}>
                            {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Test Dialog */}
            <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Test Template</DialogTitle>
                        <DialogDescription>
                            Preview how this template looks with a sample offer.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        {testingTemplateId && !testResult ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        ) : testResult ? (
                            <div className="space-y-4">
                                <div className="bg-muted p-4 rounded-md whitespace-pre-wrap font-mono text-sm">
                                    {testResult.rendered}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Tested with offer: <b>{testResult.offer.title}</b> (R$ {testResult.offer.price})
                                </div>
                            </div>
                        ) : null}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setIsTestDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
