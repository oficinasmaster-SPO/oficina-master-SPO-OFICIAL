import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Building2, MapPin, TrendingUp, Users, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function Cadastro() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [existingWorkshop, setExistingWorkshop] = useState(null);
  const [formData, setFormData] = useState({
    // Dados da oficina
    name: "",
    cnpj: "",
    phone: "",
    whatsapp: "",
    
    // Endereço
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    country: "Brasil",
    
    // Perfil
    segment: "",
    segment_other: "",
    monthly_revenue: "",
    employees_count: "",
    service_orders_per_month: "",
    boxes_count: "",
    years_in_business: "",
    services_offered: [],
    services_other: "",
    has_erp: false,
    erp_name: "",
    main_challenge: "",
    main_challenge_other: ""
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      // Verificar se já tem workshop cadastrado
      const workshops = await base44.entities.Workshop.list();
      const userWorkshop = workshops.find(w => w.owner_id === currentUser.id);
      
      if (userWorkshop) {
        setExistingWorkshop(userWorkshop);
        // Se já tem workshop, preenche o formulário com os dados
        setFormData({
          name: userWorkshop.name || "",
          cnpj: userWorkshop.cnpj || "",
          phone: userWorkshop.phone || "",
          whatsapp: userWorkshop.whatsapp || "",
          cep: userWorkshop.cep || "",
          street: userWorkshop.street || "",
          number: userWorkshop.number || "",
          complement: userWorkshop.complement || "",
          neighborhood: userWorkshop.neighborhood || "",
          city: userWorkshop.city || "",
          state: userWorkshop.state || "",
          country: userWorkshop.country || "Brasil",
          segment: userWorkshop.segment || "",
          segment_other: userWorkshop.segment_other || "",
          monthly_revenue: userWorkshop.monthly_revenue || "",
          employees_count: userWorkshop.employees_count || "",
          service_orders_per_month: userWorkshop.service_orders_per_month || "",
          boxes_count: userWorkshop.boxes_count || "",
          years_in_business: userWorkshop.years_in_business || "",
          services_offered: userWorkshop.services_offered || [],
          services_other: userWorkshop.services_other || "",
          has_erp: userWorkshop.has_erp || false,
          erp_name: userWorkshop.erp_name || "",
          main_challenge: userWorkshop.main_challenge || "",
          main_challenge_other: userWorkshop.main_challenge_other || ""
        });
      }
    } catch (error) {
      console.error("Erro ao carregar usuário:", error);
      toast.error("Você precisa estar logado para cadastrar uma oficina");
      base44.auth.redirectToLogin(createPageUrl("Cadastro"));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validação dos campos obrigatórios
    if (!formData.name || !formData.city || !formData.state || !formData.segment || 
        !formData.monthly_revenue || !formData.employees_count || !formData.years_in_business) {
      toast.error("Preencha todos os campos obrigatórios marcados com *");
      return;
    }

    setLoading(true);

    try {
      const workshopData = {
        name: formData.name,
        cnpj: formData.cnpj || "",
        phone: formData.phone || "",
        whatsapp: formData.whatsapp || "",
        cep: formData.cep || "",
        street: formData.street || "",
        number: formData.number || "",
        complement: formData.complement || "",
        neighborhood: formData.neighborhood || "",
        city: formData.city,
        state: formData.state,
        country: formData.country || "Brasil",
        segment: formData.segment,
        segment_other: formData.segment_other || "",
        monthly_revenue: formData.monthly_revenue,
        employees_count: formData.employees_count,
        service_orders_per_month: formData.service_orders_per_month || "",
        boxes_count: formData.boxes_count || 0,
        years_in_business: formData.years_in_business,
        services_offered: formData.services_offered || [],
        services_other: formData.services_other || "",
        has_erp: formData.has_erp || false,
        erp_name: formData.erp_name || "",
        main_challenge: formData.main_challenge || "",
        main_challenge_other: formData.main_challenge_other || "",
        owner_id: user.id
      };

      if (existingWorkshop) {
        await base44.entities.Workshop.update(existingWorkshop.id, workshopData);
        toast.success("Dados da oficina atualizados com sucesso!");
      } else {
        await base44.entities.Workshop.create(workshopData);
        toast.success("Oficina cadastrada com sucesso!");
      }

      // Aguardar um pouco antes de navegar para garantir que salvou
      setTimeout(() => {
        navigate(createPageUrl("Questionario"));
      }, 500);

    } catch (error) {
      console.error("Erro ao salvar oficina:", error);
      toast.error("Erro ao salvar dados da oficina. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleServiceToggle = (service) => {
    setFormData(prev => ({
      ...prev,
      services_offered: prev.services_offered.includes(service)
        ? prev.services_offered.filter(s => s !== service)
        : [...prev.services_offered, service]
    }));
  };

  const searchCEP = async () => {
    if (!formData.cep || formData.cep.length < 8) {
      toast.error("Digite um CEP válido");
      return;
    }
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${formData.cep.replace(/\D/g, '')}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state
        }));
        toast.success("CEP encontrado!");
      } else {
        toast.error("CEP não encontrado");
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      toast.error("Erro ao buscar CEP");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            {existingWorkshop ? "Atualize os dados da sua oficina" : "Cadastre sua oficina para gerar o diagnóstico"}
          </h1>
          <p className="text-lg text-gray-600">
            Esses dados são importantes para personalizar seu plano de ação e comparar sua oficina com outras da sua região.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Dados da Oficina */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Dados da Oficina</CardTitle>
                  <CardDescription>Informações básicas da sua empresa</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="name">Nome da Oficina *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Auto Center Silva"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone Fixo</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="(00) 0000-0000"
                  />
                </div>
                <div>
                  <Label htmlFor="whatsapp">WhatsApp Comercial</Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Endereço */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Endereço Completo</CardTitle>
                  <CardDescription>Localização da oficina</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="cep">CEP</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cep"
                      value={formData.cep}
                      onChange={(e) => setFormData({...formData, cep: e.target.value})}
                      placeholder="00000-000"
                    />
                    <Button type="button" onClick={searchCEP} variant="outline">
                      Buscar
                    </Button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                  <Label htmlFor="street">Rua/Logradouro</Label>
                  <Input
                    id="street"
                    value={formData.street}
                    onChange={(e) => setFormData({...formData, street: e.target.value})}
                    placeholder="Nome da rua"
                  />
                </div>
                <div>
                  <Label htmlFor="number">Número</Label>
                  <Input
                    id="number"
                    value={formData.number}
                    onChange={(e) => setFormData({...formData, number: e.target.value})}
                    placeholder="123"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    value={formData.complement}
                    onChange={(e) => setFormData({...formData, complement: e.target.value})}
                    placeholder="Sala, andar, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({...formData, neighborhood: e.target.value})}
                    placeholder="Nome do bairro"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">Cidade *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    placeholder="Nome da cidade"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">Estado (UF) *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value.toUpperCase()})}
                    placeholder="SP"
                    maxLength={2}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Perfil da Oficina */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Perfil da Oficina</CardTitle>
                  <CardDescription>Informações para análise e segmentação</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="segment">Segmento Principal *</Label>
                  <Select value={formData.segment} onValueChange={(value) => setFormData({...formData, segment: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mecanica_leve">Mecânica Leve</SelectItem>
                      <SelectItem value="mecanica_pesada">Mecânica Pesada / Caminhões</SelectItem>
                      <SelectItem value="motos">Motos</SelectItem>
                      <SelectItem value="centro_automotivo">Centro Automotivo (Multi-serviços)</SelectItem>
                      <SelectItem value="premium">Premium / Alta Performance</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.segment === "outro" && (
                  <div>
                    <Label htmlFor="segment_other">Especifique o Segmento</Label>
                    <Input
                      id="segment_other"
                      value={formData.segment_other}
                      onChange={(e) => setFormData({...formData, segment_other: e.target.value})}
                      placeholder="Qual segmento?"
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="monthly_revenue">Faturamento Médio Mensal *</Label>
                  <Select value={formData.monthly_revenue} onValueChange={(value) => setFormData({...formData, monthly_revenue: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ate_50k">Até R$ 50.000</SelectItem>
                      <SelectItem value="50k_100k">De R$ 50.001 a R$ 100.000</SelectItem>
                      <SelectItem value="100k_200k">De R$ 100.001 a R$ 200.000</SelectItem>
                      <SelectItem value="acima_200k">Acima de R$ 200.000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="employees_count">Quantidade de Colaboradores *</Label>
                  <Select value={formData.employees_count} onValueChange={(value) => setFormData({...formData, employees_count: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ate_3">Até 3</SelectItem>
                      <SelectItem value="4_7">De 4 a 7</SelectItem>
                      <SelectItem value="8_15">De 8 a 15</SelectItem>
                      <SelectItem value="acima_15">Acima de 15</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="years_in_business">Tempo de Mercado *</Label>
                  <Select value={formData.years_in_business} onValueChange={(value) => setFormData({...formData, years_in_business: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="menos_1_ano">Menos de 1 ano</SelectItem>
                      <SelectItem value="1_3_anos">De 1 a 3 anos</SelectItem>
                      <SelectItem value="3_5_anos">De 3 a 5 anos</SelectItem>
                      <SelectItem value="acima_5_anos">Acima de 5 anos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="service_orders_per_month">Ordens de Serviço por Mês</Label>
                  <Input
                    id="service_orders_per_month"
                    value={formData.service_orders_per_month}
                    onChange={(e) => setFormData({...formData, service_orders_per_month: e.target.value})}
                    placeholder="Ex: 50-100"
                  />
                </div>
                <div>
                  <Label htmlFor="boxes_count">Quantidade de Boxes/Elevadores</Label>
                  <Input
                    id="boxes_count"
                    type="number"
                    value={formData.boxes_count}
                    onChange={(e) => setFormData({...formData, boxes_count: parseInt(e.target.value) || ""})}
                    placeholder="Ex: 3"
                  />
                </div>
              </div>

              <div>
                <Label className="mb-3 block">Principais Serviços Oferecidos</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    "Mecânica em geral",
                    "Pneus / alinhamento / balanceamento",
                    "Injeção eletrônica",
                    "Ar-condicionado",
                    "Funilaria / pintura"
                  ].map(service => (
                    <div key={service} className="flex items-center gap-2">
                      <Checkbox
                        id={service}
                        checked={formData.services_offered.includes(service)}
                        onCheckedChange={() => handleServiceToggle(service)}
                      />
                      <Label htmlFor={service} className="cursor-pointer">
                        {service}
                      </Label>
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <Label htmlFor="services_other">Outros Serviços</Label>
                  <Input
                    id="services_other"
                    value={formData.services_other}
                    onChange={(e) => setFormData({...formData, services_other: e.target.value})}
                    placeholder="Especifique outros serviços"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Experiência com Gestão */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Experiência Atual com Gestão</CardTitle>
                  <CardDescription>Informações sobre gestão e desafios</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Checkbox
                      id="has_erp"
                      checked={formData.has_erp}
                      onCheckedChange={(checked) => setFormData({...formData, has_erp: checked})}
                    />
                    <Label htmlFor="has_erp" className="cursor-pointer">
                      Já utiliza algum sistema de gestão (ERP) na oficina?
                    </Label>
                  </div>
                  {formData.has_erp && (
                    <Input
                      id="erp_name"
                      value={formData.erp_name}
                      onChange={(e) => setFormData({...formData, erp_name: e.target.value})}
                      placeholder="Nome do sistema"
                    />
                  )}
                </div>
                <div>
                  <Label htmlFor="main_challenge">Principal Desafio Atual</Label>
                  <Select value={formData.main_challenge} onValueChange={(value) => setFormData({...formData, main_challenge: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="falta_lucro">Falta de lucro</SelectItem>
                      <SelectItem value="falta_clientes">Falta de clientes</SelectItem>
                      <SelectItem value="equipe_pessoas">Equipe / pessoas</SelectItem>
                      <SelectItem value="organizacao_processos">Organização de processos</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.main_challenge === "outro" && (
                  <div>
                    <Label htmlFor="main_challenge_other">Especifique o Desafio</Label>
                    <Input
                      id="main_challenge_other"
                      value={formData.main_challenge_other}
                      onChange={(e) => setFormData({...formData, main_challenge_other: e.target.value})}
                      placeholder="Qual desafio?"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Botão de Submissão */}
          <div className="flex justify-center">
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg px-12 py-6 rounded-full shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  {existingWorkshop ? "Atualizar e continuar" : "Salvar cadastro e iniciar diagnóstico"}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}