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

      // Validar token via backend (sem autenticação necessária)
      console.log("📡 Chamando validateInviteToken...");
      const response = await fetch(`${window.location.origin}/.functions/validateInviteToken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const data = await response.json();
      console.log("📥 Resposta recebida:", data);
      
      if (!data.success) {
        setError(data.error || "Convite não encontrado ou inválido.");
        setLoading(false);
        return;
      }

      const { invite: foundInvite, workshop: foundWorkshop } = data;

      if (foundWorkshop) {
        setWorkshop(foundWorkshop);
      }

      setInvite(foundInvite);
      setFormData({
        ...formData,
        name: foundInvite.name || "",
        email: foundInvite.email || ""
      });

    } catch (error) {
      console.error("❌ Erro ao carregar convite:", error);
      setError("Erro ao carregar convite. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, profile_picture_url: file_url });
      toast.success("Foto enviada!");
    } catch (error) {
      toast.error("Erro ao enviar foto");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.accept_terms) {
      toast.error("Você precisa aceitar os termos de uso");
      return;
    }

    setSubmitting(true);

    try {
      // Chamar função de backend para registrar colaborador (sem autenticação)
      console.log("📤 Registrando colaborador...");
      const response = await fetch(`${window.location.origin}/.functions/registerInvitedEmployee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: invite.invite_token,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          profile_picture_url: formData.profile_picture_url
        })
      });

      const data = await response.json();
      console.log("📥 Resposta registro:", data);

      if (data.success) {
        toast.success("Cadastro confirmado! Agora você pode fazer login.");
        
        // Redirecionar para login após 2 segundos
        setTimeout(() => {
          window.location.href = `${window.location.origin}/login`;
        }, 2000);
      } else {
        throw new Error(data.error || "Erro ao finalizar cadastro");
      }

    } catch (error) {
      console.error("❌ Erro ao finalizar cadastro:", error);
      toast.error(error.message || "Erro ao finalizar cadastro. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700">
        <Loader2 className="w-12 h-12 animate-spin text-white" />
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

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800 flex items-start">
                  <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span>
                    Ao clicar em continuar, você será redirecionado para <strong>criar sua senha</strong> de acesso. 
                    Certifique-se de usar o mesmo e-mail: <strong>{formData.email}</strong>.
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
                Confirmar e Criar Senha
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}