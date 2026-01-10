import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, AlertCircle, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function SerasaConfig({ user }) {
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connected, setConnected] = useState(false);

  const { data: consultasLog = [] } = useQuery({
    queryKey: ["serasa-consultas"],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke("getSerasaConsultasLog");
        return response.data?.consultas || [];
      } catch {
        return [];
      }
    },
    enabled: connected,
    refetchInterval: 30000
  });

  const handleSaveConfig = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
      toast.error("Por favor, insira a API Key e Secret do Serasa");
      return;
    }

    setLoading(true);
    try {
      await base44.functions.invoke("saveSerasaConfig", {
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim()
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
    if (!apiKey.trim() || !apiSecret.trim()) {
      toast.error("Configure as credenciais primeiro");
      return;
    }

    setTesting(true);
    try {
      const response = await base44.functions.invoke("testSerasaConnection", {
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim()
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

  return (
    <div className="space-y-6">
      {/* Status da Conexão */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {connected ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>Conectado ao Serasa Experian</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <span>Serasa não configurado</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="apiKey">API Key do Serasa</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Digite sua API Key..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="apiSecret">API Secret do Serasa</Label>
            <Input
              id="apiSecret"
              type="password"
              placeholder="Digite seu API Secret..."
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Obtenha suas credenciais em: <a href="https://www.serasaexperian.com.br" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Portal Serasa Experian</a>
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSaveConfig} disabled={loading || !apiKey.trim() || !apiSecret.trim()}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Salvar Configuração
            </Button>
            <Button variant="outline" onClick={handleTestConnection} disabled={testing || !apiKey.trim() || !apiSecret.trim()}>
              {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Testar Conexão
            </Button>
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
              <span className="text-sm">Consulta de score de crédito (PF e PJ)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm">Validação automática de CNPJ/CPF</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm">Análise de risco de crédito</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm">Log completo de consultas realizadas</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log de Consultas */}
      {connected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Log de Consultas Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {consultasLog.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                Nenhuma consulta realizada ainda
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {consultasLog.slice(0, 10).map((consulta, idx) => (
                  <div key={idx} className="border-b pb-2 text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{consulta.documento}</p>
                        <p className="text-xs text-gray-600">{consulta.tipo_consulta}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          consulta.score >= 700 ? 'text-green-600' : 
                          consulta.score >= 400 ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          Score: {consulta.score || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(consulta.data).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}