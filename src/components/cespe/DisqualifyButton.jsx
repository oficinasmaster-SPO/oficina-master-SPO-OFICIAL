import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { XCircle, CheckCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const BACK_TO_ANALYSIS_OPTIONS = [
  { value: "nao_avaliado", label: "🔍 Não avaliado ainda" },
  { value: "nao_contactado", label: "✅ Não contactado ainda" }
];

const DISQUALIFICATION_REASONS = [
  { value: "nao_adequado_perfil", label: "❌ Não adequado ao perfil" },
  { value: "falta_maturidade", label: "⚠️ Não tem maturidade" },
  { value: "nao_responde", label: "📵 Não responde mais" },
  { value: "entrevista_sem_resposta", label: "🤐 Entrevistou e não responde" }
];

export default function DisqualifyButton({ candidateId, currentStatus }) {
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Candidate.update(candidateId, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      if (variables.status === 'em_analise') {
        toast.success("Candidato em análise");
      } else {
        toast.success("Candidato desqualificado");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar status");
    }
  });

  const handleSetAnalise = () => {
    updateStatusMutation.mutate({ 
      status: 'em_analise',
      disqualification_reason: null,
      disqualification_date: null
    });
  };

  const handleDisqualify = (reason) => {
    updateStatusMutation.mutate({
      status: 'reprovado',
      disqualification_reason: reason,
      disqualification_date: new Date().toISOString()
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          size="sm" 
          variant="outline"
          className="border-red-200 text-red-600 hover:bg-red-50"
        >
          <XCircle className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {BACK_TO_ANALYSIS_OPTIONS.map(option => (
          <DropdownMenuItem
            key={option.value}
            onClick={handleSetAnalise}
            className="cursor-pointer text-green-700 hover:bg-green-50"
          >
            {option.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {DISQUALIFICATION_REASONS.map(reason => (
          <DropdownMenuItem
            key={reason.value}
            onClick={() => handleDisqualify(reason.value)}
            className="cursor-pointer"
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}