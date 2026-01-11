import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Plus, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { INTELLIGENCE_AREAS, INTELLIGENCE_TYPES, SUBCATEGORIES } from "@/components/lib/clientIntelligenceConstants";

export default function ClientIntelligenceCapturePanel({ workshopId, ataId, onSuccess }) {
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [capturedItems, setCapturedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddItem = async () => {
    if (!selectedArea || !selectedType || !selectedSubcategory) {
      toast.error("Selecione área, tipo e subcategoria");
      return;
    }

    setIsLoading(true);
    try {
      const areaLabel = INTELLIGENCE_AREAS[selectedArea]?.label || selectedArea;
      const typeLabel = INTELLIGENCE_TYPES[selectedType]?.label || selectedType;

      await base44.entities.ClientIntelligence.create({
        workshop_id: workshopId,
        attendance_id: ataId,
        area: selectedArea,
        type: selectedType,
        subcategory: selectedSubcategory,
        title: `${areaLabel} - ${typeLabel}`,
        description: `${subcategoryName} (capturado na ATA)`,
        status: "ativo",
        gravity: "media",
      });

      const newItem = {
        area: areaLabel,
        type: typeLabel,
        subcategory: selectedSubcategory,
      };

      setCapturedItems([...capturedItems, newItem]);
      setSelectedArea("");
      setSelectedType("");
      setSelectedSubcategory("");
      toast.success("Inteligência capturada!");
      onSuccess?.();
    } catch (error) {
      toast.error("Erro ao capturar inteligência");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const subcategoryName = selectedArea && selectedType ? SUBCATEGORIES[selectedArea]?.[0] || "" : "";
  const subcategoryOptions = selectedArea ? (SUBCATEGORIES[selectedArea] || []) : [];

  return (
    <Card className="fixed right-4 top-24 w-80 shadow-2xl print:hidden bg-white border-2 border-blue-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          📊 Capturar Inteligência
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Área */}
        <div>
          <label className="text-xs font-semibold text-gray-700 mb-1 block">Área Principal</label>
          <Select value={selectedArea} onValueChange={setSelectedArea}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(INTELLIGENCE_AREAS).map(([key, val]) => (
                <SelectItem key={key} value={key}>
                  {val.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tipo */}
        {selectedArea && (
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Classificação</label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(INTELLIGENCE_TYPES).map(([key, val]) => (
                  <SelectItem key={key} value={key}>
                    {val.icon} {val.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Subcategoria */}
        {selectedType && (
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Problema Específico</label>
            <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {subcategoryOptions.map((sub) => (
                  <SelectItem key={sub} value={sub}>
                    {sub}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Botão Adicionar */}
        {selectedSubcategory && (
          <Button
            onClick={handleAddItem}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 h-8 text-sm"
            size="sm"
          >
            <Plus className="w-3 h-3 mr-1" />
            Adicionar
          </Button>
        )}

        {/* Itens Capturados */}
        {capturedItems.length > 0 && (
          <div className="border-t pt-3 mt-3">
            <p className="text-xs font-semibold text-gray-700 mb-2">Capturados nesta ATA:</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {capturedItems.map((item, idx) => (
                <div
                  key={idx}
                  className="text-xs bg-blue-50 border border-blue-200 rounded p-2 flex items-start gap-1"
                >
                  <ChevronRight className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-blue-900">{item.area}</p>
                    <p className="text-blue-700">{item.type}</p>
                    <p className="text-blue-600">{item.subcategory}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}