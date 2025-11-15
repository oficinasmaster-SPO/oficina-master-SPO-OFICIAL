import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, Plus, Trash2 } from "lucide-react";

export default function ServicosEquipamentos({ workshop, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
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
      pneumatic_wrench: 0,
      paint_booth: 0,
      lathe: 0,
      welding_machines: [],
      scanners: []
    }
  });

  const handleSave = async () => {
    await onUpdate(formData);
    setEditing(false);
  };

  const toggleSelection = (field, value) => {
    const current = formData[field] || [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    setFormData({ ...formData, [field]: updated });
  };

  const addScanner = () => {
    setFormData({
      ...formData,
      equipment: {
        ...formData.equipment,
        scanners: [...(formData.equipment.scanners || []), { brand: "", model: "" }]
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

  const vehicleTypes = [
    { value: "auto", label: "Auto" },
    { value: "motos", label: "Motos" },
    { value: "truck", label: "Truck" },
    { value: "barcos", label: "Barcos" },
    { value: "aviao", label: "Avião" },
    { value: "bicicletas", label: "Bicicletas" },
    { value: "agro_maquina", label: "Agro Máquina" },
    { value: "trator", label: "Trator" }
  ];

  const fuelTypes = [
    { value: "diesel", label: "Diesel" },
    { value: "ciclo_otto", label: "Ciclo Otto" },
    { value: "etanol", label: "Etanol" },
    { value: "eletrico", label: "Elétrico" },
    { value: "hibrido", label: "Híbrido" },
    { value: "flex", label: "Flex" }
  ];

  const categories = [
    { value: "premium_luxo", label: "Premium/Luxo" },
    { value: "super_carros", label: "Super Carros" },
    { value: "intermediarios", label: "Intermediários" },
    { value: "populares", label: "Populares" },
    { value: "utilitarios", label: "Utilitários" },
    { value: "transporte", label: "Transporte" }
  ];

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tipos de Veículos e Combustíveis</CardTitle>
            {!editing ? (
              <Button onClick={() => setEditing(true)}>Editar</Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-base font-semibold mb-3 block">Tipos de Veículos</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {vehicleTypes.map((type) => (
                <div key={type.value} className="flex items-center space-x-2">
                  <Checkbox
                    checked={(formData.vehicle_types || []).includes(type.value)}
                    onCheckedChange={() => toggleSelection('vehicle_types', type.value)}
                    disabled={!editing}
                  />
                  <label className="text-sm">{type.label}</label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-base font-semibold mb-3 block">Tipos de Combustível</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {fuelTypes.map((fuel) => (
                <div key={fuel.value} className="flex items-center space-x-2">
                  <Checkbox
                    checked={(formData.fuel_types || []).includes(fuel.value)}
                    onCheckedChange={() => toggleSelection('fuel_types', fuel.value)}
                    disabled={!editing}
                  />
                  <label className="text-sm">{fuel.label}</label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-base font-semibold mb-3 block">Categorias de Veículos</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {categories.map((cat) => (
                <div key={cat.value} className="flex items-center space-x-2">
                  <Checkbox
                    checked={(formData.vehicle_categories || []).includes(cat.value)}
                    onCheckedChange={() => toggleSelection('vehicle_categories', cat.value)}
                    disabled={!editing}
                  />
                  <label className="text-sm">{cat.label}</label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Equipamentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>Elevadores</Label>
              <Input
                type="number"
                value={formData.equipment.elevators}
                onChange={(e) => setFormData({
                  ...formData,
                  equipment: { ...formData.equipment, elevators: parseInt(e.target.value) || 0 }
                })}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Rampas Alinhamento</Label>
              <Input
                type="number"
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
                value={formData.equipment.balancing_machines}
                onChange={(e) => setFormData({
                  ...formData,
                  equipment: { ...formData.equipment, balancing_machines: parseInt(e.target.value) || 0 }
                })}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Retificadora Disco</Label>
              <Input
                type="number"
                value={formData.equipment.disc_grinders}
                onChange={(e) => setFormData({
                  ...formData,
                  equipment: { ...formData.equipment, disc_grinders: parseInt(e.target.value) || 0 }
                })}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Teste Amortecedor</Label>
              <Input
                type="number"
                value={formData.equipment.shock_tester}
                onChange={(e) => setFormData({
                  ...formData,
                  equipment: { ...formData.equipment, shock_tester: parseInt(e.target.value) || 0 }
                })}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Parafusadeira Pneu</Label>
              <Input
                type="number"
                value={formData.equipment.pneumatic_wrench}
                onChange={(e) => setFormData({
                  ...formData,
                  equipment: { ...formData.equipment, pneumatic_wrench: parseInt(e.target.value) || 0 }
                })}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Cabine Pintura</Label>
              <Input
                type="number"
                value={formData.equipment.paint_booth}
                onChange={(e) => setFormData({
                  ...formData,
                  equipment: { ...formData.equipment, paint_booth: parseInt(e.target.value) || 0 }
                })}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Torno Retifica</Label>
              <Input
                type="number"
                value={formData.equipment.lathe}
                onChange={(e) => setFormData({
                  ...formData,
                  equipment: { ...formData.equipment, lathe: parseInt(e.target.value) || 0 }
                })}
                disabled={!editing}
              />
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Scanners</h3>
              {editing && (
                <Button size="sm" onClick={addScanner}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              )}
            </div>
            {!formData.equipment.scanners || formData.equipment.scanners.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum scanner cadastrado</p>
            ) : (
              <div className="space-y-2">
                {formData.equipment.scanners.map((scanner, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="Marca"
                      value={scanner.brand}
                      onChange={(e) => updateScanner(index, 'brand', e.target.value)}
                      disabled={!editing}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Modelo"
                      value={scanner.model}
                      onChange={(e) => updateScanner(index, 'model', e.target.value)}
                      disabled={!editing}
                      className="flex-1"
                    />
                    {editing && (
                      <Button size="icon" variant="destructive" onClick={() => removeScanner(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}