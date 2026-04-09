import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, CalendarCheck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import AgendaVisual from "./AgendaVisual";

export default function AgendaVisualTab({ user, filtros }) {
  const queryClient = useQueryClient();
  const consultorFiltrado = filtros?.consultorId && filtros.consultorId !== "todos" ? filtros.consultorId : null;
  const dataInicio = filtros?.dataInicio ? new Date(filtros.dataInicio) : null;
  const dataFim = filtros?.dataFim ? new Date(filtros.dataFim) : null;

  const { data: workshops } = useQuery({
    queryKey: ['workshops-ativos'],
    queryFn: async () => {
      const all = await base44.entities.Workshop.list(null, 5000);
      return all.filter(w => w.planoAtual && w.planoAtual !== 'FREE');
    },
    staleTime: 5 * 60 * 1000
  });

  const { data: syncState } = useQuery({
    queryKey: ['sync-state-calendar'],
    queryFn: () => base44.entities.SyncState.filter({ key: 'googlecalendar_primary' }),
    staleTime: 30 * 1000,
  });
  const lastSync = syncState?.[0]?.last_synced_at;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['atendimentos-acelerador'] });
    queryClient.invalidateQueries({ queryKey: ['sync-state-calendar'] });
  };

  const { data: atendimentos, isFetching } = useQuery({
    queryKey: ['atendimentos-acelerador', user?.id, consultorFiltrado],
    queryFn: async () => {
      let query = {};
      
      if (consultorFiltrado) {
        query.consultor_id = consultorFiltrado;
      } else if (user?.role !== 'admin') {
        query.consultor_id = user.id;
      }
      
      return await base44.entities.ConsultoriaAtendimento.filter(query, null, 5000);
    },
    enabled: !!user?.id
  });

  return (
    <div className="space-y-6">
      {/* Barra de status do sync */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <CalendarCheck className="w-3.5 h-3.5 text-green-500" />
          <span>
            {lastSync
              ? `Sincronizado com Google Calendar em ${format(new Date(lastSync), "dd/MM 'às' HH:mm", { locale: ptBR })}`
              : 'Aguardando primeira sincronização com Google Calendar'}
          </span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isFetching}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>
      <AgendaVisual
          atendimentos={atendimentos || []}
          workshops={workshops || []}
          user={user}
        />
    </div>
  );
}