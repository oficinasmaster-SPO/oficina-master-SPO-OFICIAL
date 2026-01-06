import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { XCircle, CheckCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const DISQUALIFICATION_REASONS = [
  { value: "nao_adequado_perfil", label: "❌ Não adequado ao perfil" },
  { value: "falta_maturidade", label: "⚠️ Não tem maturidade" },
  { value: "nao_responde", label: "📵 Não responde mais" },
  { value: "entrevista_sem_resposta", label: "🤐 Entrevistou e não responde" }
];

export default function DisqualifyButton({ candidateId, currentStatus }) {
  const queryClient = useQueryClient();
  const isNewLead = currentStatus === 'novo_lead';

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
    updateStatusMutation.mutate({ status: 'em_analise' });
  };

  const handleDisqualify = (reason) => {
    updateStatusMutation.mutate({
      status: 'reprovado',
      disqualification_reason: reason,
      disqualification_date: new Date().toISOString()
    });
  };

  if (isNewLead) {
    return (
      <Button 
        size="sm" 
        variant="outline"
        className="border-green-200 text-green-600 hover:bg-green-50"
        onClick={handleSetAnalise}
      >
        <CheckCircle className="w-4 h-4" />
      </Button>
    );
  }

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
        {DISQUALIFICATION_REASONS.map(reason => (
          <DropdownMenuItem
            key={reason.value}
            onClick={() => handleDisqualify(reason.value)}
            className="cursor-pointer"
          >
            {reason.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}