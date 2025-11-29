import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Plus, Trash2, Save, Wrench, Zap, Car, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

export default function EquipamentosCompletos({ workshop, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [equipmentList, setEquipmentList] = useState([]);
  const [activeCategory, setActiveCategory] = useState("mecanica_autocenter");

  useEffect(() => {
    if (workshop?.equipment_list) {
      setEquipmentList(workshop.equipment_list);
    }
  }, [workshop]);

  const handleSave = async () => {
    try {
      await onUpdate({ equipment_list: equipmentList });
      setEditing(false);
    } catch (error) {
      console.error("Erro ao salvar:", error);
    }
  };

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
          {!editing ? (
            <Button onClick={() => setEditing(true)}>Editar</Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
              <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </div>
          )}
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

                    return (
                      <div
                        key={equip}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          isSelected 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleEquipment(categoryKey, equip, false)}
                            disabled={!editing}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${isSelected ? 'text-green-900' : 'text-gray-700'}`}>
                              {equip}
                            </p>
                            {isSelected && editing && (
                              <div className="grid grid-cols-3 gap-2 mt-2">
                                <Input
                                  type="number"
                                  min="1"
                                  placeholder="Qtd"
                                  value={equipData?.quantity || 1}
                                  onChange={(e) => updateEquipment(categoryKey, equip, 'quantity', e.target.value)}
                                  className="h-8 text-xs"
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

                    return (
                      <div
                        key={equip}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          isSelected 
                            ? 'border-orange-500 bg-orange-50' 
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleEquipment(categoryKey, equip, true)}
                            disabled={!editing}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${isSelected ? 'text-orange-900' : 'text-gray-700'}`}>
                              {equip}
                            </p>
                            {isSelected && editing && (
                              <div className="grid grid-cols-3 gap-2 mt-2">
                                <Input
                                  type="number"
                                  min="1"
                                  placeholder="Qtd"
                                  value={equipData?.quantity || 1}
                                  onChange={(e) => updateEquipment(categoryKey, equip, 'quantity', e.target.value)}
                                  className="h-8 text-xs"
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
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}