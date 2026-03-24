import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function PrimeiroAcesso() {
  const navigate = useNavigate();
  const [step, setStep] = useState("validating"); // validating, login_redirect, completing, success, error, wrong_user
  const [error, setError] = useState(null);
  const [wrongUser, setWrongUser] = useState(null);

  useEffect(() => {
    validateToken();
  }, []);

  const validateToken = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      if (!token) {
        setError("Link de convite inválido. Token não encontrado.");
        setStep("error");
        return;
      }

      console.log("🔍 Validando token:", token);

      const response = await base44.functions.invoke('validateInviteToken', { token });

      if (response.data.success) {
        console.log("✅ Convite válido");
        const inviteData = response.data.invite;

        const isAuthenticated = await base44.auth.isAuthenticated();
        if (isAuthenticated) {
          const currentUser = await base44.auth.me();
          
          if (currentUser.email !== inviteData.email) {
            setWrongUser({ loggedInEmail: currentUser.email, inviteEmail: inviteData.email });
            setStep("wrong_user");
            return;
          }

          setStep("completing");
          try {
            const completeResponse = await base44.functions.invoke('completeInviteOnFirstAccess', { invite_token: token });
            if (completeResponse.data.success) {
              setStep("success");
              setTimeout(() => {
                window.location.href = createPageUrl("Home"); 
              }, 1500);
            } else {
              throw new Error(completeResponse.data.error || "Erro desconhecido");
            }
          } catch (err) {
            setError(err.response?.data?.error || err.message || "Erro ao processar convite");
            setStep("error");
          }
        } else {
          setStep("login_redirect");
          setTimeout(() => {
            base44.auth.redirectToLogin(window.location.origin + window.location.pathname + window.location.search);
          }, 4000);
        }
      } else {
        setError(response.data.error || "Convite inválido");
        setStep("error");
      }
    } catch (err) {
      console.error("❌ Erro ao validar token:", err);
      setError(err.response?.data?.error || "Erro ao validar convite");
      setStep("error");
    }
  };

  const renderContent = () => {
    switch (step) {
      case "validating":
        return (
          <div className="text-center animate-in fade-in duration-500 delay-150 fill-mode-both">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-900 font-bold text-xl mb-2">Validando convite...</p>
            <p className="text-gray-600">Aguarde um momento.</p>
          </div>
        );
      
      case "login_redirect":
        return (
          <div className="text-center animate-in fade-in zoom-in duration-300">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <p className="text-gray-900 font-bold text-xl mb-4">Convite Validado!</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-blue-800 font-bold mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" /> 
                Acesso Liberado
              </p>
              <p className="text-sm text-blue-700 mb-2">
                Na próxima tela, utilize a opção <strong>"Criar conta" (Sign up)</strong> com o seu e-mail para definir sua senha de acesso.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-gray-500 font-medium">
              <Loader2 className="w-4 h-4 animate-spin" />
              Redirecionando para tela de acesso...
            </div>
          </div>
        );

      case "completing":
        return (
          <div className="text-center animate-in fade-in duration-300">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-900 font-bold text-xl mb-2">Vinculando sua conta...</p>
            <p className="text-gray-600">Aguarde um momento.</p>
          </div>
        );

      case "success":
        return (
          <div className="text-center animate-in fade-in zoom-in duration-300">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <p className="text-gray-900 font-bold text-xl mb-2">Conta vinculada com sucesso!</p>
            <div className="flex items-center justify-center gap-2 text-gray-500 font-medium mt-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Entrando no sistema...
            </div>
          </div>
        );

      case "wrong_user":
        return (
          <div className="text-center animate-in fade-in zoom-in duration-300">
            <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-orange-900 mb-4">Usuário Incorreto</h2>
            <p className="text-gray-600 mb-4">
              Você está logado como <strong className="text-gray-900">{wrongUser?.loggedInEmail}</strong>.
            </p>
            <p className="text-gray-600 mb-6">
              Este convite pertence a <strong className="text-gray-900">{wrongUser?.inviteEmail}</strong>.
            </p>
            <div className="space-y-3">
              <Button
                onClick={async () => {
                  await base44.auth.logout();
                  window.location.reload();
                }}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                Sair desta conta e continuar
              </Button>
              <Button
                onClick={() => window.location.href = createPageUrl("Home")}
                variant="outline"
                className="w-full"
              >
                Ir para o Início
              </Button>
            </div>
          </div>
        );

      case "error":
        return (
          <div className="text-center animate-in fade-in zoom-in duration-500 delay-150 fill-mode-both">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-red-900 mb-4">Convite Inválido</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button
              onClick={() => window.location.href = createPageUrl("Home")}
              variant="outline"
              className="w-full"
            >
              Voltar ao Início
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <Card className={`w-full max-w-md shadow-xl border-t-4 ${
        step === 'error' ? 'border-t-red-500' : 
        step === 'wrong_user' ? 'border-t-orange-500' : 
        step === 'success' ? 'border-t-green-500' :
        'border-t-blue-500'
      }`}>
        <CardContent className="p-8">
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}