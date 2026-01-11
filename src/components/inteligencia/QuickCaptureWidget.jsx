import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader, Lightbulb, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function QuickCaptureWidget({ workshopId, ataId, onSuccess }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestedItems, setSuggestedItems] = useState([]);
  const [selectedType, setSelectedType] = useState("dor");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "dor",
    area: "",
    gravity: "media",
    action_defined: false,
  });

  const types = ["dor", "duvida", "desejo", "risco", "evolucao"];

  const handleAnalyzeAta = async () => {
    if (!ataId) {
      toast.error("Ata não carregada");
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await base44.functions.invoke("analyzeClientIntelligence", {
        workshopId,
        ataId,
        analysisType: "full",
      });

      if (result.data?.suggestions) {
        setSuggestedItems(result.data.suggestions);
        toast.success(`${result.data.suggestions.length} sugestões geradas`);
      }
    } catch (error) {
      console.error("Erro ao analisar:", error);
      toast.error("Erro ao gerar sugestões");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleQuickAdd = async () => {
    if (!formData.title) {
      toast.error("Título obrigatório");
      return;
    }

    try {
      await base44.entities.ClientIntelligence.create({
        ...formData,
        workshop_id: workshopId,
        status: "ativo",
      });

      toast.success("Inteligência registrada!");
      setFormData({ title: "", description: "", type: "dor", area: "", gravity: "media", action_defined: false });
      onSuccess?.();
    } catch (error) {
      console.error("Erro ao criar:", error);
      toast.error("Erro ao registrar inteligência");
    }
  };

  const handleAddSuggestion = async (suggestion) => {
    try {
      await base44.entities.ClientIntelligence.create({
        ...suggestion,
        workshop_id: workshopId,
        status: "ativo",
      });

      setSuggestedItems(suggestedItems.filter(s => s !== suggestion));
      toast.success("Inteligência adicionada!");
      onSuccess?.();
    } catch (error) {
      toast.error("Erro ao adicionar");
    }
  };

  if (!isOpen) {
    return (
      <div className="print:hidden">
        <Button
          onClick={() => setIsOpen(true)}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
          size="sm"
        >
          <Lightbulb className="w-4 h-4" />
          Capturar Inteligência
        </Button>
      </div>
    );
  }

  return (
    <div className="print:hidden fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
      <div className="flex items-center justify-between p-4 border-b bg-blue-50">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-blue-600" />
          Capturar Inteligência
        </h3>
        <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {/* Análise Automática */}
        <div className="border-b pb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Análise Automática da Ata</p>
          <Button
            onClick={handleAnalyzeAta}
            disabled={isAnalyzing}
            variant="outline"
            className="w-full justify-center gap-2"
            size="sm"
          >
            {isAnalyzing && <Loader className="w-4 h-4 animate-spin" />}
            {isAnalyzing ? "Analisando..." : "Analisar Ata com IA"}
          </Button>
        </div>

        {/* Sugestões da IA */}
        {suggestedItems.length > 0 && (
          <div className="border-b pb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Sugestões Geradas ({suggestedItems.length})</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {suggestedItems.map((item, idx) => (
                <div key={idx} className="bg-blue-50 p-2 rounded text-sm">
                  <p className="font-medium text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-600 mt-1">{item.description}</p>
                  <Button
                    onClick={() => handleAddSuggestion(item)}
                    size="xs"
                    variant="ghost"
                    className="mt-2 text-xs"
                  >
                    + Adicionar
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Captura Manual Rápida */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Captura Manual</p>

          <div className="space-y-2">
            <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>

            <Input
              placeholder="Título"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="h-8 text-sm"
            />

            <Textarea
              placeholder="Descrição rápida"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="text-sm resize-none h-16"
            />

            <Select value={formData.gravity} onValueChange={(v) => setFormData({ ...formData, gravity: v })}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleQuickAdd} className="w-full h-8 text-sm bg-green-600 hover:bg-green-700">
              Registrar Inteligência
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}