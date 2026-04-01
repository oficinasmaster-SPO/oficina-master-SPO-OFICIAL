import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Settings, Package, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const ServicosEquipamentos = forwardRef(({ workshop, onUpdate, showServicesOnly, showEquipmentOnly, onEditingChange }, ref) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    if (onEditingChange) {
      onEditingChange(editing);
    }
  }, [editing, onEditingChange]);
  const [formData, setFormData] = useState({
    vehicle_types: [],
    fuel_types: [],
    vehicle_categories: [],
    services_offered: [],
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
    }
  });

  // Sincroniza formData quando workshop muda
  useEffect(() => {
    if (workshop) {
      setFormData({
        vehicle_types: workshop.vehicle_types || [],
        fuel_types: workshop.fuel_types || [],
        vehicle_categories: workshop.vehicle_categories || [],
        services_offered: workshop.services_offered || [],
        equipment: workshop.equipment || {
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
        }
      });
    }
  }, [workshop]);

  const vehicleTypesOptions = [
    { value: 'auto', label: 'Auto' },
    { value: 'motos', label: 'Motos' },
    { value: 'truck', label: 'Truck' },
    { value: 'barcos', label: 'Barcos' },
    { value: 'aviao', label: 'Avião' },
    { value: 'bicicletas', label: 'Bicicletas' },
    { value: 'agro_maquina', label: 'Agro Máquina' },
    { value: 'trator', label: 'Trator' }
  ];

  const fuelTypesOptions = [
    { value: 'diesel', label: 'Diesel' },
    { value: 'ciclo_otto', label: 'Ciclo Otto' },
    { value: 'etanol', label: 'Etanol' },
    { value: 'eletrico', label: 'Elétrico' },
    { value: 'hibrido', label: 'Híbrido' },
    { value: 'flex', label: 'Flex' },
    { value: 'gnv', label: 'GNV' }
  ];

  const vehicleCategoriesOptions = [
    { value: 'premium_luxo', label: 'Premium Luxo' },
    { value: 'super_carros', label: 'Super Carros' },
    { value: 'intermediarios', label: 'Intermediários' },
    { value: 'populares', label: 'Populares' },
    { value: 'utilitarios', label: 'Utilitários' },
    { value: 'transporte', label: 'Transporte' },
    { value: 'frotas', label: 'Frotas' },
    { value: 'moto_entregadores', label: 'Moto-entregadores' },
    { value: 'seguradoras', label: 'Seguradoras' },
    { value: 'locadoras', label: 'Locadoras' }
  ];

  const servicesOptions = {
    "Sistema Elétrico & Eletrônico": [
      { value: "luzes_iluminacao", label: "Luzes e Iluminação" },
      { value: "instrumentos_painel", label: "Instrumentos / Painel" },
      { value: "airbag", label: "Airbag" },
      { value: "alternador", label: "Alternador" },
      { value: "motor_partida", label: "Motor de Partida" },
      { value: "injecao_eletronica", label: "Injeção Eletrônica" },
      { value: "modulos_centrais", label: "Módulos e Centrais (ECU/TCU/BCM)" },
      { value: "reprogramacao_remapeamento", label: "Reprogramação / Remapeamento" },
      { value: "diagnostico_eletronico", label: "Diagnóstico Eletrônico" },
      { value: "chicote_eletrico", label: "Chicote Elétrico" },
      { value: "sensores_atuadores", label: "Sensores e Atuadores" },
      { value: "abs_controle_tracao", label: "ABS / Controle de Tração" },
      { value: "eletricidade_geral", label: "Eletricidade Geral" },
      { value: "carros_hibridos_sistemas_auxiliares", label: "Carros Híbridos (Sistemas Auxiliares)" },
      { value: "carros_eletricos_basico", label: "Carros Elétricos (Nível 1 Básico)" }
    ],
    "Mecânica Pesada & Motor": [
      { value: "motor", label: "Motor" },
      { value: "turbo", label: "Turbo" },
      { value: "sistema_arrefecimento", label: "Sistema de Arrefecimento" },
      { value: "juntas_retentores_vazamentos", label: "Juntas, Retentores e Vazamentos" },
      { value: "sistema_admissao", label: "Sistema de Admissão" },
      { value: "sistema_escapamento", label: "Sistema de Escapamento" },
      { value: "correias_dentada_acessorios", label: "Correias (Dentada, Acessórios)" }
    ],
    "Transmissão & Direção": [
      { value: "cambio_manual", label: "Câmbio Manual" },
      { value: "cambio_automatico", label: "Câmbio Automático" },
      { value: "direcao_hidraulica_eletrica", label: "Direção (Hidráulica, Elétrica)" },
      { value: "semi_eixos_homocineticas", label: "Semi-eixos / Homocinéticas" },
      { value: "embreagem", label: "Embreagem" },
      { value: "diferencial", label: "Diferencial" }
    ],
    "Suspensão & Freios": [
      { value: "suspensao_completa", label: "Suspensão Completa" },
      { value: "amortecedores", label: "Amortecedores" },
      { value: "bandejas_pivos", label: "Bandejas / Pivôs" },
      { value: "buchas_coxins", label: "Buchas e Coxins" },
      { value: "freio_disco_pastilha_fluido_pinca", label: "Freio (Disco, Pastilha, Fluido, Pinça)" }
    ],
    "Rodas, Pneus & Geometria": [
      { value: "pneus_50", label: "Pneus 50% da Operação" },
      { value: "pneus_100", label: "Pneus 100% da Operação" },
      { value: "rodas_reparo", label: "Rodas / Reparo de Rodas" },
      { value: "alinhamento", label: "Alinhamento" },
      { value: "balanceamento", label: "Balanceamento" },
      { value: "cambagem_caster", label: "Cambagem / Caster" }
    ],
    "Vidros & Acessórios": [
      { value: "vidros_troca_reparo", label: "Vidros (Troca / Reparo)" },
      { value: "acessorios_som_pelicula_internos_externos", label: "Acessórios (Som, Película, Internos/Externos)" },
      { value: "fechaduras_travas_vidros_eletricos", label: "Fechaduras / Travas / Vidros Elétricos" },
      { value: "chaves_codificacao", label: "Chaves e Codificação" }
    ],
    "Lataria & Pintura": [
      { value: "pintura", label: "Pintura" },
      { value: "chapeacao_funilaria", label: "Chapeação / Funilaria" },
      { value: "polimento", label: "Polimento" },
      { value: "estetica_automotiva", label: "Estética Automotiva" },
      { value: "detailing_automotivo", label: "Detailing Automotivo" },
      { value: "higienizacao_tecnica_lataria", label: "Higienização Técnica" },
      { value: "recuperacao_parachoque", label: "Recuperação de Para-choque" },
      { value: "reparos_rapidos_martelinho", label: "Reparos Rápidos (Martelinho)" }
    ],
    "Interiores & Conforto": [
      { value: "tapecaria", label: "Tapeçaria" },
      { value: "higienizacao_interna", label: "Higienização Interna" },
      { value: "lavagem_tecnica", label: "Lavagem Técnica" },
      { value: "tratamento_bancos", label: "Tratamento de Bancos (Couro/Tecido)" }
    ],
    "Sistemas de Alto Desempenho": [
      { value: "instalacao_turbo_upgrades", label: "Instalação de Turbo / Upgrades" },
      { value: "downpipe_escapamento_esportivo", label: "Downpipe / Escapamento Esportivo" },
      { value: "preparacoes_leves", label: "Preparações Leves" },
      { value: "intercooler", label: "Intercooler" },
      { value: "programacao_cambio", label: "Programação de Câmbio" }
    ],
    "Ar-Condicionado & Climatização": [
      { value: "higienizacao_ar", label: "Higienização" },
      { value: "reparo_compressor", label: "Reparo de Compressor" },
      { value: "troca_gas_ar", label: "Troca de Gás" },
      { value: "linha_ar_condicionado_geral", label: "Linha de Ar-Condicionado Geral" }
    ],
    "Diagnóstico & Inspeções": [
      { value: "checklist_geral", label: "Checklist Geral" },
      { value: "vistoria_pre_compra", label: "Vistoria Pré-compra" },
      { value: "inspecao_viagem", label: "Inspeção de Viagem" },
      { value: "diagnostico_via_scanner", label: "Diagnóstico via Scanner" }
    ],
    "Outros Serviços": [
      { value: "solda", label: "Solda" },
      { value: "borracharia", label: "Borracharia" },
      { value: "tacografo", label: "Tacógrafo" }
    ]
  };

  const toggleArrayItem = (array, item) => {
    return array.includes(item) ? array.filter(i => i !== item) : [...array, item];
  };

  const calculateSegment = (services, vehicleTypes) => {
    const servicesList = services || [];
    const vehicles = vehicleTypes || [];
    
    // Conta serviços por categoria
    const hasElectrical = servicesList.some(s => 
      ['luzes_iluminacao', 'instrumentos_painel', 'airbag', 'alternador', 'motor_partida', 
       'injecao_eletronica', 'modulos_centrais', 'diagnostico_eletronico', 'chicote_eletrico',
       'sensores_atuadores', 'abs_controle_tracao', 'eletricidade_geral'].includes(s)
    );
    
    const hasMechanical = servicesList.some(s => 
      ['motor', 'turbo', 'sistema_arrefecimento', 'cambio_manual', 'cambio_automatico',
       'suspensao_completa', 'amortecedores', 'freio_disco_pastilha_fluido_pinca'].includes(s)
    );
    
    const hasBodywork = servicesList.some(s => 
      ['pintura', 'chapeacao_funilaria', 'polimento', 'estetica_automotiva', 'detailing_automotivo',
       'reparos_rapidos_martelinho'].includes(s)
    );
    
    const hasTires = servicesList.some(s => 
      ['pneus_50', 'pneus_100', 'alinhamento', 'balanceamento', 'cambagem_caster'].includes(s)
    );
    
    const hasTruck = vehicles.includes('truck');
    const hasMotos = vehicles.includes('motos');

    // Determina segmento
    if (hasTruck && hasMechanical) return "Mecânica Diesel / Truck";
    if (hasMotos && hasMechanical) return "Oficina de Motos";
    if (hasBodywork && !hasMechanical) return "Funilaria e Pintura";
    if (hasElectrical && !hasMechanical && !hasBodywork) return "Auto Elétrica";
    if (hasTires && hasMechanical && hasElectrical) return "Auto Center";
    if (hasMechanical && hasElectrical && hasBodywork) return "Centro Automotivo Completo";
    if (hasMechanical && hasElectrical) return "Mecânica Geral";
    if (hasMechanical) return "Mecânica Básica";
    
    return "Oficina Automotiva";
  };

  const addWeldingMachine = () => {
    setFormData({
      ...formData,
      equipment: {
        ...formData.equipment,
        welding_machines: [...formData.equipment.welding_machines, { type: 'mig_mag', quantity: 1 }]
      }
    });
  };

  const removeWeldingMachine = (index) => {
    const newMachines = formData.equipment.welding_machines.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      equipment: { ...formData.equipment, welding_machines: newMachines }
    });
  };

  const updateWeldingMachine = (index, field, value) => {
    const newMachines = [...formData.equipment.welding_machines];
    newMachines[index][field] = field === 'quantity' ? parseInt(value) || 0 : value;
    setFormData({
      ...formData,
      equipment: { ...formData.equipment, welding_machines: newMachines }
    });
  };

  const addScanner = () => {
    setFormData({
      ...formData,
      equipment: {
        ...formData.equipment,
        scanners: [...formData.equipment.scanners, { brand: '', model: '' }]
      }
    });
  };

  const removeScanner = (index) => {
    const newScanners = formData.equipment.scanners.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      equipment: { ...formData.equipment, scanners: newScanners }
    });
  };

  const updateScanner = (index, field, value) => {
    const newScanners = [...formData.equipment.scanners];
    newScanners[index][field] = value;
    setFormData({
      ...formData,
      equipment: { ...formData.equipment, scanners: newScanners }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(formData);
      toast.success("Serviços e equipamentos salvos!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar");
    } finally {
      setEditing(false);
      setSaving(false);
    }
  };

  // Expor função saveCurrentData para componente pai
  useImperativeHandle(ref, () => ({
    saveCurrentData: async () => {
      try {
        await onUpdate(formData);
        setEditing(false);
        return true;
      } catch (error) {
        console.error("Erro ao salvar:", error);
        toast.error("Erro ao salvar");
        return false;
      }
    }
  }));

  const shouldShowServices = !showEquipmentOnly;
  const shouldShowEquipment = !showServicesOnly;

  if (!workshop) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {shouldShowServices && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="w-6 h-6 text-blue-600" />
                  <div>
                    <CardTitle>Veículos, Combustíveis e Categorias</CardTitle>
                    <CardDescription>Defina o perfil da frota que sua oficina atende</CardDescription>
                  </div>
                </div>
                {!editing ? (
                  <Button onClick={() => setEditing(true)} size="sm">Editar</Button>
                ) : (
                  <Button variant="outline" onClick={() => {
                    setEditing(false);
                    setFormData({
                      vehicle_types: workshop.vehicle_types || [],
                      fuel_types: workshop.fuel_types || [],
                      vehicle_categories: workshop.vehicle_categories || [],
                      services_offered: workshop.services_offered || [],
                      equipment: workshop.equipment || {
                          elevators: 0, alignment_ramps: 0, balancing_machines: 0,
                          disc_grinders: 0, shock_tester: 0, welding_machines: [],
                          pneumatic_wrench: 0, paint_booth: 0, lathe: 0, scanners: []
                      }
                    });
                  }} disabled={saving}>Cancelar</Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tipos de Veículos */}
              <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-5 shadow-sm transition-all hover:shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                  <div>
                    <Label className="text-base font-semibold text-slate-900 block">Tipos de Veículos</Label>
                    {editing && <span className="text-xs text-slate-500">Selecione os tipos que você atende</span>}
                  </div>
                  {editing && (
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-white" onClick={() => setFormData({...formData, vehicle_types: ['auto', 'motos']})}>
                        Mais comuns
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setFormData({...formData, vehicle_types: []})}>
                        Limpar
                      </Button>
                    </div>
                  )}
                </div>
                {editing ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {vehicleTypesOptions.map((option) => {
                      const isSelected = formData.vehicle_types.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            vehicle_types: toggleArrayItem(formData.vehicle_types, option.value)
                          })}
                          className={`flex items-center justify-center text-center px-4 py-3 rounded-xl border transition-all duration-200 text-sm font-medium ${
                            isSelected 
                              ? 'bg-slate-900 border-slate-900 text-white shadow-md scale-[1.02]' 
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  formData.vehicle_types.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">Nenhum tipo de veículo selecionado.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {formData.vehicle_types.map((value) => {
                        const option = vehicleTypesOptions.find(opt => opt.value === value);
                        return option ? <Badge key={value} variant="secondary" className="px-3 py-1.5 bg-white border border-slate-200 text-slate-800 shadow-sm rounded-lg">{option.label}</Badge> : null;
                      })}
                    </div>
                  )
                )}
              </div>

              {/* Tipos de Combustível */}
              <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-5 shadow-sm transition-all hover:shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                  <div>
                    <Label className="text-base font-semibold text-slate-900 block">Tipos de Combustível</Label>
                    {editing && <span className="text-xs text-slate-500">Quais motorizações você recebe</span>}
                  </div>
                  {editing && (
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-white" onClick={() => setFormData({...formData, fuel_types: ['flex', 'etanol', 'ciclo_otto', 'diesel']})}>
                        Mais comuns
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setFormData({...formData, fuel_types: []})}>
                        Limpar
                      </Button>
                    </div>
                  )}
                </div>
                {editing ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {fuelTypesOptions.map((option) => {
                      const isSelected = formData.fuel_types.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            fuel_types: toggleArrayItem(formData.fuel_types, option.value)
                          })}
                          className={`flex items-center justify-center text-center px-4 py-3 rounded-xl border transition-all duration-200 text-sm font-medium ${
                            isSelected 
                              ? 'bg-slate-900 border-slate-900 text-white shadow-md scale-[1.02]' 
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  formData.fuel_types.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">Nenhum tipo de combustível selecionado.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {formData.fuel_types.map((value) => {
                        const option = fuelTypesOptions.find(opt => opt.value === value);
                        return option ? <Badge key={value} variant="secondary" className="px-3 py-1.5 bg-white border border-slate-200 text-slate-800 shadow-sm rounded-lg">{option.label}</Badge> : null;
                      })}
                    </div>
                  )
                )}
              </div>

              {/* Categorias de Veículos */}
              <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-5 shadow-sm transition-all hover:shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                  <div>
                    <Label className="text-base font-semibold text-slate-900 block">Categorias de Veículos</Label>
                    {editing && <span className="text-xs text-slate-500">Qual o perfil da sua frota de clientes</span>}
                  </div>
                  {editing && (
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-white" onClick={() => setFormData({...formData, vehicle_categories: ['populares', 'intermediarios', 'utilitarios']})}>
                        Mais comuns
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setFormData({...formData, vehicle_categories: []})}>
                        Limpar
                      </Button>
                    </div>
                  )}
                </div>
                {editing ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {vehicleCategoriesOptions.map((option) => {
                      const isSelected = formData.vehicle_categories.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            vehicle_categories: toggleArrayItem(formData.vehicle_categories, option.value)
                          })}
                          className={`flex items-center justify-center text-center px-4 py-3 rounded-xl border transition-all duration-200 text-sm font-medium ${
                            isSelected 
                              ? 'bg-slate-900 border-slate-900 text-white shadow-md scale-[1.02]' 
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  formData.vehicle_categories.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">Nenhuma categoria de veículo selecionada.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {formData.vehicle_categories.map((value) => {
                        const option = vehicleCategoriesOptions.find(opt => opt.value === value);
                        return option ? <Badge key={value} variant="secondary" className="px-3 py-1.5 bg-white border border-slate-200 text-slate-800 shadow-sm rounded-lg">{option.label}</Badge> : null;
                      })}
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Serviços Oferecidos</CardTitle>
              <CardDescription>Selecione todos os serviços que sua oficina oferece (organizados por categoria)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(servicesOptions).map(([category, services]) => {
                const allSelected = services.length > 0 && services.every(s => formData.services_offered.includes(s.value));
                return (
                <div key={category} className="space-y-3">
                  <div className="flex items-center justify-between bg-blue-50 px-3 py-2 rounded-lg">
                    <h3 className="text-sm font-semibold text-blue-900">
                      {category}
                    </h3>
                    {editing && (
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id={`select-all-${category.replace(/\s+/g, '-')}`}
                          checked={allSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              const newServices = [...formData.services_offered];
                              services.forEach(s => {
                                if (!newServices.includes(s.value)) newServices.push(s.value);
                              });
                              setFormData({ ...formData, services_offered: newServices });
                            } else {
                              const servicesToRemove = services.map(s => s.value);
                              setFormData({
                                ...formData,
                                services_offered: formData.services_offered.filter(s => !servicesToRemove.includes(s))
                              });
                            }
                          }}
                        />
                        <label htmlFor={`select-all-${category.replace(/\s+/g, '-')}`} className="text-xs text-blue-900 cursor-pointer font-medium select-none">
                          Marcar todos
                        </label>
                      </div>
                    )}
                  </div>
                  {editing ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {services.map((option) => {
                        const isSelected = formData.services_offered.includes(option.value);
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setFormData({
                              ...formData,
                              services_offered: toggleArrayItem(formData.services_offered, option.value)
                            })}
                            className={`flex items-center justify-center text-center px-3 py-2 rounded-lg border transition-all duration-200 text-sm font-medium ${
                              isSelected 
                                ? 'bg-slate-900 border-slate-900 text-white shadow-sm' 
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    formData.services_offered.length === 0 ? (
                      <p className="text-sm text-gray-500">Nenhum serviço selecionado.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 pl-2">
                        {services.filter(opt => formData.services_offered.includes(opt.value)).map(opt => (
                            <Badge key={opt.value} variant="secondary" className="text-sm px-3 py-1.5">{opt.label}</Badge>
                        ))}
                      </div>
                    )
                  )}
                </div>
              );
              })}
              <div className="pt-4 border-t space-y-3">
                <p className="text-sm font-semibold text-gray-700">
                  Total: {formData.services_offered.length} serviço(s) selecionado(s)
                </p>
                {formData.services_offered.length > 0 && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-semibold text-blue-900 mb-1">
                      🏷️ Segmento Calculado Automaticamente:
                    </p>
                    <p className="text-lg font-bold text-blue-700">
                      {calculateSegment(formData.services_offered, formData.vehicle_types)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {shouldShowEquipment && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="w-6 h-6 text-purple-600" />
                <div>
                  <CardTitle>Equipamentos</CardTitle>
                  <CardDescription>Informe os equipamentos da oficina</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(editing || formData.equipment.elevators > 0) && (
                <div>
                  <Label>Elevadores</Label>
                  {editing ? (
                    <Input
                      type="number"
                      min="0"
                      value={formData.equipment.elevators}
                      onChange={(e) => setFormData({
                        ...formData,
                        equipment: { ...formData.equipment, elevators: parseInt(e.target.value) || 0 }
                      })}
                    />
                  ) : (
                    <p className="text-base font-medium text-gray-700">{formData.equipment.elevators}</p>
                  )}
                </div>
              )}
              {(editing || formData.equipment.alignment_ramps > 0) && (
                <div>
                  <Label>Rampas de Alinhamento</Label>
                  {editing ? (
                    <Input
                      type="number"
                      min="0"
                      value={formData.equipment.alignment_ramps}
                      onChange={(e) => setFormData({
                        ...formData,
                        equipment: { ...formData.equipment, alignment_ramps: parseInt(e.target.value) || 0 }
                      })}
                    />
                  ) : (
                    <p className="text-base font-medium text-gray-700">{formData.equipment.alignment_ramps}</p>
                  )}
                </div>
              )}
              {(editing || formData.equipment.balancing_machines > 0) && (
                <div>
                  <Label>Balanceadoras</Label>
                  {editing ? (
                    <Input
                      type="number"
                      min="0"
                      value={formData.equipment.balancing_machines}
                      onChange={(e) => setFormData({
                        ...formData,
                        equipment: { ...formData.equipment, balancing_machines: parseInt(e.target.value) || 0 }
                      })}
                    />
                  ) : (
                    <p className="text-base font-medium text-gray-700">{formData.equipment.balancing_machines}</p>
                  )}
                </div>
              )}
              {(editing || formData.equipment.disc_grinders > 0) && (
                <div>
                  <Label>Retificadora de Disco</Label>
                  {editing ? (
                    <Input
                      type="number"
                      min="0"
                      value={formData.equipment.disc_grinders}
                      onChange={(e) => setFormData({
                        ...formData,
                        equipment: { ...formData.equipment, disc_grinders: parseInt(e.target.value) || 0 }
                      })}
                    />
                  ) : (
                    <p className="text-base font-medium text-gray-700">{formData.equipment.disc_grinders}</p>
                  )}
                </div>
              )}
              {(editing || formData.equipment.shock_tester > 0) && (
                <div>
                  <Label>Teste de Amortecedores</Label>
                  {editing ? (
                    <Input
                      type="number"
                      min="0"
                      value={formData.equipment.shock_tester}
                      onChange={(e) => setFormData({
                        ...formData,
                        equipment: { ...formData.equipment, shock_tester: parseInt(e.target.value) || 0 }
                      })}
                    />
                  ) : (
                    <p className="text-base font-medium text-gray-700">{formData.equipment.shock_tester}</p>
                  )}
                </div>
              )}
              {(editing || formData.equipment.pneumatic_wrench > 0) && (
                <div>
                  <Label>Parafusadeira Pneumática</Label>
                  {editing ? (
                    <Input
                      type="number"
                      min="0"
                      value={formData.equipment.pneumatic_wrench}
                      onChange={(e) => setFormData({
                        ...formData,
                        equipment: { ...formData.equipment, pneumatic_wrench: parseInt(e.target.value) || 0 }
                      })}
                    />
                  ) : (
                    <p className="text-base font-medium text-gray-700">{formData.equipment.pneumatic_wrench}</p>
                  )}
                </div>
              )}
              {(editing || formData.equipment.paint_booth > 0) && (
                <div>
                  <Label>Cabine de Pintura</Label>
                  {editing ? (
                    <Input
                      type="number"
                      min="0"
                      value={formData.equipment.paint_booth}
                      onChange={(e) => setFormData({
                        ...formData,
                        equipment: { ...formData.equipment, paint_booth: parseInt(e.target.value) || 0 }
                      })}
                    />
                  ) : (
                    <p className="text-base font-medium text-gray-700">{formData.equipment.paint_booth}</p>
                  )}
                </div>
              )}
              {(editing || formData.equipment.lathe > 0) && (
                <div>
                  <Label>Torno</Label>
                  {editing ? (
                    <Input
                      type="number"
                      min="0"
                      value={formData.equipment.lathe}
                      onChange={(e) => setFormData({
                        ...formData,
                        equipment: { ...formData.equipment, lathe: parseInt(e.target.value) || 0 }
                      })}
                    />
                  ) : (
                    <p className="text-base font-medium text-gray-700">{formData.equipment.lathe}</p>
                  )}
                </div>
              )}
            </div>


          </CardContent>
        </Card>
      )}

      {editing && (
        <p className="text-sm text-gray-500 mt-4 text-center">
            Clique em "Salvar" ou "Cancelar" na parte superior de cada card para finalizar a edição.
        </p>
      )}
    </div>
  );
});

ServicosEquipamentos.displayName = "ServicosEquipamentos";

export default ServicosEquipamentos;