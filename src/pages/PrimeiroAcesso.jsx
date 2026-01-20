import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle, Lock } from "lucide-react";
import { toast } from "sonner";

export default function PrimeiroAcesso() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invite, setInvite] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: ""
  });

  useEffect(() => {
    validateToken();
  }, []);

  const validateToken = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      if (!token) {
        setError("Link de convite inválido. Token não encontrado.");
        setLoading(false);
        return;
      }

      console.log("🔍 Validando token:", token);

      const response = await base44.functions.invoke('validateInviteToken', { token });

      console.log("📦 Resposta validação:", response.data);

      if (response.data.success) {
        setInvite(response.data.invite);
        setWorkshop(response.data.workshop);
        console.log("✅ Convite válido:", response.data.invite);
      } else {
        setError(response.data.error || "Convite inválido");
      }
    } catch (err) {
      console.error("❌ Erro ao validar token:", err);
      setError(err.response?.data?.error || "Erro ao validar convite");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Redirecionar para MeuPerfil passando o token
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      window.location.href = `${createPageUrl("MeuPerfil")}?onboarding=true&invite_token=${token}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Validando convite...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-900">Convite Inválido</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6">{error}</p>
            <Button
              onClick={() => window.location.href = createPageUrl("Home")}
              variant="outline"
              className="w-full"
            >
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl text-gray-900">Bem-vindo(a)!</CardTitle>
          <p className="text-gray-600 mt-2">
            {invite?.name}, você foi convidado(a) para fazer parte da equipe <strong>{workshop?.name}</strong>
          </p>
        </CardHeader>
        
        <CardContent>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-900">Clique para continuar</p>
                <p className="text-xs text-green-700 mt-1">
                  Você será levado para completar seu perfil e configurar a senha
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
              <p className="font-medium mb-2">📋 Dados do Convite:</p>
              <p><strong>Nome:</strong> {invite?.name}</p>
              <p><strong>Email:</strong> {invite?.email}</p>
              <p><strong>Cargo:</strong> {invite?.position}</p>
              <p><strong>Oficina:</strong> {workshop?.name}</p>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-green-600 hover:bg-green-700 h-11"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Redirecionando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Ir para Meu Perfil
                </>
              )}
            </Button>
          </form>

          <p className="text-xs text-gray-500 text-center mt-4">
            Você completará seu cadastro na próxima tela
          </p>
        </CardContent>
      </Card>
    </div>
  );
}