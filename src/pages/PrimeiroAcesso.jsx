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
    confirmPassword: "",
    full_name: "",
    telefone: "",
    data_nascimento: ""
  });
  const [step, setStep] = useState(1); // 1: validação, 2: dados, 3: sucesso

  useEffect(() => {
    validateToken();
  }, []);

  const validateToken = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const workshopId = urlParams.get('workshop_id');

      if (!token) {
        setError("Link de convite inválido. Token não encontrado.");
        setLoading(false);
        return;
      }

      console.log("🔍 Validando token:", token);
      console.log("🏢 Workshop ID:", workshopId);

      const response = await base44.functions.invoke('validateInviteToken', { token });

      console.log("📦 Resposta validação:", response.data);

      if (response.data.success) {
        setInvite(response.data.invite);
        setWorkshop(response.data.workshop);
        setStep(2); // Ir direto para o formulário de cadastro
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
    setSubmitting(true);

    try {
      if (!formData.password || formData.password.length < 6) {
        toast.error("A senha deve ter no mínimo 6 caracteres");
        setSubmitting(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        toast.error("As senhas não coincidem");
        setSubmitting(false);
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const workshopId = urlParams.get('workshop_id');

      // Criar conta com os dados
      const response = await base44.functions.invoke('createUserOnFirstAccess', {
        invite_id: invite.id,
        password: formData.password,
        workshop_id: workshopId || invite.workshop_id,
        full_name: formData.full_name || invite.name,
        telefone: formData.telefone,
        data_nascimento: formData.data_nascimento
      });

      if (!response.data.success) {
        throw new Error(response.data.error || "Erro ao criar conta");
      }

      toast.success("✅ Conta ativada! Redirecionando...");

      // Fazer login automático e redirecionar para Meu Perfil
      setTimeout(() => {
        base44.auth.redirectToLogin(window.location.origin + createPageUrl("MeuPerfil"));
      }, 1500);

    } catch (err) {
      console.error("❌ Erro:", err);
      toast.error(err.response?.data?.error || err.message || "Erro ao criar conta");
      setSubmitting(false);
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

  // Formulário de cadastro (único step após validação)
  if (step === 2) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-gray-900">Bem-vindo(a) à {workshop?.name}!</CardTitle>
            <p className="text-gray-600 mt-2 text-sm">Configure sua senha e complete seus dados para acessar a plataforma</p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="full_name">Nome Completo</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder={invite?.name}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                <Input
                  id="data_nascimento"
                  type="date"
                  value={formData.data_nascimento}
                  onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Digite a senha novamente"
                  required
                  minLength={6}
                  className="mt-1"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 h-11"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Ativando Conta...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Finalizar Cadastro
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setStep(1)}
                disabled={submitting}
              >
                Voltar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // STEP 3: Sucesso
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardContent className="text-center p-12">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-green-900 mb-2">Conta ativada com sucesso!</h2>
          <p className="text-gray-600 mb-6">Você será redirecionado para fazer login em alguns momentos...</p>
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto" />
        </CardContent>
      </Card>
    </div>
  );
}