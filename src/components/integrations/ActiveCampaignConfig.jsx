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

  const handleTestEmail = async () => {
    const email = "ghrs.guilherme@gmail.com";
    setTesting(true);
    try {
      const response = await base44.functions.invoke('testActiveCampaignSendEmail', { email });
      
      if (response.data.success) {
        toast.success(`✅ Email de teste enviado para ${email}`);
      } else {
        toast.error("❌ Erro: " + response.data.error);
      }
    } catch (error) {
      toast.error("Erro ao enviar email de teste");
      console.error(error);
    } finally {
      setTesting(false);
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
                onClick={handleTestEmail}
                disabled={testing}
                variant="outline"
                className="border-orange-500 text-orange-600 hover:bg-orange-50"
              >
                {testing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {testing ? "Enviando..." : "🧪 Testar Email"}
              </Button>
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
            
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-blue-900">Configuração no ActiveCampaign</h3>
              </div>
              
              <div className="space-y-4">
                {/* Passo 1 */}
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      1
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">Criar Automação no ActiveCampaign</h4>
                      <ul className="text-sm text-gray-700 space-y-1 ml-1">
                        <li>• Vá em <code className="bg-gray-100 px-1.5 py-0.5 rounded">Automations → Create an Automation</code></li>
                        <li>• Escolha: <strong>"Start from scratch"</strong></li>
                        <li>• <strong>Gatilho:</strong> "Tag is added" → Selecione <code className="bg-yellow-100 px-1.5 py-0.5 rounded font-semibold">academia_acesso</code></li>
                        <li>• <strong>Ação:</strong> "Send email" → Crie template de boas-vindas</li>
                        <li>• <strong>Ative</strong> a automação</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Passo 2 */}
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      2
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">Testar o Fluxo</h4>
                      <ul className="text-sm text-gray-700 space-y-1 ml-1">
                        <li>• Clique no botão <strong>"🧪 Testar Email"</strong> acima</li>
                        <li>• Verifique o email: <code className="bg-gray-100 px-1.5 py-0.5 rounded">ghrs.guilherme@gmail.com</code></li>
                        <li>• O contato recebe a tag automaticamente</li>
                        <li>• A automação dispara o email</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Passo 3 */}
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-7 h-7 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      3
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">Enviar para Todos os Clientes</h4>
                      <p className="text-sm text-gray-700 ml-1">
                        Depois de testar, clique em <strong>"Enviar para Clientes"</strong> para adicionar todos os alunos ativos da Academia.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                <p className="text-xs text-yellow-800">
                  💡 <strong>Dica:</strong> Certifique-se de que a automação está <strong>ATIVA</strong> antes de enviar para clientes em massa.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}