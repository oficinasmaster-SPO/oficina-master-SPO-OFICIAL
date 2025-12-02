import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save, Building2, FileText, Package, Settings, Lightbulb, Wrench, DollarSign, Info, Store } from "lucide-react";
import { toast } from "sonner";
import SliderWithMax from "@/components/ui/slider-with-max";

export default function Cadastro() {
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
    employees_count: 1,
    years_in_business: 1,
    is_franchisee: false,
    franchisor_name: "",
    operates_franchise: false,
    units_count_category: "",
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
      almoco_inicio: "",
      almoco_fim: "",
      dias_semana: []
    }
  });

  const diasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

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
          ...userWorkshop,
          employees_count: userWorkshop.employees_count || 1,
          years_in_business: userWorkshop.years_in_business || 1,
          horario_funcionamento: userWorkshop.horario_funcionamento || formData.horario_funcionamento
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
      
      navigate(createPageUrl("GestaoOficina"));
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

        <Tabs defaultValue="dados" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white shadow-md">
            <TabsTrigger value="dados">
              <Building2 className="w-4 h-4 mr-2" />
              Dados
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
          </TabsList>

          {/* ABA DADOS (Igual ao DadosBasicosOficina) */}
          <TabsContent value="dados">
            <div className="space-y-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Building2 className="w-6 h-6 text-blue-600" />
                    <div>
                      <CardTitle>Dados Básicos da Oficina</CardTitle>
                      <CardDescription>Informações cadastrais e identificação</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Nome Fantasia *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
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
                      <Label>Cidade *</Label>
                      <Input
                        value={formData.city}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Estado (UF) *</Label>
                      <Input
                        value={formData.state}
                        onChange={(e) => setFormData({...formData, state: e.target.value.toUpperCase()})}
                        maxLength={2}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Segmento (edição livre)</Label>
                      <Input
                        value={formData.segment}
                        onChange={(e) => setFormData({...formData, segment: e.target.value})}
                        placeholder="Ex: Mecânica Geral, Auto Center, Elétrica Automotiva..."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        O segmento também é calculado automaticamente com base nos serviços selecionados
                      </p>
                    </div>
                    <div>
                      <Label>Enquadramento Tributário</Label>
                      <Select value={formData.tax_regime} onValueChange={(value) => setFormData({...formData, tax_regime: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
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
                      <Label>Faturamento Mensal</Label>
                      <Select value={formData.monthly_revenue} onValueChange={(value) => setFormData({...formData, monthly_revenue: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0_20k">R$ 0 - 20 mil</SelectItem>
                          <SelectItem value="20k_40k">R$ 20 - 40 mil</SelectItem>
                          <SelectItem value="40k_60k">R$ 40 - 60 mil</SelectItem>
                          <SelectItem value="60k_80k">R$ 60 - 80 mil</SelectItem>
                          <SelectItem value="80k_100k">R$ 80 - 100 mil</SelectItem>
                          <SelectItem value="100k_130k">R$ 100 - 130 mil</SelectItem>
                          <SelectItem value="130k_160k">R$ 130 - 160 mil</SelectItem>
                          <SelectItem value="160k_190k">R$ 160 - 190 mil</SelectItem>
                          <SelectItem value="190k_200k">R$ 190 - 200 mil</SelectItem>
                          <SelectItem value="200k_250k">R$ 200 - 250 mil</SelectItem>
                          <SelectItem value="250k_300k">R$ 250 - 300 mil</SelectItem>
                          <SelectItem value="300k_350k">R$ 300 - 350 mil</SelectItem>
                          <SelectItem value="350k_400k">R$ 350 - 400 mil</SelectItem>
                          <SelectItem value="400k_450k">R$ 400 - 450 mil</SelectItem>
                          <SelectItem value="450k_500k">R$ 450 - 500 mil</SelectItem>
                          <SelectItem value="500k_600k">R$ 500 - 600 mil</SelectItem>
                          <SelectItem value="600k_700k">R$ 600 - 700 mil</SelectItem>
                          <SelectItem value="700k_800k">R$ 700 - 800 mil</SelectItem>
                          <SelectItem value="800k_900k">R$ 800 - 900 mil</SelectItem>
                          <SelectItem value="900k_1m">R$ 900 mil - 1 milhão</SelectItem>
                          <SelectItem value="acima_1m">Acima de R$ 1 milhão</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <SliderWithMax
                        value={formData.employees_count}
                        onChange={(value) => setFormData({...formData, employees_count: value})}
                        label="Quantidade de Funcionários"
                        min={1}
                        max={100}
                      />
                    </div>
                    <div>
                      <SliderWithMax
                        value={formData.years_in_business}
                        onChange={(value) => setFormData({...formData, years_in_business: value})}
                        label="Tempo de Atuação no Mercado (anos)"
                        suffix=" anos"
                        min={1}
                        max={100}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Endereço Completo</Label>
                    <Textarea
                      value={formData.endereco_completo}
                      onChange={(e) => setFormData({...formData, endereco_completo: e.target.value})}
                      placeholder="Rua, número, bairro, CEP..."
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

              <Card className="shadow-lg border-2 border-green-200">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Store className="w-6 h-6 text-green-600" />
                    <div>
                      <CardTitle>Estrutura e Franquias</CardTitle>
                      <CardDescription>Informações sobre unidades e franquias</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Quantas unidades a empresa possui?</Label>
                      <Select value={formData.units_count_category} onValueChange={(value) => setFormData({...formData, units_count_category: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unidade_solo">1 unidade → Unidade Solo</SelectItem>
                          <SelectItem value="multiunidades">2 a 3 unidades → Multiunidades</SelectItem>
                          <SelectItem value="holding_operacional">4 a 6 unidades → Holding Operacional</SelectItem>
                          <SelectItem value="rede_estruturada">7 ou mais unidades → Rede Estruturada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is_franchisee"
                        checked={formData.is_franchisee}
                        onCheckedChange={(checked) => setFormData({...formData, is_franchisee: checked})}
                      />
                      <label htmlFor="is_franchisee" className="text-sm font-medium cursor-pointer">
                        Sou Franqueado
                      </label>
                    </div>

                    {formData.is_franchisee && (
                      <div>
                        <Label>Nome da Franqueadora</Label>
                        <Input
                          value={formData.franchisor_name}
                          onChange={(e) => setFormData({...formData, franchisor_name: e.target.value})}
                          placeholder="Digite o nome da franqueadora..."
                        />
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="operates_franchise"
                        checked={formData.operates_franchise}
                        onCheckedChange={(checked) => setFormData({...formData, operates_franchise: checked})}
                      />
                      <label htmlFor="operates_franchise" className="text-sm font-medium cursor-pointer">
                        Atua com franquias? (Sou Franqueadora)
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Info className="w-6 h-6 text-purple-600" />
                    <div>
                      <CardTitle>Capacidade Operacional</CardTitle>
                      <CardDescription>Capacidade de atendimento e horários</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Capacidade de Atendimento/Dia</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.capacidade_atendimento_dia}
                        onChange={(e) => setFormData({...formData, capacidade_atendimento_dia: parseInt(e.target.value) || 0})}
                        placeholder="Ex: 10"
                      />
                    </div>
                    <div>
                      <Label>Tempo Médio de Serviço (horas)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        value={formData.tempo_medio_servico}
                        onChange={(e) => setFormData({...formData, tempo_medio_servico: parseFloat(e.target.value) || 0})}
                        placeholder="Ex: 2.5"
                      />
                    </div>
                    <div>
                      <Label>Horário de Abertura</Label>
                      <Input
                        type="time"
                        value={formData.horario_funcionamento.abertura}
                        onChange={(e) => setFormData({
                          ...formData,
                          horario_funcionamento: { ...formData.horario_funcionamento, abertura: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <Label>Horário de Fechamento</Label>
                      <Input
                        type="time"
                        value={formData.horario_funcionamento.fechamento}
                        onChange={(e) => setFormData({
                          ...formData,
                          horario_funcionamento: { ...formData.horario_funcionamento, fechamento: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <Label>Início do Almoço</Label>
                      <Input
                        type="time"
                        value={formData.horario_funcionamento.almoco_inicio || ""}
                        onChange={(e) => setFormData({
                          ...formData,
                          horario_funcionamento: { ...formData.horario_funcionamento, almoco_inicio: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <Label>Fim do Almoço</Label>
                      <Input
                        type="time"
                        value={formData.horario_funcionamento.almoco_fim || ""}
                        onChange={(e) => setFormData({
                          ...formData,
                          horario_funcionamento: { ...formData.horario_funcionamento, almoco_fim: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="mb-3 block">Dias de Funcionamento</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {diasSemana.map((dia) => (
                        <label key={dia} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(formData.horario_funcionamento.dias_semana || []).includes(dia)}
                            onChange={(e) => {
                              const dias = formData.horario_funcionamento.dias_semana || [];
                              const newDias = e.target.checked
                                ? [...dias, dia]
                                : dias.filter(d => d !== dia);
                              setFormData({
                                ...formData,
                                horario_funcionamento: { ...formData.horario_funcionamento, dias_semana: newDias }
                              });
                            }}
                            className="rounded"
                          />
                          <span className="text-sm">{dia}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200">
                <CardHeader>
                  <CardTitle className="text-amber-900">Observações e Anotações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Observações Gerais</Label>
                    <Textarea
                      value={formData.observacoes_gerais}
                      onChange={(e) => setFormData({...formData, observacoes_gerais: e.target.value})}
                      placeholder="Observações sobre a oficina..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Notas Internas do Proprietário</Label>
                    <Textarea
                      value={formData.notas_manuais}
                      onChange={(e) => setFormData({...formData, notas_manuais: e.target.value})}
                      placeholder="Suas anotações pessoais..."
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-purple-900">
                    <span>✨ Recomendações Inteligentes</span>
                    <Button onClick={generateSuggestions} disabled={generatingSuggestions} size="sm" className="bg-purple-600 hover:bg-purple-700">
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
                          <span className="text-purple-600 font-bold">•</span>
                          <span className="text-gray-800">{sugestao}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-purple-700 text-sm">
                      Preencha os dados acima e clique em "Gerar Sugestões" para receber recomendações personalizadas da IA.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
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