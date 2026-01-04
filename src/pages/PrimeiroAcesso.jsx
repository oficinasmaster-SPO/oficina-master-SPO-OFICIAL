import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle2, Upload, User, Lock, AlertCircle, Building2, Clock, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { registerEmployeeViaBackend } from "@/components/onboarding/EmployeeRegistrationHelper";

export default function PrimeiroAcesso() {
  // VERSION MARKER: v20251218-1710-SDK-BACKEND
  console.log("🆕 PrimeiroAcesso v20251218-1710-SDK-BACKEND carregado");
  
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invite, setInvite] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    profile_picture_url: "",
    accept_terms: false
  });

  useEffect(() => {
    loadInvite();
  }, []);

  const loadInvite = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("token");

      console.log("🔍 Token recebido:", token);

      if (!token) {
        setError("Token de convite não encontrado. Verifique o link recebido.");
        setLoading(false);
        return;
      }

      // Validar convite via backend (acesso público)
      console.log("📡 Validando convite via backend...");
      
      const response = await fetch(`${window.location.origin}/.functions/validateInvitePublic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const data = await response.json();
      
      console.log("📥 Resposta do backend:", data);
      
      if (!data.success) {
        setError(data.error || "Convite não encontrado ou inválido. Solicite um novo convite ao gestor.");
        setLoading(false);
        return;
      }

      if (data.workshop) {
        setWorkshop(data.workshop);
      }

      setInvite(data.invite);
      setFormData(prev => ({
        ...prev,
        name: data.invite.name || "",
        email: data.invite.email || ""
      }));

      console.log("✅ Dados carregados com sucesso!");

    } catch (error) {
      console.error("❌ Erro ao carregar convite:", error);
      console.error("❌ Stack:", error.stack);
      setError("Erro ao carregar convite: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Upload usando FormData direto para a API (sem SDK pois não há autenticação)
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      
      const response = await fetch(`${window.location.origin}/.integrations/Core/UploadFile`, {
        method: 'POST',
        body: formDataUpload
      });
      
      const data = await response.json();
      
      if (data.file_url) {
        setFormData({ ...formData, profile_picture_url: data.file_url });
        toast.success("Foto enviada!");
      } else {
        throw new Error("Erro no upload");
      }
    } catch (error) {
      console.error("Erro upload:", error);
      toast.error("Erro ao enviar foto. Você pode continuar sem foto.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log("🔵 SUBMIT HANDLER v20251218-1600 - BACKEND ONLY!");

    if (!formData.accept_terms) {
      toast.error("Você precisa aceitar os termos de uso");
      return;
    }

    setSubmitting(true);

    try {
      console.log("📤 [v4-SDK] Chamando via SDK...");

      const data = await registerEmployeeViaBackend(invite.invite_token, formData);

      console.log("✅ Resposta:", data);

      if (data.success) {
        toast.success("✅ Cadastro realizado com sucesso!", { duration: 5000 });
        
        // Redirecionar para página de aguardando aprovação
        navigate(createPageUrl("CadastroSucesso"));
      } else {
        throw new Error(data.error || "Erro ao finalizar cadastro");
      }

    } catch (error) {
      console.error("❌ Erro ao finalizar cadastro:", error);
      toast.error("Erro: " + (error.message || "Erro ao finalizar cadastro. Tente novamente."), { duration: 6000 });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700">
        <Loader2 className="w-12 h-12 animate-spin text-white mb-4" />
        <p className="text-white text-lg">Validando convite...</p>
        <p className="text-white/70 text-sm mt-2">Aguarde um momento</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Ops!</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => navigate(createPageUrl("Home"))} variant="outline">
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
      {/* Header com logo da oficina */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-white">
              <h1 className="text-2xl font-bold">{workshop?.name || "Sistema Oficinas Master"}</h1>
              <p className="text-white/80 text-sm">Plataforma de Gestão</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <Card className="shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-3xl mb-2">
              Olá, {invite?.name || 'Colaborador'}! 👋
            </CardTitle>
            <p className="text-lg text-gray-700 mb-4">
              Você foi convidado para se juntar à equipe {workshop?.name && (
                <span className="font-bold text-blue-700">{workshop.name}</span>
              )}
            </p>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-left">
              <p className="text-sm text-blue-900 font-semibold mb-2">
                📋 Complete seu cadastro para acessar a plataforma
              </p>
              <div className="flex items-start gap-3">
                <Briefcase className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-800">
                    <strong>Cargo:</strong> {invite?.position || 'Colaborador'}
                  </p>
                  <p className="text-sm text-blue-800">
                    <strong>Área:</strong> {invite?.area ? invite.area.charAt(0).toUpperCase() + invite.area.slice(1) : 'Não especificada'}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Foto de Perfil */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  {formData.profile_picture_url ? (
                    <img 
                      src={formData.profile_picture_url} 
                      alt="Perfil" 
                      className="w-24 h-24 rounded-full object-cover border-4 border-blue-100"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-4 border-blue-100">
                      <User className="w-10 h-10 text-gray-400" />
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors">
                    <Upload className="w-4 h-4 text-white" />
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
                <p className="text-sm text-gray-500 mt-2">Foto de perfil (opcional)</p>
              </div>

              {/* Dados Pessoais */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="mt-1 bg-gray-50"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* ALERTA PRINCIPAL - ACESSO PRÉ-APROVADO */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-5 shadow-md">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-400 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-green-900" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-green-900 text-lg mb-2">
                      ✅ Acesso Pré-Aprovado pelo Gestor
                    </h3>
                    <p className="text-green-800 text-sm leading-relaxed mb-3">
                      Seu acesso já foi <strong className="text-green-900">pré-aprovado</strong> pelo gestor da oficina. 
                      Após completar o cadastro, você poderá fazer login imediatamente!
                    </p>
                    <div className="bg-green-100 rounded p-3 text-xs text-green-900">
                      <p className="font-semibold mb-1">📝 Próximos passos:</p>
                      <ol className="list-decimal ml-4 space-y-1">
                        <li>Complete este cadastro com seus dados</li>
                        <li>Crie sua senha de acesso</li>
                        <li>Faça login no sistema ✅</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>

              {/* Termos */}
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <Checkbox
                  id="terms"
                  checked={formData.accept_terms}
                  onCheckedChange={(checked) => setFormData({ ...formData, accept_terms: checked })}
                />
                <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer">
                  Li e aceito os <a href="#" className="text-blue-600 hover:underline">Termos de Uso</a> e 
                  a <a href="#" className="text-blue-600 hover:underline">Política de Privacidade</a> da plataforma.
                </label>
              </div>



              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 py-7 text-lg font-bold shadow-lg"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Finalizando Cadastro...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Finalizar Cadastro
                  </>
                )}
              </Button>
              <p className="text-center text-xs text-gray-500 mt-3">
                Ao clicar, você será redirecionado para criar sua senha de acesso
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}