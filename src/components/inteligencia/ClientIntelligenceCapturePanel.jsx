import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, ChevronRight, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { INTELLIGENCE_AREAS, INTELLIGENCE_TYPES, SUBCATEGORIES } from "@/components/lib/clientIntelligenceConstants";
import ClientIntelligenceDetailForm from "./ClientIntelligenceDetailForm";
import ClientIntelligenceCaptureViewer from "./ClientIntelligenceCaptureViewer";

export default function ClientIntelligenceCapturePanel({ workshopId, ataId, onSuccess, onIntelligenceAdded }) {
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [capturedItems, setCapturedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [detailFormOpen, setDetailFormOpen] = useState(false);
  const [lastIntelligenceId, setLastIntelligenceId] = useState(null);
  const [pendingIntelligence, setPendingIntelligence] = useState(null);

  const handleAddItem = async () => {
    if (!selectedArea || !selectedType || !selectedSubcategory) {
      toast.error("Selecione área, tipo e subcategoria");
      return;
    }

    setIsLoading(true);
    try {
      const areaLabel = INTELLIGENCE_AREAS[selectedArea]?.label || selectedArea;
      const typeLabel = INTELLIGENCE_TYPES[selectedType]?.label || selectedType;
      const subLabel = SUBCATEGORIES[selectedArea]?.find(s => s === selectedSubcategory) || selectedSubcategory;

      const result = await base44.entities.ClientIntelligence.create({
        workshop_id: workshopId,
        attendance_id: ataId,
        area: selectedArea,
        type: selectedType,
        subcategory: selectedSubcategory,
        title: `${areaLabel} - ${typeLabel}`,
        description: `${subLabel} (capturado na ATA)`,
        status: "ativo",
        gravity: "media",
      });

      const typeObj = INTELLIGENCE_TYPES[selectedType];
      const gravityLabel = { baixa: "Baixa", media: "Média", alta: "Alta", critica: "Crítica" }["media"];

      const newItem = {
            area: areaLabel,
            type: typeLabel,
            subcategory: selectedSubcategory,
            title: `${areaLabel} - ${typeLabel}`,
            gravity: "media",
            gravityLabel,
            typeIcon: typeObj?.icon,
            typeColor: typeObj?.color,
          };

          setCapturedItems([...capturedItems, newItem]);
          setPendingIntelligence(newItem);
          setSelectedArea("");
          setSelectedType("");
          setSelectedSubcategory("");
          setLastIntelligenceId(result.id);

          // Mostrar modal com opção de adicionar à pauta
          if (onIntelligenceAdded) {
            const addToPauta = confirm(`Adicionar "${newItem.title}" à pauta desta reunião?`);
            if (addToPauta) {
              onIntelligenceAdded(newItem);
            }
          }

          setDetailFormOpen(true);
          toast.success("Inteligência capturada! Aprofunde os detalhes...");
    } catch (error) {
      toast.error("Erro ao capturar inteligência");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const subcategoryOptions = selectedArea ? (SUBCATEGORIES[selectedArea] || []) : [];

  return (
    <>
      <div className="space-y-3">
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
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Inteligência
        </Button>
        )}

        {/* Itens Capturados */}
        {capturedItems.length > 0 && (
        <div className="border-t pt-4 mt-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Capturados:</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {capturedItems.map((item, idx) => (
              <div
                key={idx}
                className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 rounded-lg p-3 space-y-2"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-700 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold text-blue-900">{item.area}</p>
                  </div>
                </div>
                <div className="ml-6 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-600">Tipo:</span>
                    <span className={`text-xs font-medium ${item.typeColor ? `text-${item.typeColor}` : 'text-blue-700'}`}>
                      {item.typeIcon} {item.type}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-600">Problema:</span>
                    <p className="text-xs text-blue-800 font-medium">{item.subcategory}</p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs font-semibold text-gray-600">Gravidade:</span>
                    <span className="inline-block px-2 py-0.5 bg-yellow-200 text-yellow-900 text-xs font-bold rounded">
                      {item.gravityLabel}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}
      </div>

      <ClientIntelligenceDetailForm
        open={detailFormOpen}
        onOpenChange={setDetailFormOpen}
        intelligenceId={lastIntelligenceId}
        onSuccess={onSuccess}
      />
      </>
      );
      }