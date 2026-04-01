import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import QuantityStepper from "@/components/workshop/QuantityStepper";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Plus, Trash2, Wrench, Zap, Car, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const EQUIPMENT_CATALOG = {
  mecanica_autocenter: {
    label: "Mecânica / Auto Center",
    icon: Wrench,
    color: "blue",
    principais: [
      "Elevador automotivo (2 ou 4 colunas)",
      "Rampas de alinhamento",
      "Máquina de alinhamento 3D",
      "Balanceadora de rodas",
      "Desmontadora de pneus",
      "Compressor de ar (mín. 20 pés / 200L)",
      "Lavadora de peças",
      "Prensa hidráulica",
      "Guincho hidráulico (girafa)",
      "Macacos hidráulicos (jacaré e garrafa)",
      "Bancada com morsa",
      "Torquímetro (analógico e digital)",
      "Teste de pressão da bomba de combustível",
      "Teste de compressão e vazão",
      "Kit de teste de vazão de bicos injetores",
      "Máquina de limpeza de bicos",
      "Carrinho de ferramentas completo",
      "Máquina de solda MIG e TIG",
      "Kit de extração de parafusos quebrados",
      "Kit de ferramentas pneumáticas",
      "Kit de ferramentas elétricas (parafusadeiras, furadeiras)"
    ],
    especiais: [
      "Kit de travamento do motor (fusca, GM, VW, Ford, Fiat)",
      "Kit de troca de correia dentada por motores específicos",
      "Chaves de vela especiais (longa / fina / articulada)",
      "Ferramentas de bomba d'água específicas",
      "Ferramentas de suspensão (saca-pivô, saca-terminal, saca-bucha)",
      "Kit de desmontagem de amortecedor (trava de mola)",
      "Torquímetro digital p/ aperto fino",
      "Medidor de espessura de pastilha",
      "Ferramenta de recuar pistão de freio (traseiro)"
    ]
  },
  auto_eletrica: {
    label: "Auto Elétrica",
    icon: Zap,
    color: "yellow",
    principais: [
      "Scanner automotivo profissional",
      "Osciloscópio automotivo",
      "Fonte estabilizada 100A",
      "Carga resistiva",
      "Multímetro automotivo",
      "Caneta de polaridade",
      "Bobina de indutância",
      "Ferramentas para teste de alternador e motor de partida",
      "Testador de rede CAN",
      "Simulador de sensores",
      "Máquina de teste de bateria",
      "Carregador inteligente de bateria",
      "Máquina de recarga de ar condicionado",
      "Detector eletrônico de vazamento AC",
      "Bomba de vácuo elétrica"
    ],
    especiais: [
      "Kit completo de conectores automotivos",
      "Ferramentas de extração de terminais",
      "Alicates de crimpagem profissionais",
      "Pinça amperímetrica automotiva",
      "Kit de verificação de aterramento",
      "Kit de teste de sensores (MAP, MAF, TPS, Lambda)",
      "Endoscópio automotivo (câmera de inspeção)",
      "Testador de chicote e continuidade",
      "Adaptadores OBD universais e específicos"
    ]
  },
  funilaria_pintura: {
    label: "Funilaria e Pintura",
    icon: Car,
    color: "purple",
    principais: [
      "Cabine de pintura pressurizada",
      "Compressor 20–30 pés industrial",
      "Lixadeira roto-orbital pneumática",
      "Politriz profissional",
      "Aspirador industrial",
      "Pistolas de pintura (primer / base / verniz)",
      "Tanque de gravidade",
      "Estufa IR para secagem",
      "Martelinho de ouro – bancada completa",
      "Spotter (máquina de repuxo)",
      "Máquina de solda MIG/MAG",
      "Máquina de solda ponto",
      "Calibrador e regulador pneumático",
      "Carrinho de funilaria",
      "Extrator de amassados com ventosas"
    ],
    especiais: [
      "Pentes de medição de superfície",
      "Medidor de espessura de pintura digital",
      "Kit de espátulas automotivas",
      "Kit martelos e tas para funilaria",
      "Kit cola quente para PDR (martelinho)",
      "Mini lixadeiras de precisão",
      "Escovas rotativas",
      "Sistema de filtragem de ar para cabine"
    ]
  },
  truck_diesel: {
    label: "Truck / Diesel",
    icon: Truck,
    color: "green",
    principais: [
      "Scanner Diesel (Texa / Jaltest)",
      "Elevador / fosso de inspeção",
      "Macaco hidráulico 20–50 toneladas",
      "Prensa 50T",
      "Lavadora de peças industrial",
      "Torquímetro de alta carga",
      "Ferramentas pneumáticas pesadas",
      "Guincho industrial",
      "Teste de bico injetor (bomba de alta pressão)",
      "Ferramentas para diferencial e caixa",
      "Aquecedor de óleo Diesel",
      "Testador de pressão de turbo",
      "Rampas reforçadas",
      "Macacos 15–30 toneladas",
      "Prensa hidráulica 30–50T",
      "Tester de freio a ar",
      "Scanner utilitários",
      "Testador de alternador caminhão",
      "Lavadora industrial grande porte"
    ],
    especiais: [
      "Kit de sincronismo motores Diesel",
      "Ferramentas específicas de Scania, Volvo, Mercedes",
      "Ferramentas para sistema de freio a ar",
      "Teste de EBS/ABS",
      "Medidor de folga de pino-rei",
      "Kit de embreagem pesada",
      "Ferramenta de desmontagem de cubo rolado",
      "Kit de embreagem caminhão",
      "Kit de pino-rei",
      "Extrator de buchas grandes",
      "Kit diferencial / semi eixo",
      "Ferramentas para regulagem de válvulas Diesel"
    ]
  }
};

const EquipamentosCompletos = forwardRef(({ workshop, onUpdate }, ref) => {
  const [editing, setEditing] = useState(false);
  const [equipmentList, setEquipmentList] = useState([]);
  const [activeCategory, setActiveCategory] = useState("mecanica_autocenter");
  const [extraEquipment, setExtraEquipment] = useState({
    welding_machines: [],
    scanners: []
  });

  useEffect(() => {
    if (workshop?.equipment_list) {
      setEquipmentList(workshop.equipment_list);
    } else {
      setEquipmentList([]);
    }

    setExtraEquipment({
      welding_machines: workshop?.equipment?.welding_machines || [],
      scanners: workshop?.equipment?.scanners || []
    });
  }, [workshop]);


  // Expor função saveCurrentData para componente pai
  useImperativeHandle(ref, () => ({
    saveCurrentData: async () => {
      try {
        await onUpdate({
          equipment_list: equipmentList,
          equipment: {
            ...(workshop?.equipment || {}),
            welding_machines: extraEquipment.welding_machines,
            scanners: extraEquipment.scanners
          }
        });
        toast.success("Equipamentos salvos!");
        setEditing(false);
        return true;
      } catch (error) {
        console.error("Erro ao salvar:", error);
        toast.error("Erro ao salvar equipamentos");
        return false;
      }
    }
  }));

  const toggleEquipment = (category, name, isSpecial = false) => {
    const existing = equipmentList.find(
      e => e.category === category && e.name === name
    );

    if (existing) {
      setEquipmentList(equipmentList.filter(
        e => !(e.category === category && e.name === name)
      ));
    } else {
      setEquipmentList([
        ...equipmentList,
        { category, name, quantity: 1, brand: "", model: "", notes: "", isSpecial }
      ]);
    }
  };

  const updateEquipment = (category, name, field, value) => {
    setEquipmentList(equipmentList.map(e => {
      if (e.category === category && e.name === name) {
        return { ...e, [field]: field === 'quantity' ? parseInt(value) || 1 : value };
      }
      return e;
    }));
  };

  const isEquipmentSelected = (category, name) => {
    return equipmentList.some(e => e.category === category && e.name === name);
  };

  const getEquipmentData = (category, name) => {
    return equipmentList.find(e => e.category === category && e.name === name);
  };

  const getCategoryCount = (category) => {
    return equipmentList.filter(e => e.category === category).length;
  };

  const addWeldingMachine = () => {
    setExtraEquipment((prev) => ({
      ...prev,
      welding_machines: [...prev.welding_machines, { type: 'mig_mag', quantity: 1 }]
    }));
  };

  const removeWeldingMachine = (index) => {
    setExtraEquipment((prev) => ({
      ...prev,
      welding_machines: prev.welding_machines.filter((_, i) => i !== index)
    }));
  };

  const updateWeldingMachine = (index, field, value) => {
    setExtraEquipment((prev) => {
      const welding_machines = [...prev.welding_machines];
      welding_machines[index] = {
        ...welding_machines[index],
        [field]: field === 'quantity' ? parseInt(value) || 0 : value
      };
      return { ...prev, welding_machines };
    });
  };

  const addScanner = () => {
    setExtraEquipment((prev) => ({
      ...prev,
      scanners: [...prev.scanners, { brand: '', model: '' }]
    }));
  };

  const removeScanner = (index) => {
    setExtraEquipment((prev) => ({
      ...prev,
      scanners: prev.scanners.filter((_, i) => i !== index)
    }));
  };

  const updateScanner = (index, field, value) => {
    setExtraEquipment((prev) => {
      const scanners = [...prev.scanners];
      scanners[index] = {
        ...scanners[index],
        [field]: value
      };
      return { ...prev, scanners };
    });
  };

  if (!workshop) {
    return <div className="p-8 text-center text-gray-500">Carregando...</div>;
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-purple-600" />
            <div>
              <CardTitle>Equipamentos Completos</CardTitle>
              <CardDescription>
                Selecione os equipamentos disponíveis na oficina
              </CardDescription>
            </div>
          </div>
          <Button onClick={() => setEditing(!editing)}>
            {editing ? "Concluir edição" : "Editar"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-2 flex-wrap">
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            Total: {equipmentList.length} equipamentos
          </Badge>
          {Object.entries(EQUIPMENT_CATALOG).map(([key, cat]) => (
            <Badge key={key} variant="outline" className={`bg-${cat.color}-50 text-${cat.color}-700`}>
              {cat.label}: {getCategoryCount(key)}
            </Badge>
          ))}
        </div>

        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
            {Object.entries(EQUIPMENT_CATALOG).map(([key, cat]) => {
              const Icon = cat.icon;
              return (
                <TabsTrigger key={key} value={key} className="text-xs">
                  <Icon className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">{cat.label.split('/')[0]}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {Object.entries(EQUIPMENT_CATALOG).map(([categoryKey, category]) => (
            <TabsContent key={categoryKey} value={categoryKey} className="space-y-6">
              {/* Equipamentos Principais */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Equipamentos Principais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {category.principais.map((equip) => {
                    const isSelected = isEquipmentSelected(categoryKey, equip);
                    const equipData = getEquipmentData(categoryKey, equip);

                    if (!editing && !isSelected) return null;

                    return (
                      <div
                        key={equip}
                        onClick={editing ? () => toggleEquipment(categoryKey, equip, false) : undefined}
                        className={`p-3 rounded-lg border-2 transition-all ${editing ? 'cursor-pointer' : ''} ${
                          isSelected
                            ? (editing ? 'border-green-500 bg-green-50' : 'border-green-200 bg-green-50')
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${isSelected ? 'text-green-900' : 'text-gray-700'}`}>
                              {equip}
                            </p>
                            {isSelected && editing && (
                              <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_1fr] gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                                <QuantityStepper
                                  value={equipData?.quantity || 1}
                                  min={1}
                                  onChange={(value) => updateEquipment(categoryKey, equip, 'quantity', value)}
                                />
                                <Input
                                  placeholder="Marca"
                                  value={equipData?.brand || ''}
                                  onChange={(e) => updateEquipment(categoryKey, equip, 'brand', e.target.value)}
                                  className="h-8 text-xs"
                                />
                                <Input
                                  placeholder="Modelo"
                                  value={equipData?.model || ''}
                                  onChange={(e) => updateEquipment(categoryKey, equip, 'model', e.target.value)}
                                  className="h-8 text-xs"
                                />
                              </div>
                            )}
                            {isSelected && !editing && equipData && (
                              <p className="text-xs text-gray-500 mt-1">
                                Qtd: {equipData.quantity || 1}
                                {equipData.brand && ` | ${equipData.brand}`}
                                {equipData.model && ` ${equipData.model}`}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ferramentas Especiais */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Wrench className="w-5 h-5" />
                  Ferramentas Especiais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {category.especiais.map((equip) => {
                    const isSelected = isEquipmentSelected(categoryKey, equip);
                    const equipData = getEquipmentData(categoryKey, equip);

                    if (!editing && !isSelected) return null;

                    return (
                      <div
                        key={equip}
                        onClick={editing ? () => toggleEquipment(categoryKey, equip, true) : undefined}
                        className={`p-3 rounded-lg border-2 transition-all ${editing ? 'cursor-pointer' : ''} ${
                          isSelected
                            ? (editing ? 'border-orange-500 bg-orange-50' : 'border-orange-200 bg-orange-50')
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${isSelected ? 'text-orange-900' : 'text-gray-700'}`}>
                              {equip}
                            </p>
                            {isSelected && editing && (
                              <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_1fr] gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                                <QuantityStepper
                                  value={equipData?.quantity || 1}
                                  min={1}
                                  onChange={(value) => updateEquipment(categoryKey, equip, 'quantity', value)}
                                />
                                <Input
                                  placeholder="Marca"
                                  value={equipData?.brand || ''}
                                  onChange={(e) => updateEquipment(categoryKey, equip, 'brand', e.target.value)}
                                  className="h-8 text-xs"
                                />
                                <Input
                                  placeholder="Modelo"
                                  value={equipData?.model || ''}
                                  onChange={(e) => updateEquipment(categoryKey, equip, 'model', e.target.value)}
                                  className="h-8 text-xs"
                                />
                              </div>
                            )}
                            {isSelected && !editing && equipData && (
                              <p className="text-xs text-gray-500 mt-1">
                                Qtd: {equipData.quantity || 1}
                                {equipData.brand && ` | ${equipData.brand}`}
                                {equipData.model && ` ${equipData.model}`}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t pt-6 space-y-6">
                <div>
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
                    {editing ? (
                      extraEquipment.welding_machines.map((machine, index) => (
                        <div key={index} className="flex gap-3 items-end">
                          <div className="flex-1">
                            <Label>Tipo</Label>
                            <Select
                              value={machine.type}
                              onValueChange={(value) => updateWeldingMachine(index, 'type', value)}
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
                          <div className="w-[140px]">
                            <Label>Qtd</Label>
                            <QuantityStepper
                              value={machine.quantity}
                              min={1}
                              onChange={(value) => updateWeldingMachine(index, 'quantity', value)}
                            />
                          </div>
                          <Button size="icon" variant="destructive" onClick={() => removeWeldingMachine(index)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      extraEquipment.welding_machines.length === 0 ? (
                        <p className="text-sm text-gray-500">Nenhuma máquina de solda cadastrada.</p>
                      ) : (
                        extraEquipment.welding_machines.map((machine, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Badge variant="secondary">{machine.type} ({machine.quantity})</Badge>
                          </div>
                        ))
                      )
                    )}
                  </div>
                </div>

                <div>
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
                    {editing ? (
                      extraEquipment.scanners.map((scanner, index) => (
                        <div key={index} className="flex gap-3 items-end">
                          <div className="flex-1">
                            <Label>Marca</Label>
                            <Input
                              value={scanner.brand}
                              onChange={(e) => updateScanner(index, 'brand', e.target.value)}
                              placeholder="Ex: Bosch"
                            />
                          </div>
                          <div className="flex-1">
                            <Label>Modelo</Label>
                            <Input
                              value={scanner.model}
                              onChange={(e) => updateScanner(index, 'model', e.target.value)}
                              placeholder="Ex: KTS 590"
                            />
                          </div>
                          <Button size="icon" variant="destructive" onClick={() => removeScanner(index)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      extraEquipment.scanners.length === 0 ? (
                        <p className="text-sm text-gray-500">Nenhum scanner cadastrado.</p>
                      ) : (
                        extraEquipment.scanners.map((scanner, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Badge variant="secondary">{scanner.brand} {scanner.model}</Badge>
                          </div>
                        ))
                      )
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
});

EquipamentosCompletos.displayName = "EquipamentosCompletos";

export default EquipamentosCompletos;