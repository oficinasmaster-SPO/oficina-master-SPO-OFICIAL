import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useNotificationPush } from "./useNotificationPush";

export default function NotificationPreferences({ user }) {
  const { permission, isSupported, requestPermission } = useNotificationPush();
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
    notificar_metas: true,
    notificar_metas_nacionais: true,
    notificar_colaboradores_nacionais: true,
    email_enabled: true
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
        {/* Notificações Push do Sistema */}
        {isSupported && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-blue-900">
                  Notificações Push do Sistema
                </h4>
              </div>
              <Badge 
                className={
                  permission === 'granted' 
                    ? 'bg-green-100 text-green-700' 
                    : permission === 'denied'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700'
                }
              >
                {permission === 'granted' ? 'Ativadas' : permission === 'denied' ? 'Bloqueadas' : 'Desativadas'}
              </Badge>
            </div>
            <p className="text-sm text-blue-800 mb-3">
              Receba alertas nativos no desktop e celular mesmo com o navegador fechado. Ideal para PWA.
            </p>
            {permission !== 'granted' && (
              <Button
                onClick={requestPermission}
                variant="outline"
                size="sm"
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                {permission === 'denied' ? 'Bloqueado pelo navegador' : 'Ativar Notificações Push'}
              </Button>
            )}
            {permission === 'denied' && (
              <p className="text-xs text-red-600 mt-2">
                Para ativar, vá nas configurações do navegador e permita notificações para este site.
              </p>
            )}
          </div>
        )}
        
        {/* Preferências existentes */}
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
              <Label className="text-base font-medium">Metas Batidas</Label>
              <p className="text-sm text-gray-500">
                Alertas quando sua oficina bater metas (faturamento, ticket médio, R70/I30, TCMP2)
              </p>
            </div>
            <Switch
              checked={config.notificar_metas}
              onCheckedChange={() => handleToggle('notificar_metas')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Conquistas Nacionais - Empresas</Label>
              <p className="text-sm text-gray-500">
                Ver quando outras oficinas do Brasil batem suas metas
              </p>
            </div>
            <Switch
              checked={config.notificar_metas_nacionais}
              onCheckedChange={() => handleToggle('notificar_metas_nacionais')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Conquistas Nacionais - Colaboradores</Label>
              <p className="text-sm text-gray-500">
                Ver quando colaboradores (vendedores, técnicos) de outras oficinas batem metas
              </p>
            </div>
            <Switch
              checked={config.notificar_colaboradores_nacionais}
              onCheckedChange={() => handleToggle('notificar_colaboradores_nacionais')}
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