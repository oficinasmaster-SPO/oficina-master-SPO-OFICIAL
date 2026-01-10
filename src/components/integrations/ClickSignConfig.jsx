import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function ClickSignConfig({ onConnect, onDisconnect, isConnected }) {
  const [apiKey, setApiKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [autoSend, setAutoSend] = useState(true);
  const [isTesting, setIsTesting] = useState(false);

  const handleConnect = async () => {
    if (!apiKey) {
      toast.error("Informe a API Key do ClickSign");
      return;
    }

    try {
      // Simular conexão - substituir por chamada real à API
      toast.success("ClickSign conectado com sucesso!");
      if (onConnect) onConnect({ apiKey, webhookUrl, autoSend });
    } catch (error) {
      toast.error("Erro ao conectar com ClickSign");
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      // Simular teste de conexão
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success("Conexão testada com sucesso!");
    } catch (error) {
      toast.error("Erro ao testar conexão");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isConnected ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-gray-400" />
            )}
            Configuração ClickSign
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Como obter sua API Key:</strong>
            </p>
            <ol className="text-sm text-blue-700 mt-2 space-y-1 ml-4 list-decimal">
              <li>Acesse sua conta no ClickSign</li>
              <li>Vá em Configurações → API</li>
              <li>Copie sua API Key</li>
            </ol>
            <a
              href="https://clicksign.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline mt-2 inline-flex items-center gap-1"
            >
              Ir para ClickSign <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key *</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="cole_sua_api_key_aqui"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isConnected}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhookUrl">Webhook URL (opcional)</Label>
            <Input
              id="webhookUrl"
              type="url"
              placeholder="https://seu-dominio.com/webhook"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              disabled={isConnected}
            />
            <p className="text-xs text-gray-500">
              URL para receber notificações de status dos documentos
            </p>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="autoSend">Envio Automático</Label>
              <p className="text-xs text-gray-500">
                Enviar contratos automaticamente após criação
              </p>
            </div>
            <Switch
              id="autoSend"
              checked={autoSend}
              onCheckedChange={setAutoSend}
              disabled={isConnected}
            />
          </div>

          <div className="flex gap-3">
            {!isConnected ? (
              <>
                <Button onClick={handleConnect} className="flex-1">
                  Conectar ClickSign
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTest}
                  disabled={!apiKey || isTesting}
                >
                  {isTesting ? "Testando..." : "Testar"}
                </Button>
              </>
            ) : (
              <Button
                variant="destructive"
                onClick={onDisconnect}
                className="flex-1"
              >
                Desconectar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Status da Integração</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-green-900">
                  Conexão Ativa
                </span>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-sm text-gray-600">
                <p><strong>Última sincronização:</strong> Agora mesmo</p>
                <p><strong>Documentos enviados hoje:</strong> 0</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}