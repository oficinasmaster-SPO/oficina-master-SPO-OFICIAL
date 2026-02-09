import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
        setError("Link de convite invÃ¡lido. Token nÃ£o encontrado.");
        setLoading(false);
        return;
      }

      console.log("ðŸ” Validando token:", token);
      console.log("ðŸ‘¤ Profile ID:", profileId);

      const response = await base44.functions.invoke('validateInviteToken', { token });

      console.log("ðŸ“¦ Resposta validaÃ§Ã£o:", response.data);

      if (response.data.success) {
        console.log("âœ… Convite vÃ¡lido");

        // Se jÃ¡ estÃ¡ logado, completar a aceitaÃ§Ã£o do convite
        const isAuthenticated = await base44.auth.isAuthenticated();
        if (isAuthenticated) {
          console.log("âœ… UsuÃ¡rio jÃ¡ autenticado, completando aceitaÃ§Ã£o...");
          try {
            const completeResponse = await base44.functions.invoke('completeInviteOnFirstAccess', { invite_token: token });
            if (completeResponse.data.success) {
              console.log("âœ… Convite aceito com sucesso!");
              toast.success("Bem-vindo! Acesso liberado.");
              setTimeout(() => {
                navigate(createPageUrl("MeuPerfil"));
              }, 1500);
            }
          } catch (err) {
            console.error("âŒ Erro ao completar convite:", err);
            toast.error("Erro ao processar convite: " + err.message);
            setError(err.response?.data?.error || "Erro ao processar convite");
          }
        } else {
          console.log("ðŸ”„ Redirecionando para login...");
          setInvite(response.data.invite);
          setWorkshop(response.data.workshop);
          setTimeout(() => {
            base44.auth.redirectToLogin(window.location.origin + window.location.pathname + window.location.search);
          }, 1000);
        }
      } else {
        setError(response.data.error || "Convite invÃ¡lido");
      }
    } catch (err) {
      console.error("âŒ Erro ao validar token:", err);
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
                <p className="text-gray-900 font-semibold text-lg mb-2">Convite Validado!</p>
                <p className="text-gray-600">Redirecionando para login...</p>
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
          <CardTitle className="text-2xl text-red-900">Convite InvÃ¡lido</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600 mb-6">{error}</p>
          <Button
            onClick={() => window.location.href = createPageUrl("Home")}
            variant="outline"
            className="w-full"
          >
            Voltar ao InÃ­cio
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}



