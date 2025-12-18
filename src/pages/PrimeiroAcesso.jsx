import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle2, Upload, User, Lock, AlertCircle, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function PrimeiroAcesso() {
  // VERSION MARKER: v20251218-1600-BACKEND-ONLY
  console.log("🆕 PrimeiroAcesso v20251218-1600-BACKEND-ONLY carregado");
  
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

      // Buscar convite diretamente no banco (público)
      console.log("📡 Buscando convite...");
      
      const invites = await base44.entities.EmployeeInvite.filter({ invite_token: token });
      const foundInvite = invites[0];
      
      console.log("📥 Convite encontrado:", foundInvite);
      
      if (!foundInvite) {
        setError("Convite não encontrado ou link inválido. Solicite um novo convite ao gestor.");
        setLoading(false);
        return;
      }

      // Verificar se expirou
      if (foundInvite.expires_at && new Date(foundInvite.expires_at) < new Date()) {
        setError("Este convite expirou. Solicite um novo convite ao gestor.");
        setLoading(false);
        return;
      }

      // Verificar status
      if (foundInvite.status === 'concluido') {
        setError("Este convite já foi utilizado completamente. Faça login na sua conta.");
        setLoading(false);
        return;
      }

      // Buscar oficina se houver workshop_id
      let foundWorkshop = null;
      if (foundInvite.workshop_id) {
        try {
          const workshops = await base44.entities.Workshop.filter({ id: foundInvite.workshop_id });
          foundWorkshop = workshops[0];
        } catch (e) {
          console.log("Aviso: não foi possível carregar oficina");
        }
      }
      
      const data = { success: true, invite: foundInvite, workshop: foundWorkshop };
      
      if (!data.success) {
        setError(data.error || "Convite não encontrado ou inválido.");
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
      console.log("📤 Chamando FUNÇÃO BACKEND registerInvitedEmployee...");

      // Usar fetch direto pois SDK requer autenticação
      const response = await fetch(`${window.location.origin}/.functions/registerInvitedEmployee`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          token: invite.invite_token,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          profile_picture_url: formData.profile_picture_url
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Resposta do backend:", data);

      if (data.success) {
        toast.success("✅ Cadastro confirmado! Redirecionando para criar sua senha...", { duration: 5000 });
        
        // Informar sobre aprovação pendente
        toast.info("⏳ Seu acesso será liberado após aprovação do administrador", { duration: 6000 });
        
        // Redirecionar para login após 3 segundos
        setTimeout(() => {
          window.location.href = `${window.location.origin}/login`;
        }, 3000);
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
              <h1 className="text-2xl font-bold">{workshop?.name || "Oficina"}</h1>
              <p className="text-white/80 text-sm">Oficinas Master</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <Card className="shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl">Bem-vindo(a), {invite?.name}!</CardTitle>
            <p className="text-gray-600 mt-2">
              Complete seu cadastro para acessar a plataforma como <strong>{invite?.position}</strong>
            </p>
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

              {/* Informações do Cargo */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Suas Informações</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-600">Cargo:</span>
                    <p className="font-medium text-blue-900">{invite?.position}</p>
                  </div>
                  <div>
                    <span className="text-blue-600">Área:</span>
                    <p className="font-medium text-blue-900 capitalize">{invite?.area}</p>
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

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800 flex items-start">
                  <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0 text-blue-600" />
                  <span>
                    <strong>Como funciona:</strong><br/>
                    1. Ao clicar em "Confirmar", seu cadastro será salvo<br/>
                    2. Você será redirecionado para criar sua senha de acesso<br/>
                    3. Após criar a senha, aguarde a aprovação do administrador<br/>
                    4. Você receberá um email quando seu acesso for liberado
                  </span>
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 py-6 text-lg"
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                )}
                Confirmar Cadastro e Criar Senha
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}