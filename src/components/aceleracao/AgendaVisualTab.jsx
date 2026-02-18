import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import AgendaVisual from "./AgendaVisual";

export default function AgendaVisualTab({ user, filtros }) {
  const consultorFiltrado = filtros?.consultorId && filtros.consultorId !== "todos" ? filtros.consultorId : null;
  const dataInicio = filtros?.dataInicio ? new Date(filtros.dataInicio) : null;
  const dataFim = filtros?.dataFim ? new Date(filtros.dataFim) : null;

  const { data: workshops } = useQuery({
    queryKey: ['workshops-ativos'],
    queryFn: async () => {
      const all = await base44.entities.Workshop.list();
      return all.filter(w => w.planoAtual && w.planoAtual !== 'FREE');
    }
  });

  const { data: atendimentos } = useQuery({
    queryKey: ['atendimentos-acelerador', user?.id, consultorFiltrado, dataInicio, dataFim],
    queryFn: async () => {
      let query = {};
      
      if (consultorFiltrado) {
        query.consultor_id = consultorFiltrado;
      } else if (user?.id) {
        query.consultor_id = user.id;
      }
      
      const all = await base44.entities.ConsultoriaAtendimento.filter(query);
      
      if (dataInicio && dataFim) {
        return all.filter(a => {
          const dataAtendimento = new Date(a.data_agendada);
          return dataAtendimento >= dataInicio && dataAtendimento <= dataFim;
        });
      }
      
      return all;
    },
    enabled: !!user?.id
  });

  return (
    <div className="space-y-6">
       <AgendaVisual 
          atendimentos={atendimentos || []} 
          workshops={workshops || []}
        />
    </div>
  );
}