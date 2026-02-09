import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, CheckCircle, AlertCircle, Loader2, Shield, Eye, EyeOff } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ResendConfig() {
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [fromDomain, setFromDomain] = useState("resend.dev");

  const testConnection = async () => {
    if (!testEmail) {
      toast.error("Informe um email para teste");
      return;
    }

    setTesting(true);
    try {
      const response = await base44.functions.invoke('sendEmailResend', {
        to: testEmail,
        subject: "✅ Teste Resend - Oficinas Master",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Teste de Conexão Resend</h2>
            <p>Este é um email de teste enviado através da integração Resend.</p>
            <p>Se você recebeu este email, a integração está funcionando corretamente! ✅</p>
            <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="font-size: 12px; color: #6b7280;">
              Enviado em ${new Date().toLocaleString('pt-BR')}
            </p>
          </div>
        `,
        from_name: "Oficinas Master"
      });

      if (response.data?.success) {
        toast.success('Email enviado com sucesso! Verifique sua caixa de entrada.');
      } else {
        toast.error(response.data?.error || 'Falha ao enviar email');
      }
    } catch (error) {
      toast.error('Erro: ' + error.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50">
              <Mail className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <CardTitle>Resend</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Emails transacionais e convites</p>
            </div>
          </div>
          <Badge className="bg-green-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            Configurado
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Segurança */}
        <Alert className="bg-amber-50 border-amber-200">
          <Shield className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-sm">
            <strong>Segurança:</strong> A API Key do Resend está armazenada de forma segura como secret. 
            Por segurança, não exibimos o valor completo.
          </AlertDescription>
        </Alert>

        {/* API Key Status */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold">API Key (Secret)</Label>
            <Badge variant="secondary">
              <Shield className="w-3 h-3 mr-1" />
              Protegida
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Input 
              type={apiKeyVisible ? "text" : "password"}
              value="re_••••••••••••••••••••••••••••••"
              disabled
              className="bg-white"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setApiKeyVisible(!apiKeyVisible)}
            >
              {apiKeyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Configure em: Dashboard → Functions → Secrets → RESEND_API_KEY
          </p>
        </div>

        {/* Domínio */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <Label className="text-sm font-semibold mb-2 block">Domínio de Envio</Label>
          <Input 
            placeholder="seudominio.com.br"
            value={fromDomain}
            onChange={(e) => setFromDomain(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-2">
            Use <code className="bg-white px-1 rounded">resend.dev</code> para testes ou configure seu domínio em resend.com/domains
          </p>
        </div>

        {/* Teste de Envio */}
        <div className="p-4 border-2 border-dashed rounded-lg">
          <Label className="text-sm font-semibold mb-3 block">Testar Envio</Label>
          <div className="space-y-3">
            <Input 
              type="email"
              placeholder="seu@email.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
            <Button
              onClick={testConnection}
              disabled={testing || !testEmail}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Enviar Email de Teste
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Informações */}
        <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700">
          <p className="font-semibold mb-2">Como funciona:</p>
          <ul className="space-y-1 text-xs">
            <li>• Emails de convite de colaboradores enviados automaticamente</li>
            <li>• Templates HTML personalizados com logo da empresa</li>
            <li>• Rastreamento de entregas e aberturas</li>
            <li>• Domínio customizado para maior credibilidade</li>
          </ul>
        </div>

        {/* Guia de Configuração */}
        <div className="bg-gray-50 p-4 rounded-lg text-sm">
          <p className="font-semibold mb-2">Configuração do Domínio:</p>
          <ol className="space-y-2 text-xs text-gray-700">
            <li className="flex gap-2">
              <span className="font-mono bg-white px-2 py-0.5 rounded">1.</span>
              Acesse <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">resend.com/domains</a>
            </li>
            <li className="flex gap-2">
              <span className="font-mono bg-white px-2 py-0.5 rounded">2.</span>
              Adicione seu domínio (ex: oficinasmaster.com.br)
            </li>
            <li className="flex gap-2">
              <span className="font-mono bg-white px-2 py-0.5 rounded">3.</span>
              Configure os registros DNS conforme instruído
            </li>
            <li className="flex gap-2">
              <span className="font-mono bg-white px-2 py-0.5 rounded">4.</span>
              Aguarde verificação (geralmente poucos minutos)
            </li>
            <li className="flex gap-2">
              <span className="font-mono bg-white px-2 py-0.5 rounded">5.</span>
              Atualize a função <code className="bg-white px-1 rounded">sendEmailResend.js</code> com seu domínio
            </li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}