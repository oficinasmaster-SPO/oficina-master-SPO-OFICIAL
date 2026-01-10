import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function ClickSignConfig({ user }) {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");

  React.useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      // Carregar configuração existente
      const webhookBase = `${window.location.origin}/api/webhooks/clicksign`;
      setWebhookUrl(webhookBase);
    } catch (error) {
      console.error("Erro ao carregar configuração:", error);
    }
  };

  const handleSaveConfig = async () => {
    if (!apiKey.trim()) {
      toast.error("Por favor, insira a API Key do ClickSign");
      return;
    }

    setLoading(true);
    try {
      await base44.functions.invoke("saveClickSignConfig", {
        apiKey: apiKey.trim()
      });
      
      setConnected(true);
      toast.success("Configuração salva com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar configuração: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      toast.error("Configure a API Key primeiro");
      return;
    }

    setTesting(true);
    try {
      const response = await base44.functions.invoke("testClickSignConnection", {
        apiKey: apiKey.trim()
      });
      
      if (response.data.success) {
        setConnected(true);
        toast.success("Conexão testada com sucesso!");
      } else {
        toast.error("Falha no teste de conexão");
      }
    } catch (error) {
      toast.error("Erro ao testar conexão: " + error.message);
    } finally {
      setTesting(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("URL do webhook copiada!");
  };

  return (
    <div className="space-y-6">
      {/* Status da Conexão */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {connected ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>Conectado ao ClickSign</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <span>ClickSign não configurado</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="apiKey">API Key do ClickSign</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Digite sua API Key..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Obtenha sua API Key em: <a href="https://app.clicksign.com/configuracoes/integracoes" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">ClickSign → Configurações → Integrações</a>
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSaveConfig} disabled={loading || !apiKey.trim()}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Salvar Configuração
            </Button>
            <Button variant="outline" onClick={handleTestConnection} disabled={testing || !apiKey.trim()}>
              {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Testar Conexão
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração de Webhooks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>URL do Webhook</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={webhookUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Configure esta URL no painel do ClickSign para receber notificações automáticas sobre assinaturas
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Como configurar webhooks no ClickSign:</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Acesse o painel do ClickSign</li>
              <li>Vá em Configurações → Webhooks</li>
              <li>Adicione a URL acima</li>
              <li>Selecione os eventos: document.sign, document.cancel, document.complete</li>
              <li>Salve a configuração</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Recursos Disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle>Recursos Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm">Envio automático de contratos para assinatura</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm">Atualização automática de status via webhook</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm">Consulta de documentos assinados</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm">Download automático de PDFs assinados</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}