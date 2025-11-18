import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings, Package, Plus, Trash2, Save } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ServicosEquipamentos({ workshop, onUpdate, showServicesOnly, showEquipmentOnly }) {
  const [editing, setEditing] = useState(false);
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
    { value: 'flex', label: 'Flex' }
  ];

  const vehicleCategoriesOptions = [
    { value: 'premium_luxo', label: 'Premium Luxo' },
    { value: 'super_carros', label: 'Super Carros' },
    { value: 'intermediarios', label: 'Intermediários' },
    { value: 'populares', label: 'Populares' },
    { value: 'utilitarios', label: 'Utilitários' },
    { value: 'transporte', label: 'Transporte' }
  ];

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

  const toggleArrayItem = (array, item) => {
    return array.includes(item) ? array.filter(i => i !== item) : [...array, item];
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
    await onUpdate(formData);
    setEditing(false);
  };

  const shouldShowServices = !showEquipmentOnly;
  const shouldShowEquipment = !showServicesOnly;

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
                    <CardTitle>Tipos de Veículos e Combustíveis</CardTitle>
                    <CardDescription>Defina os tipos de veículos atendidos</CardDescription>
                  </div>
                </div>
                {!editing && <Button onClick={() => setEditing(true)} size="sm">Editar</Button>}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-semibold mb-3 block">Tipos de Veículos</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {vehicleTypesOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`vehicle-${option.value}`}
                        checked={formData.vehicle_types.includes(option.value)}
                        onCheckedChange={() => setFormData({
                          ...formData,
                          vehicle_types: toggleArrayItem(formData.vehicle_types, option.value)
                        })}
                        disabled={!editing}
                      />
                      <label htmlFor={`vehicle-${option.value}`} className="text-sm cursor-pointer">
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-base font-semibold mb-3 block">Tipos de Combustível</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {fuelTypesOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`fuel-${option.value}`}
                        checked={formData.fuel_types.includes(option.value)}
                        onCheckedChange={() => setFormData({
                          ...formData,
                          fuel_types: toggleArrayItem(formData.fuel_types, option.value)
                        })}
                        disabled={!editing}
                      />
                      <label htmlFor={`fuel-${option.value}`} className="text-sm cursor-pointer">
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-base font-semibold mb-3 block">Categorias de Veículos</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {vehicleCategoriesOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${option.value}`}
                        checked={formData.vehicle_categories.includes(option.value)}
                        onCheckedChange={() => setFormData({
                          ...formData,
                          vehicle_categories: toggleArrayItem(formData.vehicle_categories, option.value)
                        })}
                        disabled={!editing}
                      />
                      <label htmlFor={`category-${option.value}`} className="text-sm cursor-pointer">
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Serviços Oferecidos</CardTitle>
              <CardDescription>Selecione todos os serviços que sua oficina oferece</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {servicesOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`service-${option.value}`}
                      checked={formData.services_offered.includes(option.value)}
                      onCheckedChange={() => setFormData({
                        ...formData,
                        services_offered: toggleArrayItem(formData.services_offered, option.value)
                      })}
                      disabled={!editing}
                    />
                    <label htmlFor={`service-${option.value}`} className="text-sm cursor-pointer">
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-4">
                {formData.services_offered.length} serviço(s) selecionado(s)
              </p>
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
              <div>
                <Label>Elevadores</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.equipment.elevators}
                  onChange={(e) => setFormData({
                    ...formData,
                    equipment: { ...formData.equipment, elevators: parseInt(e.target.value) || 0 }
                  })}
                  disabled={!editing}
                />
              </div>
              <div>
                <Label>Rampas de Alinhamento</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.equipment.alignment_ramps}
                  onChange={(e) => setFormData({
                    ...formData,
                    equipment: { ...formData.equipment, alignment_ramps: parseInt(e.target.value) || 0 }
                  })}
                  disabled={!editing}
                />
              </div>
              <div>
                <Label>Balanceadoras</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.equipment.balancing_machines}
                  onChange={(e) => setFormData({
                    ...formData,
                    equipment: { ...formData.equipment, balancing_machines: parseInt(e.target.value) || 0 }
                  })}
                  disabled={!editing}
                />
              </div>
              <div>
                <Label>Retificadora de Disco</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.equipment.disc_grinders}
                  onChange={(e) => setFormData({
                    ...formData,
                    equipment: { ...formData.equipment, disc_grinders: parseInt(e.target.value) || 0 }
                  })}
                  disabled={!editing}
                />
              </div>
              <div>
                <Label>Teste de Amortecedores</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.equipment.shock_tester}
                  onChange={(e) => setFormData({
                    ...formData,
                    equipment: { ...formData.equipment, shock_tester: parseInt(e.target.value) || 0 }
                  })}
                  disabled={!editing}
                />
              </div>
              <div>
                <Label>Parafusadeira Pneumática</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.equipment.pneumatic_wrench}
                  onChange={(e) => setFormData({
                    ...formData,
                    equipment: { ...formData.equipment, pneumatic_wrench: parseInt(e.target.value) || 0 }
                  })}
                  disabled={!editing}
                />
              </div>
              <div>
                <Label>Cabine de Pintura</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.equipment.paint_booth}
                  onChange={(e) => setFormData({
                    ...formData,
                    equipment: { ...formData.equipment, paint_booth: parseInt(e.target.value) || 0 }
                  })}
                  disabled={!editing}
                />
              </div>
              <div>
                <Label>Torno</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.equipment.lathe}
                  onChange={(e) => setFormData({
                    ...formData,
                    equipment: { ...formData.equipment, lathe: parseInt(e.target.value) || 0 }
                  })}
                  disabled={!editing}
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-semibold">Máquinas de Solda</Label>
                {editing && (
                  <Button size="sm" onClick={addWeldingMachine}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                {formData.equipment.welding_machines.map((machine, index) => (
                  <div key={index} className="flex gap-3 items-end">
                    <div className="flex-1">
                      <Label>Tipo</Label>
                      <Select
                        value={machine.type}
                        onValueChange={(value) => updateWeldingMachine(index, 'type', value)}
                        disabled={!editing}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mig_mag">MIG/MAG</SelectItem>
                          <SelectItem value="tig">TIG</SelectItem>
                          <SelectItem value="eletrodo">Eletrodo</SelectItem>
                          <SelectItem value="macarico">Maçarico</SelectItem>
                          <SelectItem value="spotter">Spotter</SelectItem>
                          <SelectItem value="plasma">Plasma</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <Label>Qtd</Label>
                      <Input
                        type="number"
                        min="1"
                        value={machine.quantity}
                        onChange={(e) => updateWeldingMachine(index, 'quantity', e.target.value)}
                        disabled={!editing}
                      />
                    </div>
                    {editing && (
                      <Button size="icon" variant="destructive" onClick={() => removeWeldingMachine(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {formData.equipment.welding_machines.length === 0 && (
                  <p className="text-sm text-gray-500">Nenhuma máquina de solda cadastrada</p>
                )}
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-semibold">Scanners</Label>
                {editing && (
                  <Button size="sm" onClick={addScanner}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                {formData.equipment.scanners.map((scanner, index) => (
                  <div key={index} className="flex gap-3 items-end">
                    <div className="flex-1">
                      <Label>Marca</Label>
                      <Input
                        value={scanner.brand}
                        onChange={(e) => updateScanner(index, 'brand', e.target.value)}
                        disabled={!editing}
                        placeholder="Ex: Bosch"
                      />
                    </div>
                    <div className="flex-1">
                      <Label>Modelo</Label>
                      <Input
                        value={scanner.model}
                        onChange={(e) => updateScanner(index, 'model', e.target.value)}
                        disabled={!editing}
                        placeholder="Ex: KTS 590"
                      />
                    </div>
                    {editing && (
                      <Button size="icon" variant="destructive" onClick={() => removeScanner(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {formData.equipment.scanners.length === 0 && (
                  <p className="text-sm text-gray-500">Nenhum scanner cadastrado</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {editing && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => {
            setEditing(false);
            setFormData({
              vehicle_types: workshop.vehicle_types || [],
              fuel_types: workshop.fuel_types || [],
              vehicle_categories: workshop.vehicle_categories || [],
              services_offered: workshop.services_offered || [],
              equipment: workshop.equipment || {}
            });
          }}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            Salvar Alterações
          </Button>
        </div>
      )}
    </div>
  );
}