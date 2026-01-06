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
  const [open, setOpen] = React.useState(false);

  const updateStatusMutation = useMutation({
    mutationFn: async (data) => {
      console.log('🔄 Atualizando candidato:', candidateId, data);
      const result = await base44.entities.Candidate.update(candidateId, data);
      console.log('✅ Candidato atualizado:', result);
      return result;
    },
    onSuccess: async (updatedCandidate, variables) => {
      console.log('🎉 Sucesso na atualização:', updatedCandidate);
      
      // Força invalidação e refetch
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      
      // Aguarda refetch
      await new Promise(resolve => setTimeout(resolve, 300));
      
      await queryClient.refetchQueries({ 
        queryKey: ['candidates']
      });
      
      setOpen(false);
      
      if (variables.status === 'em_analise') {
        toast.success("✅ Candidato voltou para análise");
      } else {
        toast.success("❌ Candidato desqualificado");
      }
    },
    onError: (error) => {
      console.error("❌ Erro ao atualizar candidato:", error);
      toast.error("Erro: " + (error.message || "Falha ao atualizar status"));
      setOpen(false);
    }
  });

  const handleSetAnalise = (e) => {
    console.log('🟢 Voltando candidato para análise');
    e?.preventDefault();
    e?.stopPropagation();
    
    updateStatusMutation.mutate({ 
      status: 'em_analise',
      disqualification_reason: null,
      disqualification_date: null
    });
  };

  const handleDisqualify = (reason, e) => {
    console.log('🔴 Desqualificando candidato com motivo:', reason);
    e?.preventDefault();
    e?.stopPropagation();
    
    updateStatusMutation.mutate({
      status: 'reprovado',
      disqualification_reason: reason,
      disqualification_date: new Date().toISOString()
    });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          size="sm" 
          variant="outline"
          className="border-red-200 text-red-600 hover:bg-red-50"
          disabled={updateStatusMutation.isPending}
        >
          <XCircle className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {BACK_TO_ANALYSIS_OPTIONS.map(option => (
          <DropdownMenuItem
            key={option.value}
            onSelect={(e) => handleSetAnalise(e)}
            disabled={updateStatusMutation.isPending}
            className="cursor-pointer text-green-700 hover:bg-green-50"
          >
            {option.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {DISQUALIFICATION_REASONS.map(reason => (
          <DropdownMenuItem
            key={reason.value}
            onSelect={(e) => handleDisqualify(reason.value, e)}
            disabled={updateStatusMutation.isPending}
            className="cursor-pointer"
          >
            {reason.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}