import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2, Key, FileText } from "lucide-react";
import { toast } from "sonner";

export default function ClickSignConfig() {
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      toast.error("Por favor, insira a chave API");
      return;
    }

    setIsTesting(true);
    setConnectionStatus(null);

    try {
      const response = await base44.functions.invoke('testClickSignConnection', { apiKey });
      
      if (response.data.success) {
        setConnectionStatus({ type: 'success', message: response.data.message });
        toast.success("Conexão com ClickSign estabelecida!");
      } else {
        setConnectionStatus({ type: 'error', message: response.data.error });
        toast.error("Falha na conexão com ClickSign");
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      setConnectionStatus({ 
        type: 'error', 
        message: error.response?.data?.error || "Erro ao testar conexão"
      });
      toast.error("Erro ao testar conexão");
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!apiKey.trim()) {
      toast.error("Por favor, insira a chave API");
      return;
    }

    setIsLoading(true);

    try {
      const response = await base44.functions.invoke('saveClickSignConfig', { apiKey });
      
      if (response.data.success) {
        toast.success("Configuração salva com sucesso!");
        setConnectionStatus({ type: 'success', message: 'Configuração salva e ativa' });
      } else {
        toast.error("Erro ao salvar configuração");
      }
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Erro ao salvar configuração");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Configuração ClickSign
        </CardTitle>
        <CardDescription>
          Configure a integração com ClickSign para assinatura eletrônica de documentos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="apiKey" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            Chave API do ClickSign
          </Label>
          <Input
            id="apiKey"
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Insira sua chave API do ClickSign"
            className="font-mono"
          />
          <p className="text-xs text-gray-500">
            Obtenha sua chave em{" "}
            <a 
              href="https://app.clicksign.com/integracoes" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              app.clicksign.com/integracoes
            </a>
          </p>
        </div>

        {connectionStatus && (
          <Alert variant={connectionStatus.type === 'success' ? 'default' : 'destructive'}>
            {connectionStatus.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{connectionStatus.message}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTesting || !apiKey.trim()}
            className="flex-1"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testando...
              </>
            ) : (
              'Testar Conexão'
            )}
          </Button>

          <Button
            onClick={handleSaveConfig}
            disabled={isLoading || !apiKey.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Configuração'
            )}
          </Button>
        </div>

        <div className="pt-4 border-t">
          <h4 className="text-sm font-semibold mb-2">Recursos disponíveis:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Envio de documentos para assinatura</li>
            <li>• Múltiplos signatários</li>
            <li>• Autenticações avançadas (biometria, documentoscopia)</li>
            <li>• Webhooks para notificações de status</li>
            <li>• Assinatura posicionada nos documentos</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}