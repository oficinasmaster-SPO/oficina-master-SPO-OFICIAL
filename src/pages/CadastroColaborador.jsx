import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, UserPlus, User, DollarSign, TrendingUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function CadastroColaborador() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [jobDescriptions, setJobDescriptions] = useState([]);
  const [profiles, setProfiles] = useState([]);
  
  const [formData, setFormData] = useState({
    workshop_id: "",
    full_name: "",
    cpf: "",
    rg: "",
    data_nascimento: "",
    telefone: "",
    email: "",
    endereco: {
      rua: "",
      numero: "",
      bairro: "",
      cidade: "",
      estado: "",
      cep: ""
    },
    position: "",
    job_role: "outros",
    user_profile_id: "",
    area: "",
    hire_date: "",
    salary: 0,
    commission: 0,
    bonus: 0,
    benefits: [],
    production_parts: 0,
    production_parts_sales: 0,
    production_services: 0,
    status: "ativo",
    job_description_id: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const workshops = await base44.entities.Workshop.list();
      const userWorkshop = workshops.find(w => w.owner_id === currentUser.id);
      
      if (userWorkshop) {
        setWorkshop(userWorkshop);
        setFormData(prev => ({ ...prev, workshop_id: userWorkshop.id }));
      }

      const descriptions = await base44.entities.JobDescription.list();
      setJobDescriptions(descriptions.filter(d => !userWorkshop || d.workshop_id === userWorkshop.id));

      const allProfiles = await base44.entities.UserProfile.list();
      setProfiles(allProfiles.filter(p => p.status === 'ativo'));
    } catch (error) {
      toast.error("Você precisa estar logado");
      base44.auth.redirectToLogin(createPageUrl("CadastroColaborador"));
    } finally {
      setLoading(false);
    }
  };

  const addBenefit = () => {
    setFormData({
      ...formData,
      benefits: [...formData.benefits, { nome: "", valor: 0 }]
    });
  };

  const removeBenefit = (index) => {
    const newBenefits = formData.benefits.filter((_, i) => i !== index);
    setFormData({ ...formData, benefits: newBenefits });
  };

  const updateBenefit = (index, field, value) => {
    const newBenefits = [...formData.benefits];
    newBenefits[index][field] = field === 'valor' ? parseFloat(value) || 0 : value;
    setFormData({ ...formData, benefits: newBenefits });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.full_name || !formData.position || !formData.email) {
      toast.error("Preencha nome, cargo e e-mail");
      return;
    }

    setSubmitting(true);

    try {
      const totalCost = formData.salary + formData.commission + formData.bonus + 
        formData.benefits.reduce((sum, b) => sum + (b.valor || 0), 0);
      
      const totalProduction = formData.production_parts + formData.production_parts_sales + formData.production_services;
      const productionPercentage = totalCost > 0 ? (totalProduction / totalCost) * 100 : 0;

      // Verificar se é sócio e atualizar Workshop
      const isPartner = formData.job_role === 'socio';
      
      // Buscar perfil selecionado para obter as roles
      let userRoles = [];
      if (formData.user_profile_id) {
        const selectedProfile = profiles.find(p => p.id === formData.user_profile_id);
        if (selectedProfile) {
          userRoles = selectedProfile.roles || [];
        }
      }

      // Salvar Employee com owner_id e profile_id
      const newEmployee = await base44.entities.Employee.create({
        ...formData,
        owner_id: workshop.owner_id,
        profile_id: formData.user_profile_id || null,
        production_percentage: productionPercentage,
        is_partner: isPartner
      });

      // Se for sócio, adicionar ao array de partner_ids do Workshop
      if (isPartner && workshop) {
        const currentPartnerIds = workshop.partner_ids || [];
        if (!currentPartnerIds.includes(user.id)) {
          await base44.entities.Workshop.update(workshop.id, {
            partner_ids: [...currentPartnerIds, user.id]
          });
        }
      }

      // Criar User no banco de dados
      let userId = null;
      try {
        const userResponse = await base44.functions.invoke('createUserForEmployee', {
          employee_data: {
            email: formData.email,
            full_name: formData.full_name,
            position: formData.position,
            job_role: formData.job_role,
            area: formData.area,
            telefone: formData.telefone,
            profile_picture_url: formData.profile_picture_url,
            hire_date: formData.hire_date,
            is_partner: isPartner,
            user_profile_id: formData.user_profile_id,
            roles: userRoles
          },
          workshop_id: workshop.id,
          employee_id: newEmployee.id
        });

        if (userResponse.data.success) {
          userId = userResponse.data.user_id;
          // Vincular User ao Employee
          await base44.entities.Employee.update(newEmployee.id, {
            user_id: userId
          });
        }
      } catch (userError) {
        console.error("Erro ao criar user:", userError);
        toast.error("Colaborador criado, mas houve erro ao criar o usuário do sistema");
      }

      // Criar convite e enviar e-mail
      try {
        const inviteToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const invite = await base44.entities.EmployeeInvite.create({
          workshop_id: workshop.id,
          employee_id: newEmployee.id,
          name: formData.full_name,
          email: formData.email,
          position: formData.position,
          area: formData.area,
          job_role: formData.job_role,
          invite_token: inviteToken,
          expires_at: expiresAt.toISOString(),
          status: "enviado"
        });

        // Enviar e-mail de convite
        const emailResponse = await base44.functions.invoke('sendEmployeeInvite', {
          name: formData.full_name,
          email: formData.email,
          position: formData.position,
          area: formData.area,
          job_role: formData.job_role,
          workshop_id: workshop.id,
          employee_id: newEmployee.id
        });

        if (emailResponse.data.success) {
          toast.success("Colaborador cadastrado e e-mail de convite enviado!");
        } else {
          toast.success("Colaborador cadastrado! E-mail não foi enviado, mas convite está disponível.");
        }
      } catch (inviteError) {
        console.log("Erro ao enviar convite:", inviteError);
        toast.success("Colaborador cadastrado! Mas houve erro ao enviar o e-mail de convite.");
      }
      
      // Perguntar ou redirecionar para convite
      if (window.confirm("Colaborador cadastrado! Deseja enviar o convite de acesso ao portal agora?")) {
        const newEmployees = await base44.entities.Employee.filter({ email: formData.email }, '-created_date', 1);
        if (newEmployees && newEmployees.length > 0) {
           navigate(createPageUrl("ConvidarColaborador") + `?id=${newEmployees[0].id}`);
           return;
        }
      }
      
      navigate(createPageUrl("Colaboradores"));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao cadastrar");
    } finally {
      setSubmitting(false);
    }
  };

  const totalCost = formData.salary + formData.commission + formData.bonus + 
    formData.benefits.reduce((sum, b) => sum + (b.valor || 0), 0);
  
  const totalProduction = formData.production_parts + formData.production_parts_sales + formData.production_services;
  const productionPercentage = totalCost > 0 ? ((totalProduction / totalCost) * 100).toFixed(0) : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <UserPlus className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Cadastrar Colaborador
          </h1>
          <p className="text-gray-600">
            Preencha os dados do novo colaborador
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados Pessoais */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Dados Pessoais</CardTitle>
                  <CardDescription>Informações básicas do colaborador</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome Completo *</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label>CPF</Label>
                  <Input
                    value={formData.cpf}
                    onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>
                <div>
                  <Label>RG</Label>
                  <Input
                    value={formData.rg}
                    onChange={(e) => setFormData({...formData, rg: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Data de Nascimento</Label>
                  <Input
                    type="date"
                    value={formData.data_nascimento}
                    onChange={(e) => setFormData({...formData, data_nascimento: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={formData.telefone}
                    onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-semibold text-gray-900 mb-3">Endereço</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Rua</Label>
                    <Input
                      value={formData.endereco.rua}
                      onChange={(e) => setFormData({...formData, endereco: {...formData.endereco, rua: e.target.value}})}
                    />
                  </div>
                  <div>
                    <Label>Número</Label>
                    <Input
                      value={formData.endereco.numero}
                      onChange={(e) => setFormData({...formData, endereco: {...formData.endereco, numero: e.target.value}})}
                    />
                  </div>
                  <div>
                    <Label>Bairro</Label>
                    <Input
                      value={formData.endereco.bairro}
                      onChange={(e) => setFormData({...formData, endereco: {...formData.endereco, bairro: e.target.value}})}
                    />
                  </div>
                  <div>
                    <Label>Cidade</Label>
                    <Input
                      value={formData.endereco.cidade}
                      onChange={(e) => setFormData({...formData, endereco: {...formData.endereco, cidade: e.target.value}})}
                    />
                  </div>
                  <div>
                    <Label>Estado (UF)</Label>
                    <Input
                      value={formData.endereco.estado}
                      onChange={(e) => setFormData({...formData, endereco: {...formData.endereco, estado: e.target.value.toUpperCase()}})}
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <Label>CEP</Label>
                    <Input
                      value={formData.endereco.cep}
                      onChange={async (e) => {
                        const cep = e.target.value.replace(/\D/g, '');
                        setFormData({...formData, endereco: {...formData.endereco, cep: e.target.value}});
                        
                        if (cep.length === 8) {
                          try {
                            const result = await base44.functions.invoke('consultarCEP', { cep });
                            if (result.data && !result.data.erro) {
                              setFormData(prev => ({
                                ...prev,
                                endereco: {
                                  ...prev.endereco,
                                  rua: result.data.logradouro || prev.endereco.rua,
                                  bairro: result.data.bairro || prev.endereco.bairro,
                                  cidade: result.data.localidade || prev.endereco.cidade,
                                  estado: result.data.uf || prev.endereco.estado,
                                  cep: e.target.value
                                }
                              }));
                              toast.success("Endereço preenchido automaticamente!");
                            }
                          } catch (error) {
                            console.error("Erro ao buscar CEP:", error);
                          }
                        }
                      }}
                      placeholder="00000-000"
                      maxLength={9}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dados da Contratação */}
          <Card>
            <CardHeader>
              <CardTitle>Dados da Contratação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Cargo/Função (Descrição) *</Label>
                  <Input
                    value={formData.position}
                    onChange={(e) => setFormData({...formData, position: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label>Perfil de Usuário</Label>
                  <Select 
                    value={formData.user_profile_id} 
                    onValueChange={(value) => {
                      const selectedProfile = profiles.find(p => p.id === value);
                      if (selectedProfile) {
                        // Se o perfil usa job_role, pegar o primeiro job_role da lista
                        const newJobRole = selectedProfile.permission_type === 'job_role' && 
                                          selectedProfile.job_roles?.length > 0 
                                          ? selectedProfile.job_roles[0] 
                                          : formData.job_role;
                        
                        setFormData({
                          ...formData, 
                          user_profile_id: value,
                          job_role: newJobRole
                        });
                      } else {
                        setFormData({...formData, user_profile_id: value});
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o perfil..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Nenhum perfil</SelectItem>
                      {profiles.map(profile => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.name} ({profile.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    O perfil define as permissões do colaborador no sistema
                  </p>
                </div>
                <div>
                  <Label>Função do Sistema (job_role)</Label>
                  <Select value={formData.job_role} onValueChange={(value) => setFormData({...formData, job_role: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="socio">Sócio</SelectItem>
                      <SelectItem value="diretor">Diretor</SelectItem>
                      <SelectItem value="supervisor_loja">Supervisor de Loja</SelectItem>
                      <SelectItem value="gerente">Gerente</SelectItem>
                      <SelectItem value="lider_tecnico">Líder Técnico</SelectItem>
                      <SelectItem value="financeiro">Financeiro</SelectItem>
                      <SelectItem value="rh">RH</SelectItem>
                      <SelectItem value="tecnico">Técnico / Mecânico / Eletricista</SelectItem>
                      <SelectItem value="funilaria_pintura">Funileiro / Pintor / Chapeador</SelectItem>
                      <SelectItem value="comercial">Comercial / Telemarketing</SelectItem>
                      <SelectItem value="consultor_vendas">Consultor de Vendas</SelectItem>
                      <SelectItem value="marketing">Marketing / Tráfego</SelectItem>
                      <SelectItem value="estoque">Estoque</SelectItem>
                      <SelectItem value="administrativo">Administrativo</SelectItem>
                      <SelectItem value="motoboy">Moto Boy</SelectItem>
                      <SelectItem value="lavador">Lavador</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Área</Label>
                  <Select value={formData.area} onValueChange={(value) => setFormData({...formData, area: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendas">Vendas</SelectItem>
                      <SelectItem value="comercial">Comercial</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="tecnico">Técnico</SelectItem>
                      <SelectItem value="administrativo">Administrativo</SelectItem>
                      <SelectItem value="financeiro">Financeiro</SelectItem>
                      <SelectItem value="gerencia">Gerência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data de Contratação</Label>
                  <Input
                    type="date"
                    value={formData.hire_date}
                    onChange={(e) => setFormData({...formData, hire_date: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label>Descrição de Cargo (Opcional)</Label>
                <Select 
                  value={formData.job_description_id} 
                  onValueChange={(value) => setFormData({...formData, job_description_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma descrição de cargo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Nenhuma</SelectItem>
                    {jobDescriptions.map(desc => (
                      <SelectItem key={desc.id} value={desc.id}>
                        {desc.cargo} - {desc.area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Remuneração e Benefícios */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Remuneração e Benefícios</CardTitle>
                  <CardDescription>Salário, comissões e vales</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Salário Fixo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.salary}
                    onChange={(e) => setFormData({...formData, salary: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label>Comissão Mensal (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.commission}
                    onChange={(e) => setFormData({...formData, commission: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label>Bonificação/Prêmio (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.bonus}
                    onChange={(e) => setFormData({...formData, bonus: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Vales e Benefícios</h3>
                  <Button type="button" size="sm" onClick={addBenefit}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
                {formData.benefits.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhum benefício cadastrado</p>
                ) : (
                  <div className="space-y-2">
                    {formData.benefits.map((benefit, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <Input
                          placeholder="Nome do vale (ex: Alimentação)"
                          value={benefit.nome}
                          onChange={(e) => updateBenefit(index, 'nome', e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Valor"
                          value={benefit.valor}
                          onChange={(e) => updateBenefit(index, 'valor', e.target.value)}
                          className="w-32"
                        />
                        <Button type="button" size="icon" variant="destructive" onClick={() => removeBenefit(index)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t bg-blue-50 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-900">Custo Total Mensal</p>
                <p className="text-2xl font-bold text-blue-600">R$ {totalCost.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Produção */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Produção</CardTitle>
                  <CardDescription>Valores de produção mensal</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Produção de Peças (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.production_parts}
                    onChange={(e) => setFormData({...formData, production_parts: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label>Produção Vendas de Peças (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.production_parts_sales}
                    onChange={(e) => setFormData({...formData, production_parts_sales: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label>Produção de Serviços (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.production_services}
                    onChange={(e) => setFormData({...formData, production_services: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="pt-4 border-t bg-green-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-green-900">Produção Total</p>
                    <p className="text-2xl font-bold text-green-600">R$ {totalProduction.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-900">% sobre Custos</p>
                    <p className={`text-2xl font-bold ${productionPercentage >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                      {productionPercentage}%
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(createPageUrl("Colaboradores"))}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 px-8"
            >
              {submitting ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Salvando...</>
              ) : (
                <><Save className="w-5 h-5 mr-2" /> Cadastrar Colaborador</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}