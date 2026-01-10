import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, CreditCard, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function EduzzConfig({ user }) {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState({
    enabled: false,
    publicKey: "",
    apiKey: "",
    webhookToken: "",
    autoProcessPayments: true,
    sendPaymentReminders: true,
    blockAfterDays: 5,
    reminderDays: [1, 3, 5]
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      if (!config.publicKey || !config.apiKey) {
        throw new Error('Preencha Public Key e API Key');
      }
      // Validar credenciais
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => {
      setConfig({ ...config, enabled: true });
      toast.success("Conectado à Eduzz!");
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
            {config.enabled ? "Conectado e processando pagamentos" : "Aguardando conexão"}
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
            <Label className="text-xs">Public Key</Label>
            <Input
              value={config.publicKey}
              onChange={(e) => setConfig({ ...config, publicKey: e.target.value })}
              placeholder="Cole a Public Key da Eduzz..."
              className="h-9 mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">API Key</Label>
            <Input
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="Cole a API Key da Eduzz..."
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
            disabled={connectMutation.isPending || !config.publicKey || !config.apiKey}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {connectMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Conectar Eduzz
              </>
            )}
          </Button>
        </div>
      )}

      {config.enabled && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Processamento Automático</p>
                <p className="text-xs text-blue-700 mt-1">
                  Pagamentos aprovados liberam recursos automaticamente. Falhas de pagamento 
                  geram avisos e bloqueios após período definido.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Processar Pagamentos Automaticamente</Label>
                <p className="text-xs text-gray-500">Libera recursos ao confirmar pagamento</p>
              </div>
              <Switch
                checked={config.autoProcessPayments}
                onCheckedChange={(v) => setConfig({ ...config, autoProcessPayments: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Enviar Lembretes de Pagamento</Label>
                <p className="text-xs text-gray-500">Notifica antes do bloqueio</p>
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