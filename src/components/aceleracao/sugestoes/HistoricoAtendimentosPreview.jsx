import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ChevronDown } from "lucide-react";
import { useState } from "react";

export default function HistoricoAtendimentosPreview({ workshopId }) {
  const [expandido, setExpandido] = useState(false);

  // Busca últimos atendimentos realizados/concluídos
  const { data: atendimentos = [], isLoading } = useQuery({
    queryKey: ["historico-atendimentos", workshopId],
    queryFn: () =>
      workshopId
        ? base44.entities.ConsultoriaAtendimento.filter(
            {
              workshop_id: workshopId,
              status: ["realizado", "concluido"],
            },
            "-data_agendada",
            5
          )
        : [],
    enabled: !!workshopId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="h-8 bg-gray-100 rounded animate-pulse" />
    );
  }

  if (atendimentos.length === 0) {
    return (
      <span className="text-xs text-gray-400 italic">
        Sem histórico de atendimentos
      </span>
    );
  }

  const ultimoAtendimento = atendimentos[0];
  const diasDesdeUltimo = Math.floor(
    (new Date() - new Date(ultimoAtendimento.data_agendada)) / (1000 * 60 * 60 * 24)
  );

  const formatarDias = (dias) => {
    if (dias === 0) return "hoje";
    if (dias === 1) return "ontem";
    if (dias < 7) return `${dias}d atrás`;
    if (dias < 30) return `${Math.floor(dias / 7)}s atrás`;
    return `${Math.floor(dias / 30)}m atrás`;
  };

  return (
    <div className="space-y-1.5 border-t pt-2 mt-2">
      {/* Card resumido do último atendimento */}
      <div className="bg-gradient-to-r from-green-50 to-transparent p-2 rounded-md border border-green-100">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Calendar className="w-3.5 h-3.5 text-green-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-800">
                {ultimoAtendimento.tipo_atendimento}
              </p>
              <p className="text-[10px] text-gray-500">
                {new Date(ultimoAtendimento.data_agendada).toLocaleDateString("pt-BR")} · {formatarDias(diasDesdeUltimo)}
              </p>
            </div>
          </div>
          <Badge className="bg-green-100 text-green-700 text-[10px]">
            ✓ {ultimoAtendimento.status === "concluido" ? "Concluído" : "Realizado"}
          </Badge>
        </div>
      </div>

      {/* Expandir histórico completo */}
      {atendimentos.length > 1 && (
        <>
          <button
            onClick={() => setExpandido(!expandido)}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 w-full py-1"
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${expandido ? "rotate-180" : ""}`} />
            Ver {atendimentos.length - 1} atendimento{atendimentos.length > 2 ? "s" : ""} anterior{atendimentos.length > 2 ? "es" : ""}
          </button>

          {expandido && (
            <div className="space-y-1 bg-gray-50 p-2 rounded-md max-h-48 overflow-y-auto">
              {atendimentos.slice(1).map((at, idx) => {
                const dias = Math.floor(
                  (new Date() - new Date(at.data_agendada)) / (1000 * 60 * 60 * 24)
                );
                return (
                  <div key={idx} className="flex items-center justify-between gap-2 py-1 px-1.5 hover:bg-white rounded transition-colors">
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium text-gray-700">
                        {at.tipo_atendimento}
                      </p>
                      <p className="text-[9px] text-gray-500">
                        {new Date(at.data_agendada).toLocaleDateString("pt-BR")} · {formatarDias(dias)}
                      </p>
                    </div>
                    <span className="text-[9px] text-gray-400">
                      {at.consultor_nome?.split(" ")[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}