import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save, Building2, Info, Store, Loader2, Check, ChevronsUpDown, Minus, Plus, MapPin } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import { Checkbox } from "@/components/ui/checkbox";
import { TimePicker } from "@/components/ui/time-picker";
import { toast } from "sonner";
import LogoUpload from "./LogoUpload";

const CounterInput = ({ value, onChange, disabled, label, min = 0, max = 100, suffix = "" }) => {
  const handleDecrement = () => {
    if (disabled) return;
    const newValue = Math.max(min, (parseInt(value) || 0) - 1);
    onChange(newValue);
  };

  const handleIncrement = () => {
    if (disabled) return;
    const newValue = Math.min(max, (parseInt(value) || 0) + 1);
    onChange(newValue);
  };

  const handleChange = (e) => {
    let val = parseInt(e.target.value);
    if (isNaN(val)) val = min;
    if (val < min) val = min;
    if (val > max) val = max;
    onChange(val);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center space-x-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-full transition-transform active:scale-95"
          onClick={handleDecrement}
          disabled={disabled || value <= min}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <div className="relative flex-1">
          <Input
            type="number"
            min={min}
            max={max}
            step={1}
            value={value === 0 && min > 0 ? min : value}
            onChange={handleChange}
            disabled={disabled}
            className="text-center h-10 rounded-xl font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          {suffix && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500 pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-full transition-transform active:scale-95"
          onClick={handleIncrement}
          disabled={disabled || value >= max}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

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
  const [openCityPopover, setOpenCityPopover] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    razao_social: "",
    cnpj: "",
    telefone: "",
    email: "",
    cep: "",
    city: "",
    state: "",
    comarca: "",
    endereco_rua: "",
    endereco_numero: "",
    endereco_bairro: "",
    endereco_complemento: "",
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
    horario_funcionamento: { abertura: "", fechamento: "", almoco_inicio: "", almoco_fim: "", sabado_abertura: "", sabado_fechamento: "", dias_semana: [] }
  });

  useImperativeHandle(ref, () => ({
    saveCurrentData: async () => {
      if (!workshop?.logo_url) {
        toast.error("A logo da empresa é obrigatória para prosseguir.");
        return false;
      }
      if (!formData.name || formData.name.trim() === "") {
        toast.error("Nome Fantasia é obrigatório.");
        return false;
      }
      if (!formData.razao_social) {
        toast.error("Razão Social é obrigatória.");
        return false;
      }
      if (!formData.cnpj) {
        toast.error("CNPJ é obrigatório.");
        return false;
      }
      if (!formData.telefone) {
        toast.error("Telefone é obrigatório.");
        return false;
      }
      if (!formData.email) {
        toast.error("E-mail é obrigatório.");
        return false;
      }
      try {
        await onUpdate(formData);
        toast.success("Dados básicos salvos!");
        setEditing(false);
        return true;
      } catch (error) {
        console.error("Erro ao salvar:", error);
        toast.error("Erro ao salvar dados");
        return false;
      }
    }
  }));

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
        comarca: workshop.comarca || "",
        endereco_rua: workshop.endereco_rua || "",
        endereco_numero: workshop.endereco_numero || "",
        endereco_bairro: workshop.endereco_bairro || "",
        endereco_complemento: workshop.endereco_complemento || "",
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
        horario_funcionamento: {
          abertura: "", fechamento: "", almoco_inicio: "", almoco_fim: "", sabado_abertura: "", sabado_fechamento: "", dias_semana: [],
          ...(workshop.horario_funcionamento || {})
        }
      });
    }
  }, [workshop]);

  const handleSave = async () => {
    if (!workshop?.logo_url) {
      toast.error("A logo da empresa é obrigatória para prosseguir.");
      return;
    }
    if (!formData.name || formData.name.trim() === "") {
      toast.error("Nome Fantasia é obrigatório.");
      return;
    }
    if (!formData.razao_social) {
      toast.error("Razão Social é obrigatória.");
      return;
    }
    if (!formData.cnpj) {
      toast.error("CNPJ é obrigatório.");
      return;
    }
    if (!formData.telefone) {
      toast.error("Telefone é obrigatório.");
      return;
    }
    if (!formData.email) {
      toast.error("E-mail é obrigatório.");
      return;
    }

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
          endereco_rua: response.data.street || '',
          endereco_bairro: response.data.neighborhood || '',
          endereco_completo: `${response.data.street || ''}, ${response.data.neighborhood || ''}`
        }));
        // Buscar cidades do estado retornado
        if (response.data.state) {
          await loadCities(response.data.state);
          }

          // Sugerir comarca igual à cidade se estiver vazia
          if (!formData.comarca) {
          setFormData(prev => ({
            ...prev,
            comarca: response.data.city
          }));
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
              <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>Cancelar</Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload Section */}
          <div className="mb-6 border-b pb-6">
            <LogoUpload 
              workshop={workshop} 
              onUpdate={(data) => {
                // LogoUpload já atualiza o banco, mas chamamos onUpdate para atualizar o estado local do pai
                if (onUpdate) onUpdate(data);
              }} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nome Fantasia *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                disabled={!editing}
                placeholder="Ex: Minha Oficina"
              />
            </div>
            <div>
              <Label>Razão Social *</Label>
              <Input
                value={formData.razao_social}
                onChange={(e) => setFormData({...formData, razao_social: e.target.value})}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>CNPJ *</Label>
              <Input
                value={formData.cnpj || ''}
                onChange={(e) => {
                  let v = e.target.value.replace(/\D/g, "");
                  if (v.length > 14) v = v.slice(0, 14);
                  v = v.replace(/^(\d{2})(\d)/, "$1.$2");
                  v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
                  v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
                  v = v.replace(/(\d{4})(\d)/, "$1-$2");
                  e.target.value = v;
                  setFormData({...formData, cnpj: v});
                }}
                disabled={!editing}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div>
              <Label>Telefone Principal *</Label>
              <Input
                value={formData.telefone || ''}
                onChange={(e) => {
                  let v = e.target.value.replace(/\D/g, "");
                  if (v.length > 11) v = v.slice(0, 11);
                  v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
                  v = v.replace(/(\d)(\d{4})$/, "$1-$2");
                  e.target.value = v;
                  setFormData({...formData, telefone: v});
                }}
                disabled={!editing}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <Label>E-mail Principal *</Label>
              <Input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                disabled={!editing}
                placeholder="contato@oficina.com.br"
              />
            </div>
          </div>

          {/* Seção de Endereço */}
          <div className="border-2 border-slate-200 rounded-xl p-5 bg-slate-50/30 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-semibold text-slate-800">Endereço</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>CEP</Label>
                <div className="relative">
                  <Input
                    value={formData.cep}
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, "");
                      if (v.length > 8) v = v.slice(0, 8);
                      v = v.replace(/^(\d{5})(\d)/, "$1-$2");
                      e.target.value = v;
                      handleCEPChange(v);
                    }}
                    disabled={!editing}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  {loadingCEP && (
                    <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-3 text-blue-600" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Preenche automaticamente</p>
              </div>
              <div>
                <Label>Estado (UF) *</Label>
                {!editing ? (
                  <Input value={formData.state} disabled />
                ) : (
                  <Select value={formData.state} onValueChange={handleStateChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="UF..." />
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
                      className="w-full text-xs"
                    >
                      Voltar para lista
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Popover open={openCityPopover} onOpenChange={setOpenCityPopover}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openCityPopover}
                          disabled={!formData.state || loadingCities}
                          className="w-full justify-between font-normal"
                        >
                          <span className="truncate">
                            {loadingCities ? "Carregando..." :
                             !formData.state ? "Selecione UF primeiro" :
                             formData.city ? formData.city : "Selecione a cidade..."}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar cidade..." />
                          <CommandList>
                            <CommandEmpty>Nenhuma cidade encontrada.</CommandEmpty>
                            <CommandGroup>
                              {cities.map((city) => (
                                <CommandItem
                                  key={city}
                                  value={city}
                                  onSelect={(currentValue) => {
                                    const originalCity = cities.find(c => c.toLowerCase() === currentValue) || city;
                                    setFormData({...formData, city: originalCity});
                                    setOpenCityPopover(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.city === city ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {city}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {loadingCities && (
                      <Loader2 className="w-4 h-4 animate-spin absolute right-10 top-3 text-blue-600" />
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCityInput(true)}
                      className="w-full text-xs"
                      disabled={!formData.state}
                    >
                      Cidade não está na lista
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6">
                <Label>Rua / Logradouro</Label>
                <Input
                  value={formData.endereco_rua || ''}
                  onChange={(e) => setFormData({...formData, endereco_rua: e.target.value})}
                  disabled={!editing}
                  placeholder="Rua, Avenida, Travessa..."
                />
              </div>
              <div className="md:col-span-2">
                <Label>Número</Label>
                <Input
                  value={formData.endereco_numero || ''}
                  onChange={(e) => setFormData({...formData, endereco_numero: e.target.value})}
                  disabled={!editing}
                  placeholder="Nº"
                />
              </div>
              <div className="md:col-span-4">
                <Label>Bairro</Label>
                <Input
                  value={formData.endereco_bairro || ''}
                  onChange={(e) => setFormData({...formData, endereco_bairro: e.target.value})}
                  disabled={!editing}
                  placeholder="Bairro"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Complemento</Label>
                <Input
                  value={formData.endereco_complemento || ''}
                  onChange={(e) => setFormData({...formData, endereco_complemento: e.target.value})}
                  disabled={!editing}
                  placeholder="Sala, Galpão, Bloco..."
                />
              </div>
              <div>
                <Label>Comarca</Label>
                <Input
                  value={formData.comarca || ''}
                  onChange={(e) => setFormData({...formData, comarca: e.target.value})}
                  disabled={!editing}
                  placeholder="Geralmente a mesma cidade"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Foro eleito para contratos. Se vazio, usará a cidade.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Segmento</Label>
            <Select 
              value={formData.segment} 
              onValueChange={(value) => setFormData({...formData, segment: value})}
              disabled={!editing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o segmento..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Centro automotivo (revisão, manutenção rápida, serviços gerais)">Centro automotivo (revisão, manutenção rápida, serviços gerais)</SelectItem>
                <SelectItem value="Loja de pneus (foco principal em venda de pneus)">Loja de pneus (foco principal em venda de pneus)</SelectItem>
                <SelectItem value="Oficina de motos">Oficina de motos</SelectItem>
                <SelectItem value="Funilaria e pintura">Funilaria e pintura</SelectItem>
                <SelectItem value="Estética automotiva">Estética automotiva</SelectItem>
                <SelectItem value="Retífica / usinagem / tornearia">Retífica / usinagem / tornearia</SelectItem>
                <SelectItem value="Autopeças (loja ou distribuidor)">Autopeças (loja ou distribuidor)</SelectItem>
                <SelectItem value="Motopeças (loja ou distribuidor)">Motopeças (loja ou distribuidor)</SelectItem>
                <SelectItem value="Oficina diesel (linha leve)">Oficina diesel (linha leve)</SelectItem>
                <SelectItem value="Oficina diesel (linha pesada)">Oficina diesel (linha pesada)</SelectItem>
                <SelectItem value="Posto de molas">Posto de molas</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              O segmento define o perfil de atuação da sua empresa
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
            <CounterInput
              value={formData.employees_count}
              onChange={(value) => setFormData({...formData, employees_count: value})}
              disabled={!editing}
              label="Quantidade de Funcionários"
              min={1}
              max={100}
            />
          </div>
          <div>
            <CounterInput
              value={formData.years_in_business}
              onChange={(value) => setFormData({...formData, years_in_business: value})}
              disabled={!editing}
              label="Tempo de Atuação no Mercado"
              suffix="anos"
              min={1}
              max={100}
            />
          </div>
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
              <TimePicker
                value={formData.horario_funcionamento.abertura}
                defaultOpenValue="08:00"
                onChange={(val) => setFormData({
                  ...formData,
                  horario_funcionamento: { ...formData.horario_funcionamento, abertura: val }
                })}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Horário de Fechamento</Label>
              <TimePicker
                value={formData.horario_funcionamento.fechamento}
                defaultOpenValue="18:00"
                onChange={(val) => setFormData({
                  ...formData,
                  horario_funcionamento: { ...formData.horario_funcionamento, fechamento: val }
                })}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Início do Almoço</Label>
              <TimePicker
                value={formData.horario_funcionamento.almoco_inicio || ""}
                defaultOpenValue="12:00"
                onChange={(val) => setFormData({
                  ...formData,
                  horario_funcionamento: { ...formData.horario_funcionamento, almoco_inicio: val }
                })}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Fim do Almoço</Label>
              <TimePicker
                value={formData.horario_funcionamento.almoco_fim || ""}
                defaultOpenValue="13:30"
                onChange={(val) => setFormData({
                  ...formData,
                  horario_funcionamento: { ...formData.horario_funcionamento, almoco_fim: val }
                })}
                disabled={!editing}
              />
            </div>
          </div>
          <div className="p-4 border rounded-xl bg-slate-50/50 space-y-4">
            <div>
              <Label className="mb-3 block text-base font-semibold">Dias de Funcionamento</Label>
              <div className="flex flex-wrap gap-2">
                {diasSemana.map((dia) => {
                  const isSelected = (formData.horario_funcionamento.dias_semana || []).includes(dia);
                  const isSabado = dia === 'Sábado';
                  
                  // Determinar se sábado é meio-período (fechamento entre 11h e 14h)
                  let isSabadoMeioPeriodo = false;
                  if (isSabado && isSelected) {
                    const sabFech = formData.horario_funcionamento.sabado_fechamento || '';
                    if (sabFech) {
                      const hour = parseInt(sabFech.split(':')[0], 10);
                      if (!isNaN(hour) && hour >= 11 && hour <= 14) {
                        isSabadoMeioPeriodo = true;
                      }
                    }
                  }

                  return (
                    <button
                      key={dia}
                      type="button"
                      disabled={!editing}
                      onClick={() => {
                        if (!editing) return;
                        const dias = formData.horario_funcionamento.dias_semana || [];
                        const newDias = isSelected
                          ? dias.filter(d => d !== dia)
                          : [...dias, dia];
                        setFormData({
                          ...formData,
                          horario_funcionamento: { ...formData.horario_funcionamento, dias_semana: newDias }
                        });
                      }}
                      className={cn(
                        "relative overflow-hidden px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                        isSelected && !isSabadoMeioPeriodo
                          ? "bg-slate-900 text-white shadow-md" 
                          : isSelected && isSabadoMeioPeriodo
                          ? "text-white shadow-md border-0"
                          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:border-slate-300",
                        !editing && "opacity-60 cursor-not-allowed"
                      )}
                      style={isSabadoMeioPeriodo ? {
                        background: 'linear-gradient(90deg, #0f172a 0%, #0f172a 50%, #e2e8f0 50%, #e2e8f0 100%)',
                        color: 'white',
                        textShadow: '0 0 4px rgba(0,0,0,0.5)'
                      } : undefined}
                    >
                      {dia}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Horários específicos do Sábado */}
            {(formData.horario_funcionamento.dias_semana || []).includes('Sábado') && (
              <div className="pt-3 border-t border-slate-200 mt-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-semibold text-slate-700">⏰ Horário do Sábado</span>
                  <span className="text-xs text-slate-500">(diferente dos demais dias)</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Abertura Sábado</Label>
                    <TimePicker
                      value={formData.horario_funcionamento.sabado_abertura || ''}
                      defaultOpenValue="08:00"
                      onChange={(val) => setFormData({
                        ...formData,
                        horario_funcionamento: { ...formData.horario_funcionamento, sabado_abertura: val }
                      })}
                      disabled={!editing}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Fechamento Sábado</Label>
                    <TimePicker
                      value={formData.horario_funcionamento.sabado_fechamento || ''}
                      defaultOpenValue="12:00"
                      onChange={(val) => setFormData({
                        ...formData,
                        horario_funcionamento: { ...formData.horario_funcionamento, sabado_fechamento: val }
                      })}
                      disabled={!editing}
                    />
                  </div>
                </div>
                {(() => {
                  const sabFech = formData.horario_funcionamento.sabado_fechamento || '';
                  if (sabFech) {
                    const hour = parseInt(sabFech.split(':')[0], 10);
                    if (!isNaN(hour) && hour >= 11 && hour <= 14) {
                      return (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                          ☀️ Sábado configurado como <strong>meio-período</strong> (fechamento às {sabFech})
                        </p>
                      );
                    }
                  }
                  return null;
                })()}
              </div>
            )}
            
            {editing && (
              <div className="flex flex-wrap gap-3 pt-3 border-t border-slate-200 mt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    const diasUteis = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
                    setFormData({
                      ...formData,
                      horario_funcionamento: { ...formData.horario_funcionamento, dias_semana: diasUteis }
                    });
                  }}
                >
                  Segunda a Sexta
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    const diasUteisESabado = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                    setFormData({
                      ...formData,
                      horario_funcionamento: { ...formData.horario_funcionamento, dias_semana: diasUteisESabado }
                    });
                  }}
                >
                  Segunda a Sábado
                </Button>
              </div>
            )}
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