import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, Bell, Clock, Save, Play } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

export default function AdminNotificacoes() {
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [settings, setSettings] = useState({
    inactivity_alert_enabled: true,
    inactivity_threshold_days: 7,
    weekly_digest_enabled: true,
    email_enabled: true
  });
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Admin or Owner check - usually admin pages require role='admin' but logic here depends on workshop owner
        // Since sidebar hides it for non-admins (if we set adminOnly: true), we can assume some privilege or check it.
        // For now, logic follows existing pattern: fetch workshop by owner_id.
        
        const workshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
        // If admin looking at system, might be different, but for "My Workshop Settings", it's this.
        // If this is a super-admin page for ALL workshops, that's different.
        // Assuming "tela do administrador" means the Workshop Admin (Owner).
        
        if (workshops.length > 0) {
            const ws = workshops[0];
            setWorkshop(ws);
            if (ws.notification_settings) {
                setSettings({
                    inactivity_alert_enabled: ws.notification_settings.inactivity_alert_enabled !== false,
                    inactivity_threshold_days: ws.notification_settings.inactivity_threshold_days || 7,
                    weekly_digest_enabled: ws.notification_settings.weekly_digest_enabled !== false,
                    email_enabled: ws.notification_settings.email_enabled !== false
                });
            }
        }
    } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Erro ao carregar dados do usuário.");
    } finally {
        setLoadingUser(false);
    }
  };

  const handleSave = async () => {
    if (!workshop) return;
    setSaving(true);
    try {
      const updatedSettings = {
        ...(workshop.notification_settings || {}),
        ...settings
      };

      await base44.entities.Workshop.update(workshop.id, {
        notification_settings: updatedSettings
      });
      
      // Update local state to reflect saved
      setWorkshop(prev => ({ ...prev, notification_settings: updatedSettings }));

      toast.success("Configurações de notificação atualizadas!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const handleRunNow = async () => {
    if (!workshop) return;
    setProcessing(true);
    try {
      const response = await base44.functions.invoke('processActivityEmails', {
        workshop_id: workshop.id,
        is_test_run: true // Solicita um relatório por e-mail para o admin
      });
      
      if (response.data?.success) {
        const stats = response.data.results;
        toast.success(`Teste concluído! Relatório enviado para seu e-mail.`);
        if (stats.emails_sent > 0) {
             toast.info(`${stats.emails_sent} notificações enviadas para colaboradores.`);
        } else {
             toast.info("Nenhum colaborador atendeu aos critérios de inatividade neste momento.");
        }
      } else {
        toast.error("Erro ao processar notificações: " + (response.data?.error || "Erro desconhecido"));
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao executar processamento");
    } finally {
      setProcessing(false);
    }
  };

  if (loadingUser) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      );
  }

  if (!workshop) {
      return (
          <div className="p-8 text-center">
              <h1 className="text-2xl font-bold text-gray-800">Nenhuma oficina encontrada</h1>
              <p className="text-gray-600">Você precisa ter uma oficina cadastrada para gerenciar notificações.</p>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Automação de E-mails</h1>
            <p className="text-gray-600">Gerencie os e-mails automáticos enviados aos colaboradores.</p>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Configurações de Disparo</CardTitle>
                <CardDescription>
                    Defina as regras para envio de notificações de reengajamento e resumos semanais.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                
                {/* Master Switch */}
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex flex-col space-y-1">
                        <Label htmlFor="email-enabled" className="font-bold text-blue-900">Ativar sistema de e-mails</Label>
                        <span className="text-sm text-blue-700">Habilita o envio geral de todas as comunicações automáticas</span>
                    </div>
                    <Switch
                        id="email-enabled"
                        checked={settings.email_enabled}
                        onCheckedChange={(checked) => setSettings({ ...settings, email_enabled: checked })}
                    />
                </div>

                <div className={`space-y-8 transition-opacity ${!settings.email_enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                    {/* Inactivity Section */}
                    <div className="space-y-4">
                        <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2 border-b pb-2">
                            <Clock className="w-5 h-5 text-gray-500" /> Alertas de Inatividade
                        </h4>
                        
                        <div className="grid gap-6 pl-2">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col space-y-1">
                                    <Label htmlFor="inactivity-enabled" className="font-medium">Notificar colaboradores inativos</Label>
                                    <span className="text-sm text-gray-500">Envia e-mail de reengajamento convidando a voltar para a plataforma</span>
                                </div>
                                <Switch
                                    id="inactivity-enabled"
                                    checked={settings.inactivity_alert_enabled}
                                    onCheckedChange={(checked) => setSettings({ ...settings, inactivity_alert_enabled: checked })}
                                />
                            </div>

                            {settings.inactivity_alert_enabled && (
                                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-md">
                                    <Label htmlFor="days" className="whitespace-nowrap font-medium">Considerar inativo após:</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="days"
                                            type="number"
                                            min="1"
                                            max="90"
                                            className="w-24 text-center"
                                            value={settings.inactivity_threshold_days}
                                            onChange={(e) => setSettings({ ...settings, inactivity_threshold_days: parseInt(e.target.value) })}
                                        />
                                        <span className="text-sm text-gray-500">dias sem acesso</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Weekly Digest Section */}
                    <div className="space-y-4">
                        <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2 border-b pb-2">
                            <Mail className="w-5 h-5 text-gray-500" /> Resumo Semanal
                        </h4>
                        
                        <div className="flex items-center justify-between pl-2">
                            <div className="flex flex-col space-y-1">
                                <Label htmlFor="digest-enabled" className="font-medium">Enviar resumo semanal</Label>
                                <span className="text-sm text-gray-500">Envia toda segunda-feira um e-mail com pendências e progresso para usuários ativos</span>
                            </div>
                            <Switch
                                id="digest-enabled"
                                checked={settings.weekly_digest_enabled}
                                onCheckedChange={(checked) => setSettings({ ...settings, weekly_digest_enabled: checked })}
                            />
                        </div>
                    </div>
                </div>

            </CardContent>
            <CardFooter className="flex justify-between bg-gray-50 p-6 rounded-b-lg border-t">
                <Button 
                    variant="outline" 
                    onClick={handleRunNow}
                    disabled={processing || !settings.email_enabled}
                    className="text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50"
                >
                    {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                    Testar Disparo Agora
                </Button>

                <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 px-8">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Salvar Alterações
                </Button>
            </CardFooter>
        </Card>
      </div>
    </div>
  );
}
