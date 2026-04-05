import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Zap, AlertTriangle, CheckCircle2, Clock,
  Users, BarChart2, RefreshCw
} from "lucide-react";
import { differenceInDays } from "date-fns";

const STATUS_CONFIG = {
  pending:     { label: "Pendente",      color: "bg-gray-100 text-gray-600",   dot: "bg-gray-400" },
  in_progress: { label: "Em andamento",  color: "bg-blue-100 text-blue-700",   dot: "bg-blue-500" },
  completed:   { label: "Concluído",     color: "bg-green-100 text-green-700", dot: "bg-green-500" },
  overdue:     { label: "Atrasado",      color: "bg-red-100 text-red-700",     dot: "bg-red-500" },
};

function MetricCard({ icon: Icon, label, value, sub, color = "text-gray-900", bg = "bg-white" }) {
  return (
    <Card className={`${bg} shadow-sm`}>
      <CardContent className="p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function SprintRow({ sprint, workshop, onSprintClick }) {
  const daysRemaining = sprint.end_date
    ? differenceInDays(new Date(sprint.end_date), new Date())
    : null;

  const statusCfg = STATUS_CONFIG[sprint.status] || STATUS_CONFIG.pending;

  return (
    <div
      onClick={() => onSprintClick(sprint)}
      className="flex items-center gap-3 py-3 border-b last:border-0 hover:bg-blue-50 px-4 transition-colors cursor-pointer"
    >
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusCfg.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{sprint.title}</p>
        <p className="text-xs text-gray-500 truncate">{workshop?.name || sprint.workshop_id}</p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="hidden sm:flex flex-col items-end">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 w-8 text-right">{sprint.progress_percentage || 0}%</span>
            <Progress value={sprint.progress_percentage || 0} className="w-20 h-1.5" />
          </div>
          {daysRemaining !== null && (
            <span className={`text-xs mt-0.5 ${daysRemaining < 0 ? 'text-red-500 font-semibold' : daysRemaining <= 7 ? 'text-orange-500' : 'text-gray-400'}`}>
              {daysRemaining < 0 ? `${Math.abs(daysRemaining)}d atrasado` : `${daysRemaining}d restantes`}
            </span>
          )}
        </div>
        <Badge className={`text-xs ${statusCfg.color}`}>{statusCfg.label}</Badge>
      </div>
    </div>
  );
}

export default function DashboardOperacionalTab({ user }) {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: sprints = [], isLoading, refetch } = useQuery({
    queryKey: ['dashboard-sprints'],
    queryFn: () => base44.entities.ConsultoriaSprint.filter({}),
    staleTime: 2 * 60 * 1000,
  });

  const { data: workshops = [] } = useQuery({
    queryKey: ['dashboard-workshops'],
    queryFn: () => base44.entities.Workshop.list('-created_date', 500),
    staleTime: 5 * 60 * 1000,
  });

  const workshopMap = Object.fromEntries(workshops.map(w => [w.id, w]));

  const handleSprintClick = (sprint) => {
    navigate(`/ControleAceleracao?tab=dashboard-operacional&sprint_id=${sprint.id}`);
  };

  // Métricas
  const total = sprints.length;
  const em_andamento = sprints.filter(s => s.status === "in_progress").length;
  const atrasados = sprints.filter(s => s.status === "overdue").length;
  const concluidos = sprints.filter(s => s.status === "completed").length;
  const avgProgress = total > 0
    ? Math.round(sprints.reduce((acc, s) => acc + (s.progress_percentage || 0), 0) / total)
    : 0;

  // Filtro
  const sprintsFiltrados = filterStatus === "all"
    ? sprints
    : sprints.filter(s => s.status === filterStatus);

  // Sprints atrasados (reutiliza cálculo já feito acima)
  const sprintsAtrasados = sprints.filter(s => s.status === "overdue");

  // Top workshops por progresso
  const workshopsComSprints = workshops
    .map(w => {
      const ws = sprints.filter(s => s.workshop_id === w.id);
      if (!ws.length) return null;
      const avg = Math.round(ws.reduce((a, s) => a + (s.progress_percentage || 0), 0) / ws.length);
      return { workshop: w, sprints: ws, avgProgress: avg };
    })
    .filter(Boolean)
    .sort((a, b) => b.sprints.length - a.sprints.length)
    .slice(0, 8);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Dashboard Operacional</h2>
          <p className="text-sm text-gray-500">Visão consolidada de todos os sprints de consultoria</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard icon={Zap} label="Total de Sprints" value={total} color="text-blue-600" />
        <MetricCard icon={Clock} label="Em Andamento" value={em_andamento} color="text-blue-500" />
        <MetricCard icon={AlertTriangle} label="Atrasados" value={atrasados} color="text-red-500" />
        <MetricCard icon={CheckCircle2} label="Concluídos" value={concluidos} color="text-green-500" />
        <MetricCard icon={BarChart2} label="Progresso Médio" value={`${avgProgress}%`} color="text-purple-500" />
      </div>

      {/* Alertas de atraso */}
      {sprintsAtrasados.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {sprintsAtrasados.length} Sprint{sprintsAtrasados.length > 1 ? 's' : ''} com Atraso
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {sprintsAtrasados.map(sprint => (
              <SprintRow key={sprint.id} sprint={sprint} workshop={workshopMap[sprint.workshop_id]} onSprintClick={handleSprintClick} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de sprints filtrada */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm font-semibold text-gray-800">Todos os Sprints</CardTitle>
              <div className="flex gap-1 flex-wrap">
                {[
                  { key: "all", label: "Todos" },
                  { key: "in_progress", label: "Em andamento" },
                  { key: "overdue", label: "Atrasados" },
                  { key: "completed", label: "Concluídos" },
                  { key: "pending", label: "Pendentes" },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilterStatus(f.key)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      filterStatus === f.key
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {sprintsFiltrados.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum sprint encontrado</p>
              </div>
            ) : (
              sprintsFiltrados.map(sprint => (
                <SprintRow key={sprint.id} sprint={sprint} workshop={workshopMap[sprint.workshop_id]} onSprintClick={handleSprintClick} />
              ))
            )}
          </CardContent>
        </Card>

        {/* Clientes com sprints */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" /> Clientes Ativos
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {workshopsComSprints.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">Nenhum cliente com sprints</p>
            ) : (
              workshopsComSprints.map(({ workshop, sprints: ws, avgProgress: avg }) => (
                <div key={workshop.id} className="flex items-center gap-3 py-2.5 border-b last:border-0 px-4 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{workshop.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{ws.length} sprint{ws.length > 1 ? 's' : ''}</span>
                      {ws.some(s => s.status === 'overdue') && (
                        <span className="text-xs text-red-500 font-semibold">⚠ atrasado</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-xs font-semibold text-gray-700">{avg}%</span>
                    <Progress value={avg} className="w-16 h-1.5" />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Distribuição por missão */}
      {sprints.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-800">Distribuição por Missão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(
                sprints.reduce((acc, s) => {
                  const key = s.mission_id || "sem_missao";
                  acc[key] = (acc[key] || 0) + 1;
                  return acc;
                }, {})
              )
                .sort((a, b) => b[1] - a[1])
                .map(([missionId, count]) => (
                  <div key={missionId} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full">
                    <span className="text-xs font-medium text-gray-700">
                      {missionId === "sprint0" ? "Sprint 0 — Diagnóstico" :
                       missionId === "agenda_cheia" ? "📅 Agenda Cheia" :
                       missionId === "fechamento_imbativel" ? "🎯 Fechamento Imbatível" :
                       missionId === "caixa_forte" ? "💰 Caixa Forte" :
                       missionId === "equipe_elite" ? "👥 Equipe de Elite" :
                       missionId === "contratacao_certa" ? "🤝 Contratação Certa" :
                       missionId === "estrutura_produtiva" ? "⚙️ Estrutura Produtiva" :
                       missionId === "oficina_sistematizada" ? "📋 Oficina Sistematizada" :
                       missionId}
                    </span>
                    <Badge className="text-xs bg-gray-200 text-gray-700 px-1.5">{count}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}