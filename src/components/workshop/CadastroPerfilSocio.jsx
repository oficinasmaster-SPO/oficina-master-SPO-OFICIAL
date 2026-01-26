import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, User, Upload, Save } from "lucide-react";
import { toast } from "sonner";
import { jobRoles } from "@/components/lib/jobRoles";

const CadastroPerfilSocio = forwardRef(({ workshop, user, onComplete, onBack, onEditingChange }, ref) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [existingEmployee, setExistingEmployee] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  
  useEffect(() => {
    if (onEditingChange) {
      onEditingChange(editing);
    }
  }, [editing, onEditingChange]);
  
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
      console.log("🔍 CadastroPerfilSocio mounted");
      
      // Carregar usuário atual para verificar role
      const authUser = await base44.auth.me();
      setCurrentUser(authUser);
      console.log("👤 currentUser.id:", authUser?.id);
      console.log("👤 currentUser.role:", authUser?.role);
      
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
      console.log("📊 allProfiles total:", allProfiles.length);
      console.log("🔍 UserProfiles com type interno:", allProfiles.filter(p => p.type === 'interno'));
      
      const filtered = allProfiles.filter(p => p.status === 'ativo');
      setProfiles(filtered);
      console.log("📊 profiles filtrados (apenas ativos):", filtered.length);

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

    // VALIDAÇÃO DE SEGURANÇA: Bloquear job_role interno para usuários comuns
    const selectedJobRole = jobRoles.find(r => r.value === formData.job_role);
    if (currentUser?.role !== 'admin' && selectedJobRole?.category === 'consultoria') {
      toast.error("Este perfil é restrito a administradores.");
      return;
    }

    // VALIDAÇÃO DE SEGURANÇA: Bloquear UserProfile interno para usuários comuns
    if (formData.profile_id) {
      const selectedProfile = profiles.find(p => p.id === formData.profile_id);
      if (currentUser?.role !== 'admin' && selectedProfile?.type === 'interno') {
        toast.error("Este perfil de acesso é restrito a administradores.");
        return;
      }
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

      setEditing(false);
    } catch (error) {
      console.error("Erro ao salvar perfil:", error);
      toast.error("Erro: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Expor função saveCurrentData para componente pai
  useImperativeHandle(ref, () => ({
    saveCurrentData: async () => {
      // Validação e salvamento sem chamar onComplete
      if (!formData.full_name || !formData.email) {
        toast.error("Nome e email são obrigatórios");
        return false;
      }

      // VALIDAÇÃO DE SEGURANÇA: Bloquear job_role interno para usuários comuns
      const selectedJobRole = jobRoles.find(r => r.value === formData.job_role);
      if (currentUser?.role !== 'admin' && selectedJobRole?.category === 'consultoria') {
        toast.error("Este perfil é restrito a administradores.");
        return false;
      }

      // VALIDAÇÃO DE SEGURANÇA: Bloquear UserProfile interno para usuários comuns
      if (formData.profile_id) {
        const selectedProfile = profiles.find(p => p.id === formData.profile_id);
        if (currentUser?.role !== 'admin' && selectedProfile?.type === 'interno') {
          toast.error("Este perfil de acesso é restrito a administradores.");
          return false;
        }
      }

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
        } else {
          const created = await base44.entities.Employee.create(employeeData);
          setExistingEmployee(created);
        }

        await base44.auth.updateMe({
          workshop_id: workshop.id,
          full_name: formData.full_name
        });

        return true;
      } catch (error) {
        console.error("Erro ao salvar perfil:", error);
        toast.error("Erro: " + error.message);
        return false;
      }
    }
  }));

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-blue-600" />
            <div>
              <CardTitle>Meu Perfil como Sócio/Proprietário</CardTitle>
              <CardDescription>Complete seus dados pessoais para finalizar o cadastro</CardDescription>
            </div>
          </div>
          {!editing ? (
            <Button onClick={() => setEditing(true)}>Editar</Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
              <Button onClick={handleSubmit}>
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </div>
          )}
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
              {editing && (
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors">
                  <Upload className="w-4 h-4 text-white" />
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              )}
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
                disabled={!editing}
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
                disabled={!editing}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="rg">RG</Label>
              <Input
                id="rg"
                value={formData.rg}
                onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                disabled={!editing}
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
                disabled={!editing}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="position">Cargo</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                disabled={!editing}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="job_role">Função do Sistema</Label>
              <Select 
                value={formData.job_role} 
                onValueChange={(value) => setFormData({ ...formData, job_role: value })}
                disabled={!editing}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione uma função" />
                </SelectTrigger>
                <SelectContent>
                  {(currentUser?.role === 'admin' 
                    ? jobRoles 
                    : jobRoles.filter(role => role.category !== 'consultoria')
                  ).map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="profile_id">Perfil de Acesso</Label>
              <Select 
                value={formData.profile_id} 
                onValueChange={(value) => setFormData({ ...formData, profile_id: value })}
                disabled={!editing}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione um perfil" />
                </SelectTrigger>
                <SelectContent>
                  {(currentUser?.role === 'admin'
                    ? profiles
                    : profiles.filter(p => p.type !== 'interno')
                  ).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>


        </form>
      </CardContent>
    </Card>
  );
});

CadastroPerfilSocio.displayName = "CadastroPerfilSocio";

export default CadastroPerfilSocio;