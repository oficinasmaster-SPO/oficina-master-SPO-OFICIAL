import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Settings, Filter, Map, Webhook, Clock, CheckCircle, AlertCircle, Info } from "lucide-react";
import IntegrationSyncLog from "./IntegrationSyncLog";
import IntegrationFieldMapping from "./IntegrationFieldMapping";
import IntegrationFilters from "./IntegrationFilters";
import IntegrationWebhooks from "./IntegrationWebhooks";

export default function IntegrationAdvancedSettings({ integration, onSave }) {
  const [settings, setSettings] = useState({
    syncEnabled: true,
    syncInterval: "15",
    autoSync: true,
    syncDirection: "bidirectional",
    filters: {
      eventTypes: [],
      dateRange: "all",
      consultors: [],
    },
    fieldMapping: [],
    webhooks: [],
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(settings);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Configurações Avançadas - {integration?.name}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure regras de sincronização, filtros e webhooks
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>

      {/* Status da Integração */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${integration?.status === 'connected' ? 'bg-green-50' : 'bg-gray-50'}`}>
                {integration?.status === 'connected' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-gray-600" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  Status: {integration?.status === 'connected' ? 'Conectado' : 'Desconectado'}
                </p>
                <p className="text-sm text-gray-600">
                  Última sincronização: {integration?.lastSync || 'Nunca'}
                </p>
              </div>
            </div>
            <Badge variant={settings.syncEnabled ? "default" : "secondary"}>
              {settings.syncEnabled ? 'Sincronização Ativa' : 'Sincronização Pausada'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tabs de Configuração */}
      <Tabs defaultValue="sync" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="sync" className="gap-2">
            <Settings className="w-4 h-4" />
            Sincronização
          </TabsTrigger>
          <TabsTrigger value="filters" className="gap-2">
            <Filter className="w-4 h-4" />
            Filtros
          </TabsTrigger>
          <TabsTrigger value="mapping" className="gap-2">
            <Map className="w-4 h-4" />
            Mapeamento
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-2">
            <Webhook className="w-4 h-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Clock className="w-4 h-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        {/* Sincronização */}
        <TabsContent value="sync" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Regras de Sincronização</CardTitle>
              <CardDescription>
                Configure como e quando os dados devem ser sincronizados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sincronização Automática</Label>
                  <p className="text-sm text-gray-600">
                    Sincronizar automaticamente quando houver alterações
                  </p>
                </div>
                <Switch
                  checked={settings.autoSync}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, autoSync: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Intervalo de Sincronização</Label>
                <Select
                  value={settings.syncInterval}
                  onValueChange={(value) =>
                    setSettings({ ...settings, syncInterval: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">A cada 5 minutos</SelectItem>
                    <SelectItem value="15">A cada 15 minutos</SelectItem>
                    <SelectItem value="30">A cada 30 minutos</SelectItem>
                    <SelectItem value="60">A cada 1 hora</SelectItem>
                    <SelectItem value="360">A cada 6 horas</SelectItem>
                    <SelectItem value="1440">A cada 24 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Direção da Sincronização</Label>
                <Select
                  value={settings.syncDirection}
                  onValueChange={(value) =>
                    setSettings({ ...settings, syncDirection: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bidirectional">
                      ↔️ Bidirecional (ambos os lados)
                    </SelectItem>
                    <SelectItem value="import">
                      ⬇️ Importar apenas (da integração para o sistema)
                    </SelectItem>
                    <SelectItem value="export">
                      ⬆️ Exportar apenas (do sistema para a integração)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg flex gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Sobre a Sincronização
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    A sincronização automática ocorre em tempo real quando possível.
                    O intervalo configurado é usado como fallback.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Filtros */}
        <TabsContent value="filters">
          <IntegrationFilters
            integration={integration}
            filters={settings.filters}
            onChange={(filters) => setSettings({ ...settings, filters })}
          />
        </TabsContent>

        {/* Mapeamento */}
        <TabsContent value="mapping">
          <IntegrationFieldMapping
            integration={integration}
            mapping={settings.fieldMapping}
            onChange={(mapping) => setSettings({ ...settings, fieldMapping: mapping })}
          />
        </TabsContent>

        {/* Webhooks */}
        <TabsContent value="webhooks">
          <IntegrationWebhooks
            integration={integration}
            webhooks={settings.webhooks}
            onChange={(webhooks) => setSettings({ ...settings, webhooks })}
          />
        </TabsContent>

        {/* Logs */}
        <TabsContent value="logs">
          <IntegrationSyncLog integration={integration} />
        </TabsContent>
      </Tabs>
    </div>
  );
}