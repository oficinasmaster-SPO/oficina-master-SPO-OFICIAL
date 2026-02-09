import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ClientIntelligenceEvolutionForm({ open, onOpenChange, intelligenceId, onSuccess }) {
  const [solutionApplied, setSolutionApplied] = useState("");
  const [impactBefore, setImpactBefore] = useState("");
  const [impactAfter, setImpactAfter] = useState("");
  const [learnings, setLearnings] = useState("");
  const [status, setStatus] = useState("");
  const [evolutionDate, setEvolutionDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!solutionApplied.trim()) {
      toast.error("Descrição da solução é obrigatória");
      return;
    }

    setIsLoading(true);
    try {
      await base44.entities.ClientIntelligence.update(intelligenceId, {
        action_description: solutionApplied,
        status: status || "em_progresso",
        resolution_date: evolutionDate,
        metadata: {
          evolution: {
            impactBefore,
            impactAfter,
            learnings,
            evolutionDate
          }
        }
      });

      toast.success("Evolução registrada com sucesso!");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error("Erro ao registrar evolução");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Evolução</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Solução Aplicada */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              Solução que Funcionou *
            </label>
            <Textarea
              value={solutionApplied}
              onChange={(e) => setSolutionApplied(e.target.value)}
              placeholder="Descreva a solução que foi implementada..."
              className="min-h-24"
            />
          </div>

          {/* Impacto Antes */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              Impacto Antes
            </label>
            <Input
              value={impactBefore}
              onChange={(e) => setImpactBefore(e.target.value)}
              placeholder="Ex: 10% de perda, 5 horas/mês perdidas"
            />
          </div>

          {/* Impacto Depois */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              Impacto Depois (Resultado)
            </label>
            <Input
              value={impactAfter}
              onChange={(e) => setImpactAfter(e.target.value)}
              placeholder="Ex: 0% de perda, 0 horas/mês perdidas"
            />
          </div>

          {/* Lições Aprendidas */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              Lições Aprendidas
            </label>
            <Textarea
              value={learnings}
              onChange={(e) => setLearnings(e.target.value)}
              placeholder="O que aprendemos com essa experiência..."
              className="min-h-20"
            />
          </div>

          {/* Status Final */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              Status Final
            </label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resolvido">Resolvido</SelectItem>
                <SelectItem value="em_progresso">Em Progresso</SelectItem>
                <SelectItem value="escalado">Escalado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Data da Evolução */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              Data
            </label>
            <Input
              type="date"
              value={evolutionDate}
              onChange={(e) => setEvolutionDate(e.target.value)}
            />
          </div>

          {/* Botões */}
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? "Salvando..." : "Registrar Evolução"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}