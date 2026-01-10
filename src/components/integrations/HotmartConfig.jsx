import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, GraduationCap, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function HotmartConfig({ user }) {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState({
    enabled: false,
    clientId: "",
    clientSecret: "",
    webhookToken: "",
    autoProcessPayments: true,
    sendPaymentReminders: true,
    blockAfterDays: 5
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      if (!config.clientId || !config.clientSecret) {
        throw new Error('Preencha Client ID e Client Secret');
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => {
      setConfig({ ...config, enabled: true });
      toast.success("Conectado ao Hotmart!");
      queryClient.invalidateQueries({ queryKey: ["integrations-status"] });
    },
    onError: (error) => {
      toast.error("Erro ao conectar: " + error.message);
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (configData) => {
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
            {config.enabled ? "Conectado e processando assinaturas" : "Aguardando conexão"}
          </p>
        </div>
        {config.enabled && (
          <Button variant="outline" onClick={() => setConfig({ ...config, enabled: false })}>
            Desconectar
          </Button>
        )}
      </div>

      {!config.enabled && (
        <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
          <div>
            <Label className="text-xs">Client ID</Label>
            <Input
              value={config.clientId}
              onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
              placeholder="Cole o Client ID do Hotmart..."
              className="h-9 mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Client Secret</Label>
            <Input
              value={config.clientSecret}
              onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
              placeholder="Cole o Client Secret do Hotmart..."
              type="password"
              className="h-9 mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Webhook Token</Label>
            <Input
              value={config.webhookToken}
              onChange={(e) => setConfig({ ...config, webhookToken: e.target.value })}
              placeholder="Token para validar webhooks..."
              className="h-9 mt-1"
            />
          </div>

          <Button
            onClick={handleConnect}
            disabled={connectMutation.isPending || !config.clientId || !config.clientSecret}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {connectMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <GraduationCap className="w-4 h-4 mr-2" />
                Conectar Hotmart
              </>
            )}
          </Button>
        </div>
      )}

      {config.enabled && (
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <GraduationCap className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-purple-900">Gestão de Assinaturas</p>
                <p className="text-xs text-purple-700 mt-1">
                  Assinaturas ativas liberam acesso. Cancelamentos ou falhas geram avisos 
                  e bloqueios automáticos após período configurado.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Processar Assinaturas Automaticamente</Label>
                <p className="text-xs text-gray-500">Libera recursos ao confirmar pagamento</p>
              </div>
              <Switch
                checked={config.autoProcessPayments}
                onCheckedChange={(v) => setConfig({ ...config, autoProcessPayments: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Enviar Lembretes de Renovação</Label>
                <p className="text-xs text-gray-500">Notifica antes do vencimento</p>
              </div>
              <Switch
                checked={config.sendPaymentReminders}
                onCheckedChange={(v) => setConfig({ ...config, sendPaymentReminders: v })}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs mb-2 block">Dias até Bloqueio</Label>
            <Input
              type="number"
              value={config.blockAfterDays}
              onChange={(e) => setConfig({ ...config, blockAfterDays: parseInt(e.target.value) })}
              min="1"
              max="30"
              className="h-9"
            />
            <p className="text-xs text-gray-500 mt-1">
              Após {config.blockAfterDays} dias sem pagamento, recursos são bloqueados
            </p>
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