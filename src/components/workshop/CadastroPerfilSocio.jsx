import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, User, Upload } from "lucide-react";
import { toast } from "sonner";

export default function CadastroPerfilSocio({ workshop, user, onComplete, onBack }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingEmployee, setExistingEmployee] = useState(null);
  const [profiles, setProfiles] = useState([]);
  
  const [formData, setFormData] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
    cpf: "",
    rg: "",
    telefone: "",
    position: "Sócio Proprietário",
    job_role: "socio",
    area: "gerencia",
    profile_picture_url: "",
    is_partner: true,
    profile_id: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Buscar se já existe Employee para este usuário
      const employees = await base44.entities.Employee.filter({ 
        user_id: user.id,
        workshop_id: workshop.id 
      });
      
      if (employees && employees.length > 0) {
        const emp = employees[0];
        setExistingEmployee(emp);
        setFormData({
          full_name: emp.full_name || user?.full_name || "",
          email: emp.email || user?.email || "",
          cpf: emp.cpf || "",
          rg: emp.rg || "",
          telefone: emp.telefone || "",
          position: emp.position || "Sócio Proprietário",
          job_role: emp.job_role || "socio",
          area: emp.area || "gerencia",
          profile_picture_url: emp.profile_picture_url || "",
          is_partner: emp.is_partner ?? true,
          profile_id: emp.profile_id || ""
        });
      }

      // Buscar perfis disponíveis para sócio
      const allProfiles = await base44.entities.UserProfile.list();
      const filtered = allProfiles.filter(p => p.status === 'ativo');
      setProfiles(filtered);

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
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
      console.error("Erro upload:", error);
      toast.error("Erro ao enviar foto");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.full_name || !formData.email) {
      toast.error("Nome e email são obrigatórios");
      return;
    }

    setSaving(true);
    try {
      const employeeData = {
        workshop_id: workshop.id,
        owner_id: workshop.owner_id || user.id,
        user_id: user.id,
        full_name: formData.full_name,
        email: formData.email,
        cpf: formData.cpf,
        rg: formData.rg,
        telefone: formData.telefone,
        position: formData.position,
        job_role: formData.job_role,
        area: formData.area,
        profile_picture_url: formData.profile_picture_url,
        is_partner: formData.is_partner,
        profile_id: formData.profile_id,
        tipo_vinculo: 'cliente',
        status: 'ativo',
        user_status: 'ativo',
        hire_date: new Date().toISOString().split('T')[0]
      };

      if (existingEmployee) {
        await base44.entities.Employee.update(existingEmployee.id, employeeData);
        toast.success("Perfil atualizado!");
      } else {
        await base44.entities.Employee.create(employeeData);
        toast.success("Perfil de sócio criado!");
      }

      // Atualizar dados no User também
      await base44.auth.updateMe({
        workshop_id: workshop.id,
        full_name: formData.full_name
      });

      // Pequeno delay para garantir sincronização
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onComplete();
    } catch (error) {
      console.error("Erro ao salvar perfil:", error);
      toast.error("Erro: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-6 h-6 text-blue-600" />
          Meu Perfil como Sócio/Proprietário
        </CardTitle>
        <CardDescription>
          Complete seus dados pessoais para finalizar o cadastro
        </CardDescription>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="full_name">Nome Completo *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="mt-1 bg-gray-50"
              />
            </div>

            <div>
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                placeholder="000.000.000-00"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="rg">RG</Label>
              <Input
                id="rg"
                value={formData.rg}
                onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
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
              <Label htmlFor="position">Cargo</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="profile_id">Perfil de Acesso</Label>
              <Select value={formData.profile_id} onValueChange={(value) => setFormData({ ...formData, profile_id: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione um perfil" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between pt-6 border-t">
            <Button type="button" variant="outline" onClick={onBack}>
              Voltar
            </Button>
            <Button 
              type="submit" 
              className="bg-green-600 hover:bg-green-700 shadow-lg"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Finalizar Cadastro
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}