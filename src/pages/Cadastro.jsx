import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Building2, CheckCircle2, FileText, MapPin, Wrench, StickyNote, Lightbulb, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Cadastro() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [existingWorkshop, setExistingWorkshop] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    razao_social: "",
    cnpj: "",
    city: "",
    state: "",
    endereco_completo: "",
    segment: "",
    services_offered: [],
    tax_regime: "",
    monthly_revenue: "",
    employees_count: "",
    years_in_business: "",
    observacoes_gerais: "",
    notas_manuais: ""
  });

  const servicesOptions = [
    { value: "luzes_instrumentos", label: "Luzes e Instrumentos" },
    { value: "painel", label: "Painel" },
    { value: "embreagem", label: "Embreagem" },
    { value: "modulos", label: "Módulos" },
    { value: "suspensao", label: "Suspensão" },
    { value: "freio", label: "Freio" },
    { value: "direcao", label: "Direção" },
    { value: "truck", label: "Truck" },
    { value: "diesel", label: "Diesel" },
    { value: "eletrica", label: "Elétrica" },
    { value: "hibrido", label: "Híbrido" },
    { value: "flex", label: "Flex" },
    { value: "airbag", label: "Airbag" },
    { value: "pneus_50", label: "Pneus até 50%" },
    { value: "pneus_100", label: "Pneus 100%" },
    { value: "rodas", label: "Rodas" },
    { value: "solda", label: "Solda" },
    { value: "acessorios", label: "Acessórios" },
    { value: "vidros", label: "Vidros" },
    { value: "escapamento", label: "Escapamento" },
    { value: "estetica", label: "Estética" },
    { value: "pintura", label: "Pintura" },
    { value: "funilaria", label: "Funilaria" },
    { value: "polimento", label: "Polimento" },
    { value: "injecao_eletronica", label: "Injeção Eletrônica" },
    { value: "motor_partida", label: "Motor de Partida" },
    { value: "alternador", label: "Alternador" },
    { value: "remapeamento", label: "Remapeamento" },
    { value: "alinhamento", label: "Alinhamento" },
    { value: "balanceamento", label: "Balanceamento" },
    { value: "motor", label: "Motor" },
    { value: "tapeçaria", label: "Tapeçaria" },
    { value: "higienizacao", label: "Higienização" },
    { value: "turbo", label: "Turbo" },
    { value: "cambio_manual", label: "Câmbio Manual" },
    { value: "cambio_automatico", label: "Câmbio Automático" },
    { value: "chassis", label: "Chassis" },
    { value: "molas", label: "Molas" },
    { value: "borracharia", label: "Borracharia" },
    { value: "ar_condicionado", label: "Ar Condicionado" },
    { value: "climatizador", label: "Climatizador" },
    { value: "tacografo", label: "Tacógrafo" }
  ];

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const workshops = await base44.entities.Workshop.list();
      const userWorkshop = workshops.find(w => w.owner_id === currentUser.id);
      
      if (userWorkshop) {
        setExistingWorkshop(userWorkshop);
        setFormData({
          name: userWorkshop.name || "",
          razao_social: userWorkshop.razao_social || "",
          cnpj: userWorkshop.cnpj || "",
          city: userWorkshop.city || "",
          state: userWorkshop.state || "",
          endereco_completo: userWorkshop.endereco_completo || "",
          segment: userWorkshop.segment || "",
          services_offered: userWorkshop.services_offered || [],
          tax_regime: userWorkshop.tax_regime || "",
          monthly_revenue: userWorkshop.monthly_revenue || "",
          employees_count: userWorkshop.employees_count || "",
          years_in_business: userWorkshop.years_in_business || "",
          observacoes_gerais: userWorkshop.observacoes_gerais || "",
          notas_manuais: userWorkshop.notas_manuais || ""
        });
      }
    } catch (error) {
      console.error("Erro ao carregar usuário:", error);
      toast.error("Você precisa estar logado para cadastrar uma oficina");
      base44.auth.redirectToLogin(createPageUrl("Cadastro"));
    }
  };

  const toggleService = (serviceValue) => {
    setFormData(prev => {
      const services = prev.services_offered.includes(serviceValue)
        ? prev.services_offered.filter(s => s !== serviceValue)
        : [...prev.services_offered, serviceValue];
      return { ...prev, services_offered: services };
    });
  };

  // Determina automaticamente se é auto center
  const isAutoCenter = () => {
    const hasAlinhamento = formData.services_offered.includes('alinhamento');
    const hasBalanceamento = formData.services_offered.includes('balanceamento');
    const isCentroAutomotivo = formData.segment === 'centro_automotivo';
    
    return isCentroAutomotivo && hasAlinhamento && hasBalanceamento;
  };

  // Gera sugestões baseadas nos serviços selecionados
  const generateSuggestions = () => {
    const suggestions = [];
    const services = formData.services_offered;
    
    if (services.includes('alinhamento') && services.includes('balanceamento')) {
      suggestions.push("Sua oficina oferece serviços de alinhamento e balanceamento - considere investir em equipamentos de ponta para aumentar a precisão.");
    }
    
    if (services.includes('injecao_eletronica') && services.includes('motor')) {
      suggestions.push("Com serviços de injeção eletrônica e motor, você pode se especializar em diagnósticos complexos - considere certificações específicas.");
    }
    
    if (services.includes('pintura') && services.includes('funilaria')) {
      suggestions.push("Oficina com pintura e funilaria tem grande potencial - considere parcerias com seguradoras para aumentar o volume de clientes.");
    }
    
    if (services.includes('ar_condicionado') && services.includes('eletrica')) {
      suggestions.push("Serviços elétricos e ar condicionado são complementares - ofereça pacotes promocionais combinados.");
    }
    
    if (services.length > 15) {
      suggestions.push("Você oferece uma ampla gama de serviços - considere criar especializações por equipe para otimizar a qualidade.");
    }
    
    if (isAutoCenter()) {
      suggestions.push("Sua oficina foi identificada como Auto Center - considere expandir para serviços express e atendimento sem agendamento.");
    }
    
    return suggestions;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.city || !formData.state || !formData.segment || 
        !formData.monthly_revenue || !formData.employees_count || !formData.years_in_business) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);

    try {
      const aiSuggestions = generateSuggestions();
      
      const workshopData = {
        name: formData.name,
        razao_social: formData.razao_social,
        cnpj: formData.cnpj,
        city: formData.city,
        state: formData.state,
        endereco_completo: formData.endereco_completo,
        segment: formData.segment,
        services_offered: formData.services_offered,
        tax_regime: formData.tax_regime,
        monthly_revenue: formData.monthly_revenue,
        employees_count: formData.employees_count,
        years_in_business: formData.years_in_business,
        is_autocenter: isAutoCenter(),
        observacoes_gerais: formData.observacoes_gerais,
        notas_manuais: formData.notas_manuais,
        sugestoes_ia: aiSuggestions,
        owner_id: user.id
      };

      if (existingWorkshop) {
        await base44.entities.Workshop.update(existingWorkshop.id, workshopData);
        toast.success("Dados da oficina atualizados!");
      } else {
        await base44.entities.Workshop.create(workshopData);
        toast.success("Oficina cadastrada com sucesso!");
      }

      setTimeout(() => {
        navigate(createPageUrl("Questionario"));
      }, 500);

    } catch (error) {
      console.error("Erro ao salvar oficina:", error);
      toast.error("Erro ao salvar dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const suggestions = generateSuggestions();
  const isIdentifiedAsAutoCenter = isAutoCenter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            {existingWorkshop ? "Atualize os dados da sua oficina" : "Cadastre sua oficina"}
          </h1>
          <p className="text-lg text-gray-600">
            Preencha as informações básicas para personalizar seu diagnóstico
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Informações Básicas</CardTitle>
                  <CardDescription>Identificação da oficina</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nome Fantasia *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: Auto Center Silva"
                  required
                />
              </div>

              <div>
                <Label htmlFor="razao_social">Razão Social</Label>
                <Input
                  id="razao_social"
                  value={formData.razao_social}
                  onChange={(e) => setFormData({...formData, razao_social: e.target.value})}
                  placeholder="Ex: Silva Auto Center LTDA"
                />
              </div>

              <div>
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
              </div>

              <div>
                <Label htmlFor="segment">Segmento Principal *</Label>
                <Select value={formData.segment} onValueChange={(value) => setFormData({...formData, segment: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o segmento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mecanica_leve">Mecânica Leve</SelectItem>
                    <SelectItem value="mecanica_pesada">Mecânica Pesada / Caminhões</SelectItem>
                    <SelectItem value="motos">Motos</SelectItem>
                    <SelectItem value="centro_automotivo">Centro Automotivo</SelectItem>
                    <SelectItem value="premium">Premium / Alta Performance</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="observacoes_gerais">Observações Gerais</Label>
                <Textarea
                  id="observacoes_gerais"
                  value={formData.observacoes_gerais}
                  onChange={(e) => setFormData({...formData, observacoes_gerais: e.target.value})}
                  placeholder="Descreva informações adicionais sobre sua oficina..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Localização */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Localização</CardTitle>
                  <CardDescription>Endereço da oficina</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">Cidade *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    placeholder="Ex: São Paulo"
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

              <div>
                <Label htmlFor="endereco_completo">Endereço Completo</Label>
                <Textarea
                  id="endereco_completo"
                  value={formData.endereco_completo}
                  onChange={(e) => setFormData({...formData, endereco_completo: e.target.value})}
                  placeholder="Rua, número, bairro, CEP..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Serviços e Tributação */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Serviços e Tributação</CardTitle>
                  <CardDescription>Serviços oferecidos e regime fiscal</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Serviços Oferecidos</Label>
                <div className="border rounded-lg p-4 mt-2 max-h-60 overflow-y-auto">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {servicesOptions.map((service) => (
                      <div key={service.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={service.value}
                          checked={formData.services_offered.includes(service.value)}
                          onCheckedChange={() => toggleService(service.value)}
                        />
                        <label
                          htmlFor={service.value}
                          className="text-sm cursor-pointer select-none"
                        >
                          {service.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.services_offered.length} serviço(s) selecionado(s)
                </p>
              </div>

              {isIdentifiedAsAutoCenter && (
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    Sua oficina foi identificada automaticamente como <strong>Auto Center</strong> com base nos serviços selecionados.
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="tax_regime">Regime Tributário</Label>
                <Select value={formData.tax_regime} onValueChange={(value) => setFormData({...formData, tax_regime: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o regime" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mei">MEI</SelectItem>
                    <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                    <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                    <SelectItem value="lucro_real">Lucro Real</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Dados Operacionais */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Dados Operacionais</CardTitle>
                  <CardDescription>Informações sobre o negócio</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="monthly_revenue">Faturamento Médio Mensal *</Label>
                <Select value={formData.monthly_revenue} onValueChange={(value) => setFormData({...formData, monthly_revenue: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a faixa" />
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
            </CardContent>
          </Card>

          {/* Recomendações da Plataforma */}
          {suggestions.length > 0 && (
            <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <Lightbulb className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Recomendações da Plataforma</CardTitle>
                    <CardDescription>Sugestões baseadas no seu perfil</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-purple-600 font-bold mt-0.5">•</span>
                      <span className="text-sm text-gray-700">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Notas Internas */}
          <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                  <StickyNote className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Notas Internas do Proprietário</CardTitle>
                  <CardDescription>Anotações pessoais sobre sua oficina</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                id="notas_manuais"
                value={formData.notas_manuais}
                onChange={(e) => setFormData({...formData, notas_manuais: e.target.value})}
                placeholder="Anote aqui suas observações pessoais, ideias, planos futuros..."
                rows={4}
                className="bg-white"
              />
            </CardContent>
          </Card>

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
                  {existingWorkshop ? "Atualizar e continuar" : "Continuar para o diagnóstico"}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}