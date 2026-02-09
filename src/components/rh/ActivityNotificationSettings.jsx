import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, Bell, Clock } from "lucide-react";
import { toast } from "sonner";

export default function ActivityNotificationSettings({ open, onOpenChange, workshop }) {
  const [settings, setSettings] = useState({
    inactivity_alert_enabled: true,
    inactivity_threshold_days: 7,
    weekly_digest_enabled: true,
    email_enabled: true
  });
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (workshop?.notification_settings) {
      setSettings({
        inactivity_alert_enabled: workshop.notification_settings.inactivity_alert_enabled !== false,
        inactivity_threshold_days: workshop.notification_settings.inactivity_threshold_days || 7,
        weekly_digest_enabled: workshop.notification_settings.weekly_digest_enabled !== false,
        email_enabled: workshop.notification_settings.email_enabled !== false
      });
    }
  }, [workshop]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const updatedSettings = {
        ...workshop.notification_settings,
        ...settings
      };

      await base44.entities.Workshop.update(workshop.id, {
        notification_settings: updatedSettings
      });

      toast.success("Configurações de notificação atualizadas!");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setLoading(false);
    }
  };

  const handleRunNow = async () => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configurar Notificações de Atividade</DialogTitle>
          <DialogDescription>
            Gerencie os e-mails automáticos enviados aos colaboradores baseados em seu uso da plataforma.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between space-x-2">
            <div className="flex flex-col space-y-1">
              <Label htmlFor="email-enabled" className="font-medium">Ativar envio de e-mails</Label>
              <span className="text-sm text-gray-500">Habilita o envio geral de comunicações por e-mail</span>
            </div>
            <Switch
              id="email-enabled"
              checked={settings.email_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, email_enabled: checked })}
            />
          </div>

          <div className="border-t pt-4 space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Alertas de Inatividade
            </h4>
            
            <div className="flex items-center justify-between space-x-2">
              <div className="flex flex-col space-y-1">
                <Label htmlFor="inactivity-enabled">Notificar inativos</Label>
                <span className="text-sm text-gray-500">Envia e-mail de reengajamento após período sem acesso</span>
              </div>
              <Switch
                id="inactivity-enabled"
                checked={settings.inactivity_alert_enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, inactivity_alert_enabled: checked })}
                disabled={!settings.email_enabled}
              />
            </div>

            {settings.inactivity_alert_enabled && (
              <div className="flex items-center gap-4 pl-4 border-l-2 border-gray-100">
                <Label htmlFor="days" className="whitespace-nowrap">Dias sem acesso:</Label>
                <Input
                  id="days"
                  type="number"
                  min="1"
                  max="90"
                  className="w-20"
                  value={settings.inactivity_threshold_days}
                  onChange={(e) => setSettings({ ...settings, inactivity_threshold_days: parseInt(e.target.value) })}
                />
                <span className="text-sm text-gray-500">para disparar alerta</span>
              </div>
            )}
          </div>

          <div className="border-t pt-4 space-y-4">
             <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Mail className="w-4 h-4" /> Resumo Semanal
            </h4>
            
            <div className="flex items-center justify-between space-x-2">
              <div className="flex flex-col space-y-1">
                <Label htmlFor="digest-enabled">Enviar resumo semanal</Label>
                <span className="text-sm text-gray-500">Envia e-mail com pendências e progresso para usuários ativos</span>
              </div>
              <Switch
                id="digest-enabled"
                checked={settings.weekly_digest_enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, weekly_digest_enabled: checked })}
                disabled={!settings.email_enabled}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
           <Button 
            variant="outline" 
            onClick={handleRunNow}
            disabled={processing || !settings.email_enabled}
            className="mr-auto text-blue-600 hover:text-blue-700"
          >
            {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}
            Testar Agora
          </Button>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Salvar Configurações"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}