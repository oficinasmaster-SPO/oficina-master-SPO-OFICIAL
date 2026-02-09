import React, { useState } from "react";
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  FileText, 
  Send, 
  RefreshCw,
  Eye,
  Activity
} from "lucide-react";
import { toast } from "sonner";

export default function TesteClickSign() {
  const [apiKey, setApiKey] = useState("");
  const [testPdfContent, setTestPdfContent] = useState("Contrato de Teste - Oficinas Master\n\nEste Ã© um documento de teste para validar a integraÃ§Ã£o com ClickSign.");
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  // Carregar config existente
  const { data: config, isLoading: loadingConfig } = useQuery({
    queryKey: ['clicksign-config'],
    queryFn: async () => {
      const settings = await base44.entities.SystemSetting.filter({ 
        key: 'clicksign_api_key' 
      });
      return settings?.[0] || null;
    },
    enabled: user?.role === 'admin'
  });

  // Testar conexÃ£o
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const key = apiKey || config?.value;
      if (!key) throw new Error("API Key nÃ£o configurada");
      
      return await base44.functions.invoke("testClickSignConnection", {
        apiKey: key
      });
    },
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success("âœ… ConexÃ£o OK! API Key vÃ¡lida");
      } else {
        toast.error("âŒ Falha: " + response.data.error);
      }
    },
    onError: (error) => {
      toast.error("Erro ao testar: " + error.message);
    }
  });

  // Enviar documento teste
  const sendTestDocMutation = useMutation({
    mutationFn: async () => {
      const key = apiKey || config?.value;
      if (!key) throw new Error("API Key nÃ£o configurada");

      return await base44.functions.invoke("sendTestClickSignDocument", {
        apiKey: key,
        content: testPdfContent
      });
    },
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success("ðŸ“„ Documento enviado! Key: " + response.data.documentKey);
        queryClient.invalidateQueries(['clicksign-documents']);
      } else {
        toast.error("Erro: " + response.data.error);
      }
    },
    onError: (error) => {
      toast.error("Erro ao enviar: " + error.message);
    }
  });

  // Listar documentos
  const { data: documents = [], isLoading: loadingDocs, refetch: refetchDocs } = useQuery({
    queryKey: ['clicksign-documents'],
    queryFn: async () => {
      const key = apiKey || config?.value;
      if (!key) return [];

      const response = await base44.functions.invoke("listClickSignDocuments", {
        apiKey: key
      });
      return response.data.documents || [];
    },
    enabled: false
  });

  // Buscar webhooks recebidos
  const { data: webhookLogs = [], refetch: refetchWebhooks } = useQuery({
    queryKey: ['clicksign-webhooks'],
    queryFn: async () => {
      const settings = await base44.entities.SystemSetting.filter({
        key: { $regex: 'clicksign_webhook_log' }
      });
      return settings.sort((a, b) => 
        new Date(b.updated_date) - new Date(a.updated_date)
      ).slice(0, 10);
    }
  });

  if (user?.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Acesso Restrito</h2>
          <p className="text-gray-600">Apenas administradores podem acessar os testes de integraÃ§Ã£o.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Teste da IntegraÃ§Ã£o ClickSign</h1>
        <p className="text-gray-600 mt-2">
          Valide a API Key, envie documentos teste e monitore webhooks
        </p>
      </div>

      {/* Status da ConfiguraÃ§Ã£o */}
      <Card>
        <CardHeader>
          <CardTitle>Status da ConfiguraÃ§Ã£o</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingConfig ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-gray-600">Carregando configuraÃ§Ã£o...</span>
            </div>
          ) : config ? (
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">API Key configurada</span>
              <Badge variant="outline" className="ml-2">
                {config.value.substring(0, 10)}...
              </Badge>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium">API Key nÃ£o configurada</span>
            </div>
          )}

          <div>
            <Label htmlFor="apiKey">API Key (override temporÃ¡rio)</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Opcional - deixe vazio para usar a configurada"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Use para testar uma nova chave sem salvar permanentemente
            </p>
          </div>

          <Button
            onClick={() => testConnectionMutation.mutate()}
            disabled={testConnectionMutation.isPending}
            className="w-full"
          >
            {testConnectionMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Activity className="w-4 h-4 mr-2" />
            )}
            Testar ConexÃ£o com API
          </Button>
        </CardContent>
      </Card>

      {/* Enviar Documento Teste */}
      <Card>
        <CardHeader>
          <CardTitle>Enviar Documento de Teste</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="testContent">ConteÃºdo do Documento</Label>
            <Textarea
              id="testContent"
              rows={6}
              value={testPdfContent}
              onChange={(e) => setTestPdfContent(e.target.value)}
              placeholder="Digite o conteÃºdo do documento de teste..."
            />
          </div>

          <Button
            onClick={() => sendTestDocMutation.mutate()}
            disabled={sendTestDocMutation.isPending}
            className="w-full"
          >
            {sendTestDocMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Enviar Documento para ClickSign
          </Button>
        </CardContent>
      </Card>

      {/* Documentos no ClickSign */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Documentos no ClickSign</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchDocs()}
              disabled={loadingDocs}
            >
              {loadingDocs ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Nenhum documento encontrado. Clique em "Enviar Documento" acima.
            </p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">{doc.name}</p>
                      <p className="text-xs text-gray-500">Key: {doc.key}</p>
                    </div>
                  </div>
                  <Badge variant={doc.status === 'signed' ? 'default' : 'outline'}>
                    {doc.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log de Webhooks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Webhooks Recebidos</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchWebhooks()}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {webhookLogs.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Nenhum webhook recebido ainda
            </p>
          ) : (
            <div className="space-y-2">
              {webhookLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 border rounded-lg bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge>{log.value?.event}</Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(log.updated_date).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                    {JSON.stringify(log.value, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



