import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2, Bell, Mail } from "lucide-react";

export default function NotificationSettingsDialog({ open, onOpenChange, workshop, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    coex_expiration_days: [30, 60, 90],
    email_enabled: true,
    in_app_enabled: true,
  });

  useEffect(() => {
    if (workshop?.notification_settings) {
      setSettings({
        coex_expiration_days: workshop.notification_settings.coex_expiration_days || [30, 60, 90],
        email_enabled: workshop.notification_settings.email_enabled !== false,
        in_app_enabled: workshop.notification_settings.in_app_enabled !== false,
      });
    }
  }, [workshop]);

  const handleDaysChange = (e) => {
    // Parse comma separated string to array of integers
    const val = e.target.value;
    const daysArray = val.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
    setSettings(prev => ({ ...prev, coex_expiration_days: daysArray }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updatedWorkshop = await base44.entities.Workshop.update(workshop.id, {
        notification_settings: settings
      });
      
      if (onUpdate) onUpdate(updatedWorkshop);
      toast.success("Configurações salvas com sucesso!");
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating notification settings:", error);
      toast.error("Erro ao salvar configurações.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configurações de Notificação</DialogTitle>
          <DialogDescription>
            Configure quando e como você deseja ser notificado sobre vencimentos de contratos COEX.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4 text-gray-500" />
              <Label htmlFor="in-app" className="flex flex-col space-y-1">
                <span>Notificações no App</span>
                <span className="font-normal text-xs text-muted-foreground">Receber alertas no sistema</span>
              </Label>
            </div>
            <Switch
              id="in-app"
              checked={settings.in_app_enabled}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, in_app_enabled: checked }))}
            />
          </div>
          
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-gray-500" />
              <Label htmlFor="email" className="flex flex-col space-y-1">
                <span>Notificações por E-mail</span>
                <span className="font-normal text-xs text-muted-foreground">Receber alertas no e-mail cadastrado</span>
              </Label>
            </div>
            <Switch
              id="email"
              checked={settings.email_enabled}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, email_enabled: checked }))}
            />
          </div>

          <div className="space-y-2 mt-2">
            <Label htmlFor="days">Dias de Antecedência</Label>
            <Input
              id="days"
              value={settings.coex_expiration_days.join(', ')}
              onChange={handleDaysChange}
              placeholder="Ex: 30, 60, 90"
            />
            <p className="text-xs text-muted-foreground">
              Informe os dias separados por vírgula (ex: 30, 60, 90) para receber alertas antes do vencimento.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}