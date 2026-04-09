import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, CalendarCheck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import AgendaVisual from "./AgendaVisual";

export default function AgendaVisualTab({ state }) {
  const { user, workshops, atendimentosPeriodo } = state;
  const queryClient = useQueryClient();

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

  return (
    <div className="space-y-6">
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
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Atualizar
        </button>
      </div>
      <AgendaVisual
        atendimentos={atendimentosPeriodo}
        workshops={workshops}
        user={user}
      />
    </div>
  );
}