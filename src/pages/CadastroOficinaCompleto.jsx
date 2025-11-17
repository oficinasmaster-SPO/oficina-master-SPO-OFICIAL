import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save, Building2, FileText, Package, Users, Settings, Lightbulb, Wrench, DollarSign } from "lucide-react";
import { toast } from "sonner";

export default function CadastroOficinaCompleto() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);
  const [workshop, setWorkshop] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    razao_social: "",
    cnpj: "",
    city: "",
    state: "",
    endereco_completo: "",
    segment: "",
    vehicle_types: [],
    fuel_types: [],
    vehicle_categories: [],
    services_offered: [],
    tax_regime: "",
    monthly_revenue: "",
    employees_count: "",
    years_in_business: "",
    equipment: {
      elevators: 0,
      alignment_ramps: 0,
      balancing_machines: 0,
      disc_grinders: 0,
      shock_tester: 0,
      welding_machines: [],
      pneumatic_wrench: 0,
      paint_booth: 0,
      lathe: 0,
      scanners: []
    },
    third_party_services: [],
    observacoes_gerais: "",
    sugestoes_ia: [],
    notas_manuais: "",
    is_autocenter: false,
    status: "ativo",
    capacidade_atendimento_dia: 0,
    tempo_medio_servico: 0,
    horario_funcionamento: {
      abertura: "",
      fechamento: "",
      dias_semana: []
    }
  });

  useEffect(() => {
    loadWorkshop();
  }, []);

  const loadWorkshop = async () => {
    try {
      const user = await base44.auth.me();
      const workshops = await base44.entities.Workshop.list();
      const userWorkshop = workshops.find(w => w.owner_id === user.id);

      if (userWorkshop) {
        setWorkshop(userWorkshop);
        setFormData({
          ...formData,
          ...userWorkshop
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar oficina");
    } finally {
      setLoading(false);
    }
  };

  const generateSuggestions = async () => {
    setGeneratingSuggestions(true);
    try {
      const prompt = `
Você é um consultor da metodologia Oficinas Master. Com base no perfil abaixo, gere 5 sugestões específicas e práticas:

PERFIL DA OFICINA:
- Nome: ${formData.name}
- Segmento: ${formData.segment}
- Tipos de veículos: ${formData.vehicle_types.join(', ')}
- Serviços oferecidos: ${formData.services_offered.join(', ')}
- É Auto Center: ${formData.is_autocenter ? 'Sim' : 'Não'}
- Faturamento mensal: ${formData.monthly_revenue}
- Número de funcionários: ${formData.employees_count}

Gere sugestões sobre:
1. Tipos de clientes ideais
2. Serviços complementares
3. Frequência de retorno típica
4. Estratégias de marketing
5. Melhorias operacionais

Retorne apenas as 5 sugestões em formato de lista.
`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      const sugestoes = response.split('\n').filter(s => s.trim().length > 0);
      setFormData({...formData, sugestoes_ia: sugestoes});
      toast.success("Sugestões geradas!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar sugestões");
    } finally {
      setGeneratingSuggestions(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.city || !formData.state) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setSaving(true);
    try {
      const user = await base44.auth.me();
      
      if (workshop) {
        await base44.entities.Workshop.update(workshop.id, formData);
        toast.success("Oficina atualizada com sucesso!");
      } else {
        await base44.entities.Workshop.create({
          ...formData,
          owner_id: user.id
        });
        toast.success("Oficina cadastrada com sucesso!");
      }
      
      navigate(createPageUrl("Home"));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar oficina");
    } finally {
      setSaving(false);
    }
  };

  const toggleArrayItem = (field, value) => {
    const current = formData[field] || [];
    if (current.includes(value)) {
      setFormData({...formData, [field]: current.filter(v => v !== value)});
    } else {
      setFormData({...formData, [field]: [...current, value]});
    }
  };

  const addThirdPartyService = () => {
    setFormData({
      ...formData,
      third_party_services: [
        ...(formData.third_party_services || []),
        { name: "", value: 0, type: "outros" }
      ]
    });
  };

  const updateThirdPartyService = (index, field, value) => {
    const services = [...formData.third_party_services];
    services[index][field] = value;
    setFormData({...formData, third_party_services: services});
  };

  const removeThirdPartyService = (index) => {
    const services = formData.third_party_services.filter((_, i) => i !== index);
    setFormData({...formData, third_party_services: services});
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {workshop ? "Gestão Completa da Oficina" : "Cadastro Inteligente da Oficina"}
          </h1>
          <p className="text-gray-600">Registro completo com sugestões personalizadas</p>
        </div>

        <Tabs defaultValue="basicos" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7 bg-white shadow-md">
            <TabsTrigger value="basicos">
              <Building2 className="w-4 h-4 mr-2" />
              Básicos
            </TabsTrigger>
            <TabsTrigger value="servicos">
              <Wrench className="w-4 h-4 mr-2" />
              Serviços
            </TabsTrigger>
            <TabsTrigger value="equipamentos">
              <Settings className="w-4 h-4 mr-2" />
              Equipamentos
            </TabsTrigger>
            <TabsTrigger value="terceirizados">
              <DollarSign className="w-4 h-4 mr-2" />
              Terceirizados
            </TabsTrigger>
            <TabsTrigger value="operacional">
              <Package className="w-4 h-4 mr-2" />
              Operacional
            </TabsTrigger>
            <TabsTrigger value="sugestoes">
              <Lightbulb className="w-4 h-4 mr-2" />
              Sugestões IA
            </TabsTrigger>
            <TabsTrigger value="observacoes">
              <FileText className="w-4 h-4 mr-2" />
              Anotações
            </TabsTrigger>
          </TabsList>

          {/* ABA BÁSICOS */}
          <TabsContent value="basicos">
            <Card>
              <CardHeader>
                <CardTitle>Dados Cadastrais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome Fantasia *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Nome da oficina"
                    />
                  </div>
                  <div>
                    <Label>Razão Social</Label>
                    <Input
                      value={formData.razao_social}
                      onChange={(e) => setFormData({...formData, razao_social: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>CNPJ</Label>
                    <Input
                      value={formData.cnpj}
                      onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  <div>
                    <Label>Enquadramento Tributário</Label>
                    <Select value={formData.tax_regime} onValueChange={(v) => setFormData({...formData, tax_regime: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mei">MEI</SelectItem>
                        <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                        <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                        <SelectItem value="lucro_real">Lucro Real</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Cidade *</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Estado *</Label>
                    <Input
                      value={formData.state}
                      onChange={(e) => setFormData({...formData, state: e.target.value})}
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <Label>Segmento *</Label>
                    <Select value={formData.segment} onValueChange={(v) => setFormData({...formData, segment: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mecanica_leve">Mecânica Leve</SelectItem>
                        <SelectItem value="mecanica_pesada">Mecânica Pesada</SelectItem>
                        <SelectItem value="motos">Motos</SelectItem>
                        <SelectItem value="centro_automotivo">Centro Automotivo</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inativo">Inativo</SelectItem>
                        <SelectItem value="acompanhamento">Acompanhamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Endereço Completo</Label>
                  <Textarea
                    value={formData.endereco_completo}
                    onChange={(e) => setFormData({...formData, endereco_completo: e.target.value})}
                    rows={2}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.is_autocenter}
                    onCheckedChange={(v) => setFormData({...formData, is_autocenter: v})}
                  />
                  <Label>É Auto Center</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA SERVIÇOS */}
          <TabsContent value="servicos">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>1. Tipos de Veículos Atendidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['auto', 'motos', 'truck', 'barcos', 'aviao', 'bicicletas', 'agro_maquina', 'trator'].map(type => (
                      <div key={type} className="flex items-center gap-2">
                        <Checkbox
                          checked={formData.vehicle_types?.includes(type)}
                          onCheckedChange={() => toggleArrayItem('vehicle_types', type)}
                        />
                        <Label className="capitalize">{type.replace('_', ' ')}</Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>2. Tipos de Combustão</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {['diesel', 'ciclo_otto', 'etanol', 'eletrico', 'hibrido', 'flex'].map(type => (
                      <div key={type} className="flex items-center gap-2">
                        <Checkbox
                          checked={formData.fuel_types?.includes(type)}
                          onCheckedChange={() => toggleArrayItem('fuel_types', type)}
                        />
                        <Label className="capitalize">{type.replace('_', ' ')}</Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>3. Categorias de Público</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {['premium_luxo', 'super_carros', 'intermediarios', 'populares', 'utilitarios', 'transporte'].map(cat => (
                      <div key={cat} className="flex items-center gap-2">
                        <Checkbox
                          checked={formData.vehicle_categories?.includes(cat)}
                          onCheckedChange={() => toggleArrayItem('vehicle_categories', cat)}
                        />
                        <Label className="capitalize">{cat.replace('_', ' ')}</Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>4. Serviços Oferecidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                    {['luzes_instrumentos', 'painel', 'embreagem', 'modulos', 'suspensao', 'freio', 'direcao', 'truck', 'diesel', 'eletrica', 'hibrido', 'flex', 'airbag', 'pneus_50', 'pneus_100', 'rodas', 'solda', 'acessorios', 'vidros', 'escapamento', 'estetica', 'pintura', 'funilaria', 'polimento', 'injecao_eletronica', 'motor_partida', 'alternador', 'remapeamento', 'alinhamento', 'balanceamento', 'motor', 'tapeçaria', 'higienizacao', 'turbo', 'cambio_manual', 'cambio_automatico', 'chassis', 'molas', 'borracharia', 'ar_condicionado', 'climatizador', 'tacografo'].map(service => (
                      <div key={service} className="flex items-center gap-2">
                        <Checkbox
                          checked={formData.services_offered?.includes(service)}
                          onCheckedChange={() => toggleArrayItem('services_offered', service)}
                        />
                        <Label className="text-xs capitalize">{service.replace(/_/g, ' ')}</Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ABA EQUIPAMENTOS */}
          <TabsContent value="equipamentos">
            <Card>
              <CardHeader>
                <CardTitle>Estrutura Física da Oficina</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Elevadores</Label>
                    <Input
                      type="number"
                      value={formData.equipment?.elevators || 0}
                      onChange={(e) => setFormData({
                        ...formData,
                        equipment: {...formData.equipment, elevators: parseInt(e.target.value) || 0}
                      })}
                    />
                  </div>
                  <div>
                    <Label>Rampas de Alinhamento</Label>
                    <Input
                      type="number"
                      value={formData.equipment?.alignment_ramps || 0}
                      onChange={(e) => setFormData({
                        ...formData,
                        equipment: {...formData.equipment, alignment_ramps: parseInt(e.target.value) || 0}
                      })}
                    />
                  </div>
                  <div>
                    <Label>Balanceadoras</Label>
                    <Input
                      type="number"
                      value={formData.equipment?.balancing_machines || 0}
                      onChange={(e) => setFormData({
                        ...formData,
                        equipment: {...formData.equipment, balancing_machines: parseInt(e.target.value) || 0}
                      })}
                    />
                  </div>
                  <div>
                    <Label>Retificadora de Disco</Label>
                    <Input
                      type="number"
                      value={formData.equipment?.disc_grinders || 0}
                      onChange={(e) => setFormData({
                        ...formData,
                        equipment: {...formData.equipment, disc_grinders: parseInt(e.target.value) || 0}
                      })}
                    />
                  </div>
                  <div>
                    <Label>Teste de Amortecedor</Label>
                    <Input
                      type="number"
                      value={formData.equipment?.shock_tester || 0}
                      onChange={(e) => setFormData({
                        ...formData,
                        equipment: {...formData.equipment, shock_tester: parseInt(e.target.value) || 0}
                      })}
                    />
                  </div>
                  <div>
                    <Label>Parafusadeira Pneumática</Label>
                    <Input
                      type="number"
                      value={formData.equipment?.pneumatic_wrench || 0}
                      onChange={(e) => setFormData({
                        ...formData,
                        equipment: {...formData.equipment, pneumatic_wrench: parseInt(e.target.value) || 0}
                      })}
                    />
                  </div>
                  <div>
                    <Label>Cabine de Pintura</Label>
                    <Input
                      type="number"
                      value={formData.equipment?.paint_booth || 0}
                      onChange={(e) => setFormData({
                        ...formData,
                        equipment: {...formData.equipment, paint_booth: parseInt(e.target.value) || 0}
                      })}
                    />
                  </div>
                  <div>
                    <Label>Torno para Retífica</Label>
                    <Input
                      type="number"
                      value={formData.equipment?.lathe || 0}
                      onChange={(e) => setFormData({
                        ...formData,
                        equipment: {...formData.equipment, lathe: parseInt(e.target.value) || 0}
                      })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA TERCEIRIZADOS */}
          <TabsContent value="terceirizados">
            <Card>
              <CardHeader>
                <CardTitle>Serviços Terceirizados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.third_party_services?.map((service, index) => (
                  <div key={index} className="flex gap-3 items-end">
                    <div className="flex-1">
                      <Label>Nome do Serviço</Label>
                      <Input
                        value={service.name}
                        onChange={(e) => updateThirdPartyService(index, 'name', e.target.value)}
                      />
                    </div>
                    <div className="w-32">
                      <Label>Valor (R$)</Label>
                      <Input
                        type="number"
                        value={service.value}
                        onChange={(e) => updateThirdPartyService(index, 'value', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="w-48">
                      <Label>Tipo</Label>
                      <Select value={service.type} onValueChange={(v) => updateThirdPartyService(index, 'type', v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="software_gestao">Software Gestão</SelectItem>
                          <SelectItem value="consultoria_financeira">Consultoria Financeira</SelectItem>
                          <SelectItem value="contabilidade">Contabilidade</SelectItem>
                          <SelectItem value="advocacia">Advocacia</SelectItem>
                          <SelectItem value="seguro_incendio">Seguro Incêndio</SelectItem>
                          <SelectItem value="seguro_vida">Seguro Vida</SelectItem>
                          <SelectItem value="maquina_cartao">Máquina Cartão</SelectItem>
                          <SelectItem value="outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => removeThirdPartyService(index)}>
                      Remover
                    </Button>
                  </div>
                ))}
                <Button onClick={addThirdPartyService} variant="outline">+ Adicionar Serviço</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA OPERACIONAL */}
          <TabsContent value="operacional">
            <Card>
              <CardHeader>
                <CardTitle>Informações Operacionais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Faturamento Mensal</Label>
                    <Select value={formData.monthly_revenue} onValueChange={(v) => setFormData({...formData, monthly_revenue: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ate_50k">Até R$ 50k</SelectItem>
                        <SelectItem value="50k_100k">R$ 50k - 100k</SelectItem>
                        <SelectItem value="100k_200k">R$ 100k - 200k</SelectItem>
                        <SelectItem value="acima_200k">Acima de R$ 200k</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Número de Funcionários</Label>
                    <Select value={formData.employees_count} onValueChange={(v) => setFormData({...formData, employees_count: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ate_3">Até 3</SelectItem>
                        <SelectItem value="4_7">4-7</SelectItem>
                        <SelectItem value="8_15">8-15</SelectItem>
                        <SelectItem value="acima_15">Acima de 15</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tempo no Mercado</Label>
                    <Select value={formData.years_in_business} onValueChange={(v) => setFormData({...formData, years_in_business: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="menos_1_ano">Menos de 1 ano</SelectItem>
                        <SelectItem value="1_3_anos">1-3 anos</SelectItem>
                        <SelectItem value="3_5_anos">3-5 anos</SelectItem>
                        <SelectItem value="acima_5_anos">Acima de 5 anos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Capacidade Atendimento/Dia</Label>
                    <Input
                      type="number"
                      value={formData.capacidade_atendimento_dia}
                      onChange={(e) => setFormData({...formData, capacidade_atendimento_dia: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label>Tempo Médio Serviço (h)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={formData.tempo_medio_servico}
                      onChange={(e) => setFormData({...formData, tempo_medio_servico: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA SUGESTÕES IA */}
          <TabsContent value="sugestoes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Sugestões Inteligentes</span>
                  <Button onClick={generateSuggestions} disabled={generatingSuggestions} size="sm">
                    {generatingSuggestions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4 mr-2" />}
                    Gerar Sugestões
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {formData.sugestoes_ia?.length > 0 ? (
                  <ul className="space-y-2">
                    {formData.sugestoes_ia.map((sugestao, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-blue-600">•</span>
                        <span>{sugestao}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">Clique em "Gerar Sugestões" para receber recomendações personalizadas baseadas no perfil da sua oficina.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA ANOTAÇÕES */}
          <TabsContent value="observacoes">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Observações Gerais</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={formData.observacoes_gerais}
                    onChange={(e) => setFormData({...formData, observacoes_gerais: e.target.value})}
                    rows={5}
                    placeholder="Informações gerais sobre a oficina..."
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Anotações Manuais</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={formData.notas_manuais}
                    onChange={(e) => setFormData({...formData, notas_manuais: e.target.value})}
                    rows={8}
                    placeholder="Suas anotações pessoais, observações importantes, planos futuros..."
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end gap-4">
          <Button variant="outline" onClick={() => navigate(createPageUrl("Home"))}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Cadastro
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}