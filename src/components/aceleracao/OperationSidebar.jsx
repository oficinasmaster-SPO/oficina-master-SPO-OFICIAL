import React, { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Clock, CheckCircle2, TrendingUp, Users } from "lucide-react";

function useConsultorStats(consultorId) {
  const today = new Date().toISOString().split("T")[0];

  const { data: pendentes = [] } = useQuery({
    queryKey: ["sidebar-pendentes", consultorId],
    queryFn: async () => {
      if (!consultorId) return [];
      return base44.entities.FollowUpReminder.filter(
        { is_completed: false, consultor_id: consultorId },
        "-reminder_date",
        500
      );
    },
    enabled: !!consultorId,
    staleTime: 3 * 60 * 1000,
  });

  const { data: concluidos = [] } = useQuery({
    queryKey: ["sidebar-concluidos", consultorId],
    queryFn: async () => {
      if (!consultorId) return [];
      return base44.entities.FollowUpConcluido.filter(
        { consultor_id: consultorId },
        "-completedAt",
        200
      );
    },
    enabled: !!consultorId,
    staleTime: 3 * 60 * 1000,
  });

  const atrasados = pendentes.filter(r => r.reminder_date < today);
  const hoje = pendentes.filter(r => r.reminder_date === today);
  const futuros = pendentes.filter(r => r.reminder_date > today);
  const guardaChuva = pendentes.filter(r => r.origin_type === "guarda_chuva");

  // Taxa de realização: concluídos / (concluídos + pendentes)
  const total = pendentes.length + concluidos.length;
  const taxa = total > 0 ? Math.round((concluidos.length / total) * 100) : null;

  // Workshops sem contato há mais de 7 dias (atrasados por mais de 7d)
  const semContatoRecente = new Set(
    atrasados
      .filter(r => {
        const dias = Math.floor(
          (new Date(today + "T00:00:00") - new Date(r.reminder_date + "T00:00:00")) /
            (1000 * 60 * 60 * 24)
        );
        return dias > 7;
      })
      .map(r => r.workshop_id)
  ).size;

  return { pendentes: pendentes.length, atrasados: atrasados.length, hoje: hoje.length, futuros: futuros.length, guardaChuva: guardaChuva.length, concluidos: concluidos.length, taxa, semContatoRecente };
}

const StatRow = ({ label, value, color = "text-gray-700" }) => (
  <div className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
    <span className="text-gray-500">{label}</span>
    <span className={`font-semibold ${color}`}>{value}</span>
  </div>
);

const OperationSidebar = memo(({ consultorId }) => {
  const stats = useConsultorStats(consultorId);

  return (
    <aside className="space-y-3">
      {/* Visão geral do consultor */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-gray-700">Minha Operação</h3>
          </div>

          {/* Taxa de realização */}
          {stats.taxa !== null && (
            <div className="rounded-lg bg-gradient-to-br from-indigo-50 to-blue-50 p-3 text-center border border-indigo-100">
              <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wide">
                Taxa de Realização
              </p>
              <p className={`text-2xl font-extrabold mt-0.5 ${
                stats.taxa >= 70 ? "text-emerald-600" : stats.taxa >= 50 ? "text-amber-600" : "text-red-600"
              }`}>
                {stats.taxa}%
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {stats.concluidos} concluídos · {stats.pendentes} pendentes
              </p>
            </div>
          )}

          {/* Métricas detalhadas */}
          <div className="space-y-0">
            <StatRow
              label="Vencidos"
              value={stats.atrasados}
              color={stats.atrasados > 0 ? "text-red-600" : "text-gray-700"}
            />
            <StatRow
              label="Para hoje"
              value={stats.hoje}
              color={stats.hoje > 0 ? "text-amber-600" : "text-gray-700"}
            />
            <StatRow label="Futuros" value={stats.futuros} />
            {stats.guardaChuva > 0 && (
              <StatRow
                label="Guarda-chuva"
                value={stats.guardaChuva}
                color="text-blue-600"
              />
            )}
            {stats.semContatoRecente > 0 && (
              <StatRow
                label="Sem contato +7d"
                value={stats.semContatoRecente}
                color="text-orange-600"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Prioridades do dia */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-gray-700">Foco do Dia</h3>
          </div>

          {stats.atrasados === 0 && stats.hoje === 0 ? (
            <div className="py-3 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-300 mx-auto mb-1" />
              <p className="text-xs text-gray-400">Nenhuma pendência urgente</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {stats.atrasados > 0 && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-100">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-red-700">{stats.atrasados} vencidos</p>
                    <p className="text-[10px] text-red-400">Prioridade máxima</p>
                  </div>
                </div>
              )}
              {stats.hoje > 0 && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-100">
                  <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-amber-700">{stats.hoje} para hoje</p>
                    <p className="text-[10px] text-amber-400">Contate ainda hoje</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dica contextual */}
      <Card className="border-blue-100 bg-blue-50/50 shadow-sm">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Users className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-600 leading-relaxed">
              Selecione um cliente na lista para ver o contexto detalhado aqui.
            </p>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
});

OperationSidebar.displayName = "OperationSidebar";
export default OperationSidebar;
