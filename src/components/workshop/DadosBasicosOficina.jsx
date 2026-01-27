import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save, Building2, Info, Store, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Checkbox } from "@/components/ui/checkbox";
import SliderWithMax from "@/components/ui/slider-with-max";
import { toast } from "sonner";

const DadosBasicosOficina = forwardRef(({ workshop, onUpdate, onEditingChange }, ref) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    if (onEditingChange) {
      onEditingChange(editing);
    }
  }, [editing, onEditingChange]);
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [cities, setCities] = useState([]);
  const [showCityInput, setShowCityInput] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    razao_social: "",
    cnpj: "",
    telefone: "",
    email: "",
    cep: "",
    city: "",
    state: "",
    endereco_completo: "",
    segment: "",
    tax_regime: "",
    monthly_revenue: "",
    employees_count: 1,
    years_in_business: 1,
    is_franchisee: false,
    franchisor_name: "",
    operates_franchise: false,
    units_count_category: "",
    observacoes_gerais: "",
    notas_manuais: "",
    capacidade_atendimento_dia: 0,
    tempo_medio_servico: 0,
    horario_funcionamento: { abertura: "", fechamento: "", almoco_inicio: "", almoco_fim: "", dias_semana: [] }
  });

  // Sincroniza formData quando workshop muda
  useEffect(() => {
    if (workshop) {
      setFormData({
        name: workshop.name || "",
        razao_social: workshop.razao_social || "",
        cnpj: workshop.cnpj || "",
        telefone: workshop.telefone || "",
        email: workshop.email || "",
        cep: workshop.cep || "",
        city: workshop.city || "",
        state: workshop.state || "",
        endereco_completo: workshop.endereco_completo || "",
        segment: workshop.segment || "",
        tax_regime: workshop.tax_regime || "",
        monthly_revenue: workshop.monthly_revenue || "",
        employees_count: workshop.employees_count || 1,
        years_in_business: workshop.years_in_business || 1,
        is_franchisee: workshop.is_franchisee || false,
        franchisor_name: workshop.franchisor_name || "",
        operates_franchise: workshop.operates_franchise || false,
        units_count_category: workshop.units_count_category || "",
        observacoes_gerais: workshop.observacoes_gerais || "",
        notas_manuais: workshop.notas_manuais || "",
        capacidade_atendimento_dia: workshop.capacidade_atendimento_dia || 0,
        tempo_medio_servico: workshop.tempo_medio_servico || 0,
        horario_funcionamento: workshop.horario_funcionamento || { abertura: "", fechamento: "", almoco_inicio: "", almoco_fim: "", dias_semana: [] }
      });
    }
  }, [workshop]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(formData);
      toast.success("Dados básicos salvos!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar dados");
    } finally {
      setEditing(false);
      setSaving(false);
    }
  };

  const handleCEPChange = async (cep) => {
    setFormData({...formData, cep});
    
    // Consultar CEP quando tiver 8 dígitos
    const cleanCEP = String(cep || '').replace(/\D/g, '');
    if (cleanCEP.length === 8) {
      setLoadingCEP(true);
      try {
        const response = await base44.functions.invoke('consultarCEP', { cep: cleanCEP });
        if (response.data && !response.data.error) {
          setFormData(prev => ({
            ...prev,
            city: response.data.city,
            state: response.data.state,
            endereco_completo: `${response.data.street}, ${response.data.neighborhood}`
          }));
          // Buscar cidades do estado retornado
          if (response.data.state) {
            await loadCities(response.data.state);
          }
        }
      } catch (error) {
        console.error('Erro ao consultar CEP:', error);
      } finally {
        setLoadingCEP(false);
      }
    }
  };

  const loadCities = async (uf) => {
    if (!uf || uf.length !== 2) return;
    
    setLoadingCities(true);
    try {
      const response = await base44.functions.invoke('listarCidadesPorUF', { uf });
      if (response.data && response.data.cities) {
        setCities(response.data.cities);
      }
    } catch (error) {
      console.error('Erro ao carregar cidades:', error);
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  };

  const handleStateChange = async (uf) => {
    setFormData({...formData, state: uf, city: ''});
    await loadCities(uf);
  };

  // Carregar cidades quando o estado já existir no workshop
  useEffect(() => {
    if (workshop?.state && workshop.state.length === 2) {
      loadCities(workshop.state);
    }
  }, [workshop?.state]);

  const estadosBrasileiros = [
    { value: 'AC', label: 'Acre' },
    { value: 'AL', label: 'Alagoas' },
    { value: 'AP', label: 'Amapá' },
    { value: 'AM', label: 'Amazonas' },
    { value: 'BA', label: 'Bahia' },
    { value: 'CE', label: 'Ceará' },
    { value: 'DF', label: 'Distrito Federal' },
    { value: 'ES', label: 'Espírito Santo' },
    { value: 'GO', label: 'Goiás' },
    { value: 'MA', label: 'Maranhão' },
    { value: 'MT', label: 'Mato Grosso' },
    { value: 'MS', label: 'Mato Grosso do Sul' },
    { value: 'MG', label: 'Minas Gerais' },
    { value: 'PA', label: 'Pará' },
    { value: 'PB', label: 'Paraíba' },
    { value: 'PR', label: 'Paraná' },
    { value: 'PE', label: 'Pernambuco' },
    { value: 'PI', label: 'Piauí' },
    { value: 'RJ', label: 'Rio de Janeiro' },
    { value: 'RN', label: 'Rio Grande do Norte' },
    { value: 'RS', label: 'Rio Grande do Sul' },
    { value: 'RO', label: 'Rondônia' },
    { value: 'RR', label: 'Roraima' },
    { value: 'SC', label: 'Santa Catarina' },
    { value: 'SP', label: 'São Paulo' },
    { value: 'SE', label: 'Sergipe' },
    { value: 'TO', label: 'Tocantins' }
  ];

  const diasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

  if (!workshop) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">Carregando dados da oficina...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-blue-600" />
              <div>
                <CardTitle>Dados Básicos da Oficina</CardTitle>
                <CardDescription>Informações cadastrais e identificação</CardDescription>
              </div>
            </div>
            {!editing ? (
              <Button onClick={() => setEditing(true)}>Editar</Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nome Fantasia *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Razão Social</Label>
              <Input
                value={formData.razao_social}
                onChange={(e) => setFormData({...formData, razao_social: e.target.value})}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>CNPJ</Label>
              <Input
                value={formData.cnpj || ''}
                onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                disabled={!editing}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div>
              <Label>Telefone Principal</Label>
              <Input
                value={formData.telefone || ''}
                onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                disabled={!editing}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <Label>E-mail Principal</Label>
              <Input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                disabled={!editing}
                placeholder="contato@oficina.com.br"
              />
            </div>
            <div>
              <Label>CEP</Label>
              <div className="relative">
                <Input
                  value={formData.cep}
                  onChange={(e) => handleCEPChange(e.target.value)}
                  disabled={!editing}
                  placeholder="00000-000"
                  maxLength={9}
                />
                {loadingCEP && (
                  <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-3 text-blue-600" />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Digite o CEP para preencher cidade e estado automaticamente
              </p>
            </div>
            <div>
              <Label>Estado (UF) *</Label>
              {!editing ? (
                <Input value={formData.state} disabled />
              ) : (
                <Select value={formData.state} onValueChange={handleStateChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o estado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {estadosBrasileiros.map(estado => (
                      <SelectItem key={estado.value} value={estado.value}>
                        {estado.value} - {estado.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label>Cidade *</Label>
              {!editing ? (
                <Input value={formData.city} disabled />
              ) : showCityInput ? (
                <div className="space-y-2">
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    placeholder="Digite a cidade..."
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCityInput(false)}
                    className="w-full"
                  >
                    Voltar para lista de cidades
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Select 
                      value={formData.city} 
                      onValueChange={(value) => setFormData({...formData, city: value})}
                      disabled={!formData.state || loadingCities}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          loadingCities ? "Carregando cidades..." : 
                          !formData.state ? "Selecione um estado primeiro" : 
                          "Selecione a cidade..."
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map(city => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {loadingCities && (
                      <Loader2 className="w-4 h-4 animate-spin absolute right-10 top-3 text-blue-600" />
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCityInput(true)}
                    className="w-full"
                    disabled={!formData.state}
                  >
                    Minha cidade não está na lista - Digitar manualmente
                  </Button>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Selecione o estado primeiro para ver as cidades disponíveis
              </p>
            </div>
          <div className="md:col-span-2">
            <Label>Segmento (edição livre)</Label>
            <Input
              value={formData.segment}
              onChange={(e) => setFormData({...formData, segment: e.target.value})}
              disabled={!editing}
              placeholder="Ex: Mecânica Geral, Auto Center, Elétrica Automotiva..."
            />
            <p className="text-xs text-gray-500 mt-1">
              O segmento também é calculado automaticamente com base nos serviços selecionados
            </p>
          </div>
          <div>
            <Label>Enquadramento Tributário</Label>
            <Select value={formData.tax_regime} onValueChange={(value) => setFormData({...formData, tax_regime: value})} disabled={!editing}>
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
            <Select value={formData.monthly_revenue} onValueChange={(value) => setFormData({...formData, monthly_revenue: value})} disabled={!editing}>
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
              disabled={!editing}
              label="Quantidade de Funcionários"
              min={1}
              max={100}
            />
          </div>
          <div>
            <SliderWithMax
              value={formData.years_in_business}
              onChange={(value) => setFormData({...formData, years_in_business: value})}
              disabled={!editing}
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
              disabled={!editing}
              placeholder="Rua, número, bairro, CEP..."
              rows={2}
            />
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
              <Select value={formData.units_count_category} onValueChange={(value) => setFormData({...formData, units_count_category: value})} disabled={!editing}>
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
                disabled={!editing}
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
                  disabled={!editing}
                  placeholder="Digite o nome da franqueadora..."
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="operates_franchise"
                checked={formData.operates_franchise}
                onCheckedChange={(checked) => setFormData({...formData, operates_franchise: checked})}
                disabled={!editing}
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
                disabled={!editing}
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
                disabled={!editing}
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
                disabled={!editing}
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
                disabled={!editing}
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
                disabled={!editing}
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
                disabled={!editing}
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
                    disabled={!editing}
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
              disabled={!editing}
              placeholder="Observações sobre a oficina..."
              rows={3}
            />
          </div>
          <div>
            <Label>Notas Internas do Proprietário</Label>
            <Textarea
              value={formData.notas_manuais}
              onChange={(e) => setFormData({...formData, notas_manuais: e.target.value})}
              disabled={!editing}
              placeholder="Suas anotações pessoais..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {workshop.sugestoes_ia && workshop.sugestoes_ia.length > 0 && (
        <Card className="shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
          <CardHeader>
            <CardTitle className="text-purple-900">✨ Recomendações Inteligentes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {workshop.sugestoes_ia.map((sugestao, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold mt-0.5">•</span>
                  <span className="text-sm text-gray-700">{sugestao}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

DadosBasicosOficina.displayName = "DadosBasicosOficina";

export default DadosBasicosOficina;