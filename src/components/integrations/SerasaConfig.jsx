import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CheckCircle, AlertCircle, ExternalLink, Shield } from "lucide-react";
import { toast } from "sonner";

export default function SerasaConfig({ onConnect, onDisconnect, isConnected }) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [autoCheck, setAutoCheck] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleConnect = async () => {
    if (!clientId || !clientSecret) {
      toast.error("Informe Client ID e Client Secret");
      return;
    }

    try {
      // Simular conexão - substituir por chamada real à API
      toast.success("Serasa Experian conectado com sucesso!");
      if (onConnect) onConnect({ clientId, clientSecret, autoCheck });
    } catch (error) {
      toast.error("Erro ao conectar com Serasa");
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
            Configuração Serasa Experian
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Consulta de Crédito Empresarial
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Valide CNPJs e CPFs antes de fechar contratos. Acesse o portal
                  Serasa Experian para obter suas credenciais de API.
                </p>
                <a
                  href="https://empresas.serasaexperian.com.br"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline mt-2 inline-flex items-center gap-1"
                >
                  Portal Serasa <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientId">Client ID *</Label>
            <Input
              id="clientId"
              type="text"
              placeholder="seu_client_id"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={isConnected}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientSecret">Client Secret *</Label>
            <Input
              id="clientSecret"
              type="password"
              placeholder="seu_client_secret"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              disabled={isConnected}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="autoCheck">Consulta Automática</Label>
              <p className="text-xs text-gray-500">
                Verificar crédito automaticamente ao criar contratos
              </p>
            </div>
            <Switch
              id="autoCheck"
              checked={autoCheck}
              onCheckedChange={setAutoCheck}
              disabled={isConnected}
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              <strong>⚠️ Atenção:</strong> Cada consulta ao Serasa tem um custo.
              Configure a consulta automática apenas se necessário.
            </p>
          </div>

          <div className="flex gap-3">
            {!isConnected ? (
              <>
                <Button onClick={handleConnect} className="flex-1">
                  Conectar Serasa
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTest}
                  disabled={!clientId || !clientSecret || isTesting}
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
                <p><strong>Última consulta:</strong> Nenhuma ainda</p>
                <p><strong>Consultas hoje:</strong> 0</p>
                <p><strong>Créditos disponíveis:</strong> Verificar no portal</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}