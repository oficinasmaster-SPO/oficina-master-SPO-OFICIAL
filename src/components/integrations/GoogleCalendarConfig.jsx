import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar, CheckCircle, AlertCircle, RefreshCw, Settings, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function GoogleCalendarConfig() {
  const [testing, setTesting] = useState(false);
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['google-calendar-config'],
    queryFn: async () => {
      try {
        const settings = await base44.entities.SystemSetting.filter({ key: 'google_calendar_sync' });
        return settings[0]?.value || {
          enabled: false,
          sync_bidirectional: true,
          auto_create_meet: true,
          calendar_id: 'primary'
        };
      } catch {
        return {
          enabled: false,
          sync_bidirectional: true,
          auto_create_meet: true,
          calendar_id: 'primary'
        };
      }
    }
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (newConfig) => {
      const settings = await base44.entities.SystemSetting.filter({ key: 'google_calendar_sync' });
      if (settings.length > 0) {
        return await base44.entities.SystemSetting.update(settings[0].id, {
          value: newConfig
        });
      } else {
        return await base44.entities.SystemSetting.create({
          key: 'google_calendar_sync',
          value: newConfig
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['google-calendar-config']);
      toast.success('Configurações salvas!');
    },
    onError: (error) => {
      toast.error('Erro ao salvar: ' + error.message);
    }
  });

  const syncNowMutation = useMutation({
    mutationFn: async () => {
      return await base44.functions.invoke('syncGoogleCalendar', {
        force: true
      });
    },
    onSuccess: (response) => {
      toast.success(`Sincronizado! ${response.data.synced_count} eventos`);
    },
    onError: (error) => {
      toast.error('Erro na sincronização: ' + error.message);
    }
  });

  const testConnection = async () => {
    setTesting(true);
    try {
      const response = await base44.functions.invoke('testGoogleCalendarConnection');
      if (response.data.success) {
        toast.success('Conexão OK! Calendar: ' + response.data.calendar_name);
      } else {
        toast.error('Falha na conexão');
      }
    } catch (error) {
      toast.error('Erro: ' + error.message);
    } finally {
      setTesting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <CardTitle>Google Calendar</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Sincronize atendimentos automaticamente</p>
            </div>
          </div>
          <Badge variant={config?.enabled ? "default" : "secondary"} className={config?.enabled ? "bg-green-600" : ""}>
            {config?.enabled ? (
              <>
                <CheckCircle className="w-3 h-3 mr-1" />
                Ativo
              </>
            ) : (
              "Inativo"
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ativar/Desativar */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <Label className="text-base font-semibold">Ativar Sincronização</Label>
            <p className="text-sm text-gray-600">Sincronizar atendimentos com Google Calendar</p>
          </div>
          <Switch
            checked={config?.enabled || false}
            onCheckedChange={(checked) => {
              updateConfigMutation.mutate({ ...config, enabled: checked });
            }}
          />
        </div>

        {/* Sincronização Bidirecional */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <Label className="text-base font-semibold">Sincronização Bidirecional</Label>
            <p className="text-sm text-gray-600">Importar eventos do Calendar para a plataforma</p>
          </div>
          <Switch
            checked={config?.sync_bidirectional || false}
            onCheckedChange={(checked) => {
              updateConfigMutation.mutate({ ...config, sync_bidirectional: checked });
            }}
            disabled={!config?.enabled}
          />
        </div>

        {/* Auto-criar Google Meet */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <Label className="text-base font-semibold">Criar Google Meet Automaticamente</Label>
            <p className="text-sm text-gray-600">Gerar links ao criar atendimentos</p>
          </div>
          <Switch
            checked={config?.auto_create_meet || false}
            onCheckedChange={(checked) => {
              updateConfigMutation.mutate({ ...config, auto_create_meet: checked });
            }}
            disabled={!config?.enabled}
          />
        </div>

        {/* Ações */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            className="flex-1"
            onClick={testConnection}
            disabled={testing}
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <Settings className="w-4 h-4 mr-2" />
                Testar Conexão
              </>
            )}
          </Button>
          <Button
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            onClick={() => syncNowMutation.mutate()}
            disabled={!config?.enabled || syncNowMutation.isPending}
          >
            {syncNowMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sincronizar Agora
              </>
            )}
          </Button>
        </div>

        {/* Info */}
        <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700">
          <p className="font-semibold mb-2">Como funciona:</p>
          <ul className="space-y-1 text-xs">
            <li>• Atendimentos criados aqui → eventos no Google Calendar</li>
            <li>• Atualizar/deletar atendimento → sincroniza automaticamente</li>
            <li>• Sincronização bidirecional importa eventos do Calendar</li>
            <li>• Google Meet é criado automaticamente com convidados</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}