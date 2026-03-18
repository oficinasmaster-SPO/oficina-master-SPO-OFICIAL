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
    email: "",
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
      const profileId = urlParams.get('profile_id');

      if (!token) {
        setError("Link de convite inválido. Token não encontrado.");
        setLoading(false);
        return;
      }

      console.log("🔍 Validando token:", token);
      console.log("👤 Profile ID:", profileId);

      const response = await base44.functions.invoke('validateInviteToken', { token });

      console.log("📦 Resposta validação:", response.data);

      if (response.data.success) {
        console.log("✅ Convite válido");

        // Se já está logado, completar a aceitação do convite
        const isAuthenticated = await base44.auth.isAuthenticated();
        if (isAuthenticated) {
          console.log("✅ Usuário já autenticado, completando aceitação...");
          try {
            const completeResponse = await base44.functions.invoke('completeInviteOnFirstAccess', { invite_token: token });
            if (completeResponse.data.success) {
              console.log("✅ Convite aceito com sucesso!");
              toast.success("Bem-vindo! Acesso liberado.");
              setTimeout(() => {
                navigate(createPageUrl("MeuPerfil"));
              }, 1500);
            }
          } catch (err) {
            console.error("❌ Erro ao completar convite:", err);
            toast.error("Erro ao processar convite: " + err.message);
            setError(err.response?.data?.error || "Erro ao processar convite");
          }
        } else {
          console.log("🔄 Redirecionando para login...");
          setInvite(response.data.invite);
          setWorkshop(response.data.workshop);
          setTimeout(() => {
            base44.auth.redirectToLogin(window.location.origin + window.location.pathname + window.location.search);
          }, 5000); // Dá 5 segundos para o usuário ler as instruções de login
        }
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



  if (loading || invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-12 text-center">
            {invite ? (
              <>
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <p className="text-gray-900 font-bold text-xl mb-4">Convite Validado!</p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                  <p className="text-blue-800 font-bold mb-2 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" /> 
                    Sua conta já está criada!
                  </p>
                  <p className="text-sm text-blue-700 mb-2">
                    Na próxima tela, utilize a opção de <strong>LOGIN (Entrar)</strong> com o seu e-mail e a <strong>senha temporária</strong> fornecida pelo gestor.
                  </p>
                  <p className="text-sm text-red-600 font-bold mt-2">
                    ❌ NÃO utilize a opção "Sign up" (Criar conta).
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-gray-500 font-medium">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirecionando para a tela de acesso...
                </div>
              </>
            ) : (
              <>
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Validando convite...</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

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