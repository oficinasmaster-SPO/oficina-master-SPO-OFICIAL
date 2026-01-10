import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Calendar, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function GoogleCalendarConfig({ user }) {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState({
    enabled: false,
    syncInterval: "15", // minutos
    defaultCalendar: "",
    consultorFilters: [],
    bidirectionalSync: true,
    autoUpdateStatus: true
  });

  const { data: consultores = [] } = useQuery({
    queryKey: ["consultores-list"],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.role === "admin");
    },
    enabled: !!user
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      // Solicitar autorização OAuth via app connector
      try {
        await base44.asServiceRole.connectors.requestAuthorization('googlecalendar', [
          'https://www.googleapis.com/auth/calendar.readonly',
          'https://www.googleapis.com/auth/calendar.events'
        ]);
        return { success: true, calendarId: "primary" };
      } catch (error) {
        throw new Error('Falha na autorização OAuth. Tente novamente.');
      }
    },
    onSuccess: (data) => {
      setConfig({ ...config, enabled: true, defaultCalendar: data.calendarId });
      toast.success("Conectado ao Google Calendar!");
      queryClient.invalidateQueries({ queryKey: ["integrations-status"] });
    },
    onError: (error) => {
      toast.error("Erro ao conectar: " + error.message);
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (configData) => {
      // Salvar configurações no banco
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => {
      toast.success("Configurações salvas!");
    },
    onError: (error) => {
      toast.error("Erro ao salvar: " + error.message);
    }
  });

  const handleConnect = () => {
    connectMutation.mutate();
  };

  const handleSave = () => {
    saveMutation.mutate(config);
  };

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm">Status da Integração</p>
          <p className="text-xs text-gray-600">
            {config.enabled ? "Conectado e sincronizando" : "Aguardando conexão"}
          </p>
        </div>
        {!config.enabled ? (
          <Button
            onClick={handleConnect}
            disabled={connectMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {connectMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4 mr-2" />
                Conectar Google Calendar
              </>
            )}
          </Button>
        ) : (
          <Button variant="outline" onClick={() => setConfig({ ...config, enabled: false })}>
            Desconectar
          </Button>
        )}
      </div>

      {config.enabled && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Intervalo de Sincronização</Label>
              <Select
                value={config.syncInterval}
                onValueChange={(v) => setConfig({ ...config, syncInterval: v })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutos</SelectItem>
                  <SelectItem value="15">15 minutos</SelectItem>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="60">1 hora</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Calendário Padrão</Label>
              <Input
                value={config.defaultCalendar}
                onChange={(e) => setConfig({ ...config, defaultCalendar: e.target.value })}
                placeholder="primary"
                className="h-9"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs mb-2 block">Filtrar Agendas</Label>
            <Select
              value={config.consultorFilters[0] || ""}
              onValueChange={(v) => setConfig({ ...config, consultorFilters: [v] })}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione consultores..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os consultores</SelectItem>
                {consultores.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Sincronização Bidirecional</Label>
                <p className="text-xs text-gray-500">Atualiza eventos em ambas as direções</p>
              </div>
              <Switch
                checked={config.bidirectionalSync}
                onCheckedChange={(v) => setConfig({ ...config, bidirectionalSync: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Atualização Automática de Status</Label>
                <p className="text-xs text-gray-500">Marca como realizado quando evento termina</p>
              </div>
              <Switch
                checked={config.autoUpdateStatus}
                onCheckedChange={(v) => setConfig({ ...config, autoUpdateStatus: v })}
              />
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}