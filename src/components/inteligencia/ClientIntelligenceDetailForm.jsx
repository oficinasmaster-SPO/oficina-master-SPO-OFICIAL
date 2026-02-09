import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const COMMON_CAUSES = [
  "Falta de comunicação",
  "Processo não padronizado",
  "Falta de recursos",
  "Resistência à mudança",
  "Falta de treinamento",
  "Ferramentas inadequadas",
  "Falta de tempo",
  "Priorização incorreta",
];

export default function ClientIntelligenceDetailForm({ open, onOpenChange, intelligenceId, intelligenceItem, onSuccess }) {
  const [description, setDescription] = useState("");
  const [impact, setImpact] = useState("");
  const [frequency, setFrequency] = useState("");
  const [causesSelected, setCausesSelected] = useState([]);
  const [attemptedSolutions, setAttemptedSolutions] = useState("");
  const [responsibles, setResponsibles] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Buscar checklist baseado na área e tipo da inteligência
  const { data: checklist, isLoading: loadingChecklist } = useQuery({
    queryKey: ['checklist-for-intelligence', intelligenceItem?.area, intelligenceItem?.type],
    queryFn: async () => {
      if (!intelligenceItem?.area || !intelligenceItem?.type) return null;
      
      const checklists = await base44.entities.ClientIntelligenceChecklist.filter({
        area: intelligenceItem.area,
        type: intelligenceItem.type,
        status: "ativo"
      });
      
      // Priorizar checklist padrão
      const defaultChecklist = checklists.find(c => c.is_default);
      return defaultChecklist || checklists[0] || null;
    },
    enabled: !!intelligenceItem?.area && !!intelligenceItem?.type && open,
  });

  const handleToggleCause = (cause) => {
    setCausesSelected(prev =>
      prev.includes(cause) ? prev.filter(c => c !== cause) : [...prev, cause]
    );
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error("Descrição é obrigatória");
      return;
    }

    setIsLoading(true);
    try {
      await base44.entities.ClientIntelligence.update(intelligenceId, {
        description: description,
        impact: impact,
        is_recurring: frequency === "recorrente",
        tags: causesSelected,
        action_description: attemptedSolutions,
        resolution_date: deadline,
        metadata: { responsibles }
      });

      toast.success("Inteligência detalhada com sucesso!");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error("Erro ao salvar detalhes");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aprofundar Inteligência</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Descrição */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              Descrição Detalhada *
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva em detalhes o problema, contexto e situação atual..."
              className="min-h-24"
            />
          </div>

          {/* Impacto */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              Impacto Quantitativo
            </label>
            <Input
              value={impact}
              onChange={(e) => setImpact(e.target.value)}
              placeholder="Ex: 10% de perda de receita, 5 horas/mês, 20 clientes afetados"
            />
          </div>

          {/* Frequência */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              Frequência
            </label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pontual">Pontual</SelectItem>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="mensal">Mensal</SelectItem>
                <SelectItem value="diaria">Diária</SelectItem>
                <SelectItem value="recorrente">Recorrente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Causas - Checklist Dinâmico */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              Possíveis Causas {checklist && `- ${checklist.title}`}
            </label>
            {loadingChecklist ? (
              <div className="flex items-center justify-center py-8 bg-gray-50 rounded-lg">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">Carregando checklist...</span>
              </div>
            ) : checklist && checklist.items?.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg">
                {checklist.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={causesSelected.includes(item.label)}
                      onCheckedChange={() => handleToggleCause(item.label)}
                    />
                    <label className="text-sm text-gray-700 cursor-pointer">{item.label}</label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
                {COMMON_CAUSES.map((cause) => (
                  <div key={cause} className="flex items-center gap-2">
                    <Checkbox
                      checked={causesSelected.includes(cause)}
                      onCheckedChange={() => handleToggleCause(cause)}
                    />
                    <label className="text-sm text-gray-700 cursor-pointer">{cause}</label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Soluções Tentadas */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              Soluções Já Tentadas
            </label>
            <Textarea
              value={attemptedSolutions}
              onChange={(e) => setAttemptedSolutions(e.target.value)}
              placeholder="Descreva o que foi tentado e os resultados..."
              className="min-h-20"
            />
          </div>

          {/* Responsáveis */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              Responsáveis
            </label>
            <Input
              value={responsibles}
              onChange={(e) => setResponsibles(e.target.value)}
              placeholder="Nomes/áreas envolvidas"
            />
          </div>

          {/* Prazo */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              Prazo Desejado
            </label>
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          {/* Botões */}
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? "Salvando..." : "Salvar Detalhes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}