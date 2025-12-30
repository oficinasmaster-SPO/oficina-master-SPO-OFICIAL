import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, CheckCircle2, Copy, RefreshCw, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import IntegrationCreditsMonitor from "@/components/credits/IntegrationCreditsMonitor";

export default function DiagnosticoPlano() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [diagnosticData, setDiagnosticData] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [creditsInfo, setCreditsInfo] = useState(null);

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const loadDiagnostics = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Tenta fazer uma chamada de integração simples para capturar o erro
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: "Responda apenas: OK",
        });
        setTestResult({ success: true, data: result });
      } catch (integrationError) {
        // Captura os detalhes do erro
        setTestResult({
          success: false,
          error: integrationError.message,
          details: integrationError.response?.data || integrationError
        });
      }

      setDiagnosticData({
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        appUrl: window.location.origin,
        appId: window.location.pathname.split('/')[1] || 'N/A'
      });

    } catch (error) {
      console.error("Erro ao carregar diagnóstico:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const copyDiagnostic = () => {
    const report = `
=== BASE44 PLAN DIAGNOSTIC REPORT ===
Generated: ${new Date().toISOString()}

--- USER INFO ---
Email: ${user?.email || 'N/A'}
User ID: ${user?.id || 'N/A'}
Role: ${user?.role || 'N/A'}
Full Name: ${user?.full_name || 'N/A'}

--- INTEGRATION TEST ---
Test Result: ${testResult?.success ? 'SUCCESS' : 'FAILED'}
${testResult?.error ? `Error: ${testResult.error}` : ''}
${testResult?.details ? `Details: ${JSON.stringify(testResult.details, null, 2)}` : ''}

--- APP INFO ---
App URL: ${diagnosticData?.appUrl || 'N/A'}
Timestamp: ${diagnosticData?.timestamp || 'N/A'}

--- EXPECTED ---
I am subscribed to the ELITE plan, but the API returns "user_tier": "free"
This is blocking my integrations after 100 credits when I should have more.

Please verify my subscription status.
===================================
    `.trim();

    navigator.clipboard.writeText(report);
    toast.success("Relatório copiado! Cole no chamado de suporte.");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Diagnóstico de Plano Base44</h1>
        <Button onClick={loadDiagnostics} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Status do Teste */}
      <Card className={testResult?.success ? "border-green-500" : "border-red-500"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {testResult?.success ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            )}
            Teste de Integração
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge className={testResult?.success ? "bg-green-600" : "bg-red-600"}>
            {testResult?.success ? "SUCESSO" : "FALHOU"}
          </Badge>
          
          {!testResult?.success && testResult?.details && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg">
              <p className="font-semibold text-red-800 mb-2">Detalhes do Erro:</p>
              <pre className="text-xs text-red-700 whitespace-pre-wrap overflow-auto max-h-48">
                {JSON.stringify(testResult.details, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info do Usuário */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{user?.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">User ID</p>
              <p className="font-mono text-sm">{user?.id || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Role</p>
              <Badge>{user?.role || 'N/A'}</Badge>
            </div>
            <div>
              <p className="text-sm text-gray-500">Nome</p>
              <p className="font-medium">{user?.full_name || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Evidência para Suporte */}
      <Card className="border-yellow-500 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            Problema Identificado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            O sistema está retornando <code className="bg-yellow-200 px-1 rounded">user_tier: "free"</code> quando 
            deveria ser <code className="bg-green-200 px-1 rounded">user_tier: "elite"</code>.
          </p>
          <p className="text-sm">
            Isso está causando bloqueio das integrações após 100 créditos (limite do plano free).
          </p>
          
          <Button onClick={copyDiagnostic} className="w-full">
            <Copy className="w-4 h-4 mr-2" />
            Copiar Relatório para Suporte
          </Button>
        </CardContent>
      </Card>

      {/* Raw Data */}
      <Card>
        <CardHeader>
          <CardTitle>Dados Técnicos (Raw)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-gray-100 p-4 rounded-lg overflow-auto max-h-64">
{JSON.stringify({
  user: user,
  testResult: testResult,
  diagnostic: diagnosticData
}, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}