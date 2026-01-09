import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function NotificationPreferences({ user }) {
  const queryClient = useQueryClient();

  const { data: preferencias, isLoading } = useQuery({
    queryKey: ['preferencias-notificacao', user?.id],
    queryFn: async () => {
      const prefs = await base44.entities.Notification.filter({
        user_id: user.id,
        type: 'config_preferencias'
      });
      return prefs[0] || null;
    },
    enabled: !!user
  });

  const [config, setConfig] = useState({
    notificar_prazos: true,
    notificar_conclusoes: true,
    notificar_atas: true,
    notificar_atrasados: true,
    email_enabled: false
  });

  React.useEffect(() => {
    if (preferencias?.metadata) {
      setConfig(preferencias.metadata);
    }
  }, [preferencias]);

  const saveMutation = useMutation({
    mutationFn: async (novasPrefs) => {
      if (preferencias?.id) {
        return await base44.entities.Notification.update(preferencias.id, {
          metadata: novasPrefs
        });
      } else {
        return await base44.entities.Notification.create({
          user_id: user.id,
          type: 'config_preferencias',
          title: 'Preferências de Notificação',
          message: 'Configurações do usuário',
          is_read: true,
          metadata: novasPrefs
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['preferencias-notificacao']);
      toast.success('Preferências salvas!');
    },
    onError: () => {
      toast.error('Erro ao salvar preferências');
    }
  });

  const handleToggle = (key) => {
    setConfig({ ...config, [key]: !config[key] });
  };

  const handleSave = () => {
    saveMutation.mutate(config);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Preferências de Notificação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Prazos Próximos</Label>
              <p className="text-sm text-gray-500">
                Notificar quando processos estiverem próximos do prazo
              </p>
            </div>
            <Switch
              checked={config.notificar_prazos}
              onCheckedChange={() => handleToggle('notificar_prazos')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Processos Atrasados</Label>
              <p className="text-sm text-gray-500">
                Alertas sobre processos que passaram do prazo
              </p>
            </div>
            <Switch
              checked={config.notificar_atrasados}
              onCheckedChange={() => handleToggle('notificar_atrasados')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Conclusões de Processos</Label>
              <p className="text-sm text-gray-500">
                Notificar quando outros usuários concluírem processos
              </p>
            </div>
            <Switch
              checked={config.notificar_conclusoes}
              onCheckedChange={() => handleToggle('notificar_conclusoes')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Novas ATAs</Label>
              <p className="text-sm text-gray-500">
                Alertas sobre ATAs geradas ou atualizações importantes
              </p>
            </div>
            <Switch
              checked={config.notificar_atas}
              onCheckedChange={() => handleToggle('notificar_atas')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Notificações por Email</Label>
              <p className="text-sm text-gray-500">
                Receber notificações importantes por email
              </p>
            </div>
            <Switch
              checked={config.email_enabled}
              onCheckedChange={() => handleToggle('email_enabled')}
            />
          </div>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={saveMutation.isPending}
          className="w-full"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Preferências'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}