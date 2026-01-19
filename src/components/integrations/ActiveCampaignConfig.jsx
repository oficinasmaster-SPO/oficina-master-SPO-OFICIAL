import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Mail, CheckCircle, AlertCircle, Loader2, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ActiveCampaignConfig() {
  const [testing, setTesting] = useState(false);
  const [sending, setSending] = useState(false);
  const [settingUp, setSettingUp] = useState(false);
  const [status, setStatus] = useState("checking");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");

  React.useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const response = await base44.functions.invoke('testActiveCampaignConnection', {});
      if (response.data.success) {
        setStatus("connected");
        setApiUrl(response.data.api_url || "");
      } else {
        setStatus("disconnected");
      }
    } catch (error) {
      setStatus("disconnected");
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const response = await base44.functions.invoke('testActiveCampaignConnection', {
        api_url: apiUrl,
        api_key: apiKey
      });

      if (response.data.success) {
        toast.success("✅ Conexão com ActiveCampaign estabelecida!");
        setStatus("connected");
        await checkConnection();
      } else {
        toast.error("❌ Falha na conexão: " + response.data.error);
        setStatus("error");
      }
    } catch (error) {
      toast.error("Erro ao testar conexão");
      setStatus("error");
    } finally {
      setTesting(false);
    }
  };

  const handleSetupAutomation = async () => {
    setSettingUp(true);
    try {
      const response = await base44.functions.invoke('setupActiveCampaignAutomation', {});
      
      if (response.data.success) {
        toast.success("✅ Automação criada! Verifique os rascunhos no ActiveCampaign");
      } else {
        toast.error("❌ Erro: " + response.data.error);
      }
    } catch (error) {
      toast.error("Erro ao configurar automação");
      console.error(error);
    } finally {
      setSettingUp(false);
    }
  };

  const handleSendToClients = async () => {
    setSending(true);
    try {
      const response = await base44.functions.invoke('sendActiveCampaignToClients', {});
      
      if (response.data.success) {
        toast.success(`✅ Emails enviados: ${response.data.sent_count} clientes`);
      } else {
        toast.error("❌ Erro ao enviar emails: " + response.data.error);
      }
    } catch (error) {
      toast.error("Erro ao processar envio");
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-blue-600" />
            <CardTitle>ActiveCampaign</CardTitle>
          </div>
          <Badge variant={status === "connected" ? "default" : "secondary"}
            className={status === "connected" ? "bg-green-600" : ""}>
            {status === "connected" && <CheckCircle className="w-3 h-3 mr-1" />}
            {status === "error" && <AlertCircle className="w-3 h-3 mr-1" />}
            {status === "connected" ? "Conectado" : status === "error" ? "Erro" : "Desconectado"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Envie campanhas e emails automáticos para clientes com acesso à Academia
        </p>

        <div className="space-y-3">
          <div>
            <Label>API URL</Label>
            <Input
              placeholder="https://youraccountname.api-us1.com"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              disabled={status === "connected"}
            />
            <p className="text-xs text-gray-500 mt-1">
              Encontre em: Configurações → Desenvolvedor → URL da API
            </p>
          </div>

          <div>
            <Label>API Key</Label>
            <Input
              type="password"
              placeholder="Sua chave de API do ActiveCampaign"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={status === "connected"}
            />
            <p className="text-xs text-gray-500 mt-1">
              Encontre em: Configurações → Desenvolvedor → Chave de API
            </p>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          {status !== "connected" ? (
            <Button
              onClick={handleTest}
              disabled={!apiUrl || !apiKey || testing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {testing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {testing ? "Testando..." : "Testar Conexão"}
            </Button>
          ) : (
            <>
              <Button
                onClick={handleSetupAutomation}
                disabled={settingUp}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {settingUp && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {settingUp ? "Configurando..." : "Criar Automação"}
              </Button>
              <Button
                onClick={handleSendToClients}
                disabled={sending}
                className="bg-green-600 hover:bg-green-700"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar para Clientes
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        {status === "connected" && (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                ✅ Integração ativa
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold text-blue-900">📋 Próximos Passos:</p>
              <ol className="text-xs text-gray-700 space-y-1 list-decimal ml-4">
                <li><strong>Criar Automação:</strong> Gera lista, tag e campanha automática de boas-vindas</li>
                <li><strong>Enviar para Clientes:</strong> Adiciona clientes ativos à lista com a tag "academia_acesso"</li>
                <li><strong>No ActiveCampaign:</strong> Ative a campanha em Rascunhos e configure gatilhos</li>
              </ol>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}