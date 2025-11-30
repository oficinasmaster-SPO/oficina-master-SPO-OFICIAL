import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, UserPlus, Mail, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function ConvidarColaborador() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [workshop, setWorkshop] = useState(null);
  
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    workshop_role: "",
    department: "",
    is_partner: false,
    phone: ""
  });

  const roles = [
    { value: "diretor", label: "Diretor" },
    { value: "supervisor_loja", label: "Supervisor de Loja" },
    { value: "gerente", label: "Gerente" },
    { value: "lider_tecnico", label: "Líder Técnico" },
    { value: "financeiro", label: "Financeiro" },
    { value: "rh", label: "RH" },
    { value: "tecnico", label: "Técnico / Mecânico" },
    { value: "comercial_telemarketing", label: "Comercial / Telemarketing" },
    { value: "consultor_vendas", label: "Consultor de Vendas" },
    { value: "estoque", label: "Estoque" },
    { value: "administrativo", label: "Administrativo" },
    { value: "moto_boy", label: "Moto Boy" },
    { value: "lavador", label: "Lavador" }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const workshops = await base44.entities.Workshop.list();
      const userWorkshop = workshops.find(w => w.owner_id === user.id);
      
      if (!userWorkshop) {
        toast.error("Você precisa ter uma oficina cadastrada");
        navigate(createPageUrl("Home"));
        return;
      }
      setWorkshop(userWorkshop);
    } catch (error) {
      console.error(error);
      navigate(createPageUrl("Home"));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!workshop) return;
    
    if (!formData.full_name || !formData.email || !formData.workshop_role) {
        toast.error("Preencha os campos obrigatórios");
        return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke('inviteCollaborator', {
        workshop_id: workshop.id,
        ...formData
      });

      if (response.data.success) {
        toast.success("Convite enviado com sucesso!");
        setFormData({
            full_name: "",
            email: "",
            workshop_role: "",
            department: "",
            is_partner: false,
            phone: ""
        });
      } else {
        toast.error(response.data.error || "Erro ao enviar convite");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar convite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <Button 
            variant="ghost" 
            onClick={() => navigate(createPageUrl("Colaboradores"))}
            className="mb-4"
        >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Lista
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Convidar Novo Colaborador</CardTitle>
                <CardDescription>
                  O colaborador receberá um e-mail para acessar a plataforma
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Nome Completo *</Label>
                  <Input 
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    placeholder="Ex: João da Silva"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                    <Label>E-mail *</Label>
                    <Input 
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="joao@email.com"
                        required
                    />
                    </div>
                    <div>
                    <Label>Telefone / WhatsApp</Label>
                    <Input 
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="(00) 00000-0000"
                    />
                    </div>
                </div>

                <div>
                  <Label>Função na Oficina *</Label>
                  <Select 
                    value={formData.workshop_role} 
                    onValueChange={(val) => setFormData({...formData, workshop_role: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a função" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                        {roles.map(role => (
                            <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                    <Label>Departamento (Opcional)</Label>
                    <Input 
                        value={formData.department}
                        onChange={(e) => setFormData({...formData, department: e.target.value})}
                        placeholder="Ex: Oficina 1, Administrativo..."
                    />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                    <Checkbox 
                        id="partner" 
                        checked={formData.is_partner}
                        onCheckedChange={(checked) => setFormData({...formData, is_partner: checked})}
                    />
                    <label
                        htmlFor="partner"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Este colaborador é Sócio/Proprietário (Acesso Total)
                    </label>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando Convite...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Enviar Convite de Acesso
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}