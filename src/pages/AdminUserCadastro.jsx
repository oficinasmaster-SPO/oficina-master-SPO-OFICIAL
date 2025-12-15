import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, ArrowLeft, Upload } from "lucide-react";
import { toast } from "sonner";

export default function AdminUserCadastro() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [userId, setUserId] = useState(null);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    rg: "",
    cpf: "",
    telefone: "",
    funcao: "consultor",
    status: "ativo",
    profile_picture_url: "",
    permissoes: {
      agendar: false,
      registrar: false,
      visualizar: true,
      editar: false,
      aceleracao: false,
      apagar: false,
      hora_atendimento: false
    }
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    
    if (id) {
      setUserId(id);
      setEditMode(true);
      loadUser(id);
    }
  }, []);

  const loadUser = async (id) => {
    setLoading(true);
    try {
      const user = await base44.entities.AdminUser.get(id);
      setFormData({
        full_name: user.full_name || "",
        email: user.email || "",
        rg: user.rg || "",
        cpf: user.cpf || "",
        telefone: user.telefone || "",
        funcao: user.funcao || "consultor",
        status: user.status || "ativo",
        profile_picture_url: user.profile_picture_url || "",
        permissoes: user.permissoes || {
          agendar: false,
          registrar: false,
          visualizar: true,
          editar: false,
          aceleracao: false,
          apagar: false,
          hora_atendimento: false
        }
      });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar usuário");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 5MB");
      return;
    }

    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, profile_picture_url: file_url });
      toast.success("Foto carregada!");
    } catch (error) {
      toast.error("Erro ao fazer upload");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePermissionToggle = (permission) => {
    setFormData({
      ...formData,
      permissoes: {
        ...formData.permissoes,
        [permission]: !formData.permissoes[permission]
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.full_name || !formData.email || !formData.funcao) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        metricas: editMode ? undefined : {
          horas_atendidas: 0,
          horas_navegacao_ativo: 0,
          horas_navegacao_inativo: 0,
          quantidade_registros: 0,
          registros_finalizados: 0,
          registros_andamento: 0,
          registros_abertos: 0,
          reunioes_realizadas: 0,
          ultimo_acesso: new Date().toISOString()
        }
      };

      if (editMode && userId) {
        await base44.entities.AdminUser.update(userId, formData);
        toast.success("Usuário atualizado com sucesso!");
      } else {
        await base44.entities.AdminUser.create(payload);
        toast.success("Usuário criado com sucesso!");
      }
      
      navigate(createPageUrl("AdminUsuarios"));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar usuário");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        
        <Button
          onClick={() => navigate(createPageUrl("AdminUsuarios"))}
          variant="ghost"
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {editMode ? "Editar Usuário Administrativo" : "Novo Usuário Administrativo"}
          </h1>
          <p className="text-gray-600">
            {editMode ? "Atualize os dados do usuário" : "Cadastre um novo membro da equipe administrativa"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Foto de Perfil */}
          <Card>
            <CardHeader>
              <CardTitle>Foto de Perfil</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {formData.profile_picture_url && (
                  <img 
                    src={formData.profile_picture_url} 
                    alt="Perfil" 
                    className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                  />
                )}
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="photo-upload"
                    disabled={uploadingPhoto}
                  />
                  <Button
                    type="button"
                    onClick={() => document.getElementById('photo-upload').click()}
                    variant="outline"
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Carregando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        {formData.profile_picture_url ? 'Trocar Foto' : 'Adicionar Foto'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dados Pessoais */}
          <Card>
            <CardHeader>
              <CardTitle>Dados Pessoais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome Completo *</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Ex: João Silva"
                    required
                  />
                </div>
                <div>
                  <Label>E-mail *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Ex: joao@email.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>RG</Label>
                  <Input
                    value={formData.rg}
                    onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                    placeholder="Ex: 12.345.678-9"
                  />
                </div>
                <div>
                  <Label>CPF</Label>
                  <Input
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    placeholder="Ex: 123.456.789-00"
                  />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="Ex: (11) 98765-4321"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Função e Status */}
          <Card>
            <CardHeader>
              <CardTitle>Função e Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Função *</Label>
                  <Select value={formData.funcao} onValueChange={(v) => setFormData({ ...formData, funcao: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="acelerador">Acelerador</SelectItem>
                      <SelectItem value="mentor">Mentor</SelectItem>
                      <SelectItem value="gerente">Gerente</SelectItem>
                      <SelectItem value="consultor">Consultor</SelectItem>
                      <SelectItem value="secretario">Secretário</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Permissões Básicas */}
          <Card className="border-2 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-600" />
                Permissões de Acesso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.keys(formData.permissoes).map((perm) => (
                  <div key={perm} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={perm}
                      checked={formData.permissoes[perm]}
                      onChange={() => handlePermissionToggle(perm)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <Label htmlFor={perm} className="text-sm capitalize cursor-pointer">
                      {perm.replace('_', ' ')}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-4">
                💡 Você pode gerenciar permissões mais detalhadas em "Gerenciar Permissões"
              </p>
            </CardContent>
          </Card>

          {/* Ações */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(createPageUrl("AdminUsuarios"))}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {editMode ? 'Atualizar Usuário' : 'Criar Usuário'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}