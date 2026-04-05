import React, { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import {
  Settings2, Map, Zap, BookOpen, ChevronRight, ExternalLink,
  CheckCircle2, Circle, Clock, Target, Users, Lightbulb, 
  ListChecks, Route, PlayCircle, Plus, X, Star, Lock,
  ChevronDown, ChevronUp, RotateCcw, TrendingUp, ClipboardList,
  PlaySquare, BarChart2, MessageSquare, AlertTriangle
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import SprintPhaseDetailModal from "./SprintPhaseDetailModal";

// Camada 1 - Interno/Estratégico
function CamadaEstrategica({ workshopId }) {
  const metodo = [
    { fase: "1. Diagnóstico", descricao: "Avaliar maturidade, processos e gaps do negócio", icon: "🔍" },
    { fase: "2. Planejamento", descricao: "Definir prioridades, metas e cronograma de implementação", icon: "📋" },
    { fase: "3. Implementação", descricao: "Executar processos com acompanhamento semanal (sprints)", icon: "⚙️" },
    { fase: "4. Consolidação", descricao: "Garantir a sustentabilidade das melhorias implantadas", icon: "🏆" },
    { fase: "5. Expansão", descricao: "Escalar processos e estrutura para crescimento", icon: "🚀" },
  ];

  const pilares = [
    { nome: "Vendas & Comercial", cor: "bg-blue-50 border-blue-200 text-blue-700" },
    { nome: "Processos Operacionais", cor: "bg-green-50 border-green-200 text-green-700" },
    { nome: "Gestão Financeira", cor: "bg-yellow-50 border-yellow-200 text-yellow-700" },
    { nome: "Pessoas & Cultura", cor: "bg-purple-50 border-purple-200 text-purple-700" },
    { nome: "Marketing & Captação", cor: "bg-pink-50 border-pink-200 text-pink-700" },
    { nome: "Estratégia & Escala", cor: "bg-orange-50 border-orange-200 text-orange-700" },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-5 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Settings2 className="w-5 h-5 text-yellow-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-yellow-400">Camada 1 — Interno</span>
        </div>
        <h3 className="text-lg font-bold">Plano Estratégico de Consultoria</h3>
        <p className="text-sm text-slate-300 mt-1">Metodologia interna de condução do projeto. Visível apenas para o consultor.</p>
      </div>

      <div>
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Route className="w-4 h-4 text-slate-600" />
          Método de Aceleração
        </h4>
        <div className="space-y-2">
          {metodo.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50">
              <span className="text-xl">{item.icon}</span>
              <div>
                <p className="font-medium text-sm text-gray-900">{item.fase}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.descricao}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-slate-600" />
          Pilares do Projeto
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {pilares.map((pilar, idx) => (
            <div key={idx} className={`border rounded-lg p-3 text-sm font-medium ${pilar.cor}`}>
              {pilar.nome}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Missões disponíveis
const MISSOES = [
  { id: "agenda_cheia", nome: "Missão Agenda Cheia", emoji: "📅", descricao: "Para clientes com baixo volume de clientes", cor: "bg-blue-50 border-blue-300 text-blue-800" },
  { id: "fechamento_imbativel", nome: "Missão Fechamento Imbatível", emoji: "🎯", descricao: "Para clientes que não convertem vendas", cor: "bg-green-50 border-green-300 text-green-800" },
  { id: "caixa_forte", nome: "Missão Caixa Forte", emoji: "💰", descricao: "Para clientes sem lucro ou com caixa negativo", cor: "bg-yellow-50 border-yellow-300 text-yellow-800" },
  { id: "equipe_elite", nome: "Missão Equipe de Elite", emoji: "👥", descricao: "Para clientes com problemas de equipe", cor: "bg-purple-50 border-purple-300 text-purple-800" },
  { id: "contratacao_certa", nome: "Missão Contratação Certa", emoji: "🤝", descricao: "Para clientes que precisam contratar bem", cor: "bg-pink-50 border-pink-300 text-pink-800" },
  { id: "estrutura_produtiva", nome: "Missão Estrutura Produtiva", emoji: "⚙️", descricao: "Para clientes com gargalos operacionais", cor: "bg-orange-50 border-orange-300 text-orange-800" },
  { id: "oficina_sistematizada", nome: "Missão Oficina Sistematizada", emoji: "📋", descricao: "Para clientes que precisam de processos e sistemas", cor: "bg-indigo-50 border-indigo-300 text-indigo-800" },
];

// Camada 2 - Trilha do Cliente
function CamadaTrilhaCliente({ workshopId, missoesSelecionadas, setMissoesSelecionadas }) {
  const [mostrarSeletor, setMostrarSeletor] = useState(false);

  const toggleMissao = (missaoId) => {
    setMissoesSelecionadas(prev =>
      prev.includes(missaoId)
        ? prev.filter(id => id !== missaoId)
        : [...prev, missaoId]
    );
  };

  const missoesSelecionadasData = MISSOES.filter(m => missoesSelecionadas.includes(m.id));

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 rounded-xl p-5 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Map className="w-5 h-5 text-blue-200" />
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-200">Camada 2 — Trilha do Cliente</span>
        </div>
        <h3 className="text-lg font-bold">Jornada de Implementação Personalizada</h3>
        <p className="text-sm text-blue-100 mt-1">Trilha montada após diagnóstico. O cliente visualiza no Cronograma de Consultoria.</p>
      </div>

      {/* Link ao cronograma */}
      <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <Map className="w-6 h-6 text-blue-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-blue-900 text-sm">Cronograma de Consultoria</p>
          <p className="text-xs text-blue-700">O cliente acompanha sua trilha de implementação nesta página.</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="border-blue-300 text-blue-700 hover:bg-blue-100 flex-shrink-0"
          onClick={() => window.open(`/CronogramaConsultoria?workshop_id=${workshopId}`, '_blank')}
        >
          <ExternalLink className="w-3 h-3 mr-1" />
          Abrir
        </Button>
      </div>

      {/* Semana 1 - Fixo */}
      <div>
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-blue-600" />
          Trilha de Implementação
        </h4>

        <div className="space-y-3">
          {/* Semana 1 - sempre fixa */}
          <div className="border-2 border-gray-300 rounded-xl p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gray-700 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">Semana 1 — Padrão</p>
                  <p className="text-xs text-gray-500">Todas as trilhas começam aqui</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Lock className="w-3 h-3" />
                Fixo
              </div>
            </div>
            <div className="pl-9 space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <span className="text-base">🔍</span> Diagnóstico Inicial
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <span className="text-base">🗂️</span> Organização e Alinhamento
              </div>
            </div>
          </div>

          {/* Semanas personalizadas selecionadas */}
          {missoesSelecionadasData.map((missao, idx) => (
            <div key={missao.id} className={`border-2 rounded-xl p-4 ${missao.cor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-white border-2 border-current flex items-center justify-center text-xs font-bold flex-shrink-0">{idx + 2}</div>
                  <div>
                    <p className="font-semibold text-sm">{missao.emoji} {missao.nome}</p>
                    <p className="text-xs opacity-70">{missao.descricao}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleMissao(missao.id)}
                  className="p-1 rounded-full hover:bg-white/50 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Botão adicionar missão */}
          <button
            onClick={() => setMostrarSeletor(!mostrarSeletor)}
            className="w-full border-2 border-dashed border-blue-300 rounded-xl p-4 text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            {mostrarSeletor ? 'Fechar seletor' : 'Adicionar Missão à Trilha'}
          </button>
        </div>
      </div>

      {/* Seletor de missões */}
      {mostrarSeletor && (
        <div className="border rounded-xl p-4 bg-white shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-amber-500" />
            <p className="font-semibold text-sm text-gray-900">Selecionar Missões</p>
            <p className="text-xs text-gray-500 ml-auto">Personalize conforme o diagnóstico do cliente</p>
          </div>
          <div className="space-y-2">
            {MISSOES.map((missao) => {
              const selecionada = missoesSelecionadas.includes(missao.id);
              return (
                <button
                  key={missao.id}
                  onClick={() => toggleMissao(missao.id)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all flex items-center justify-between ${
                    selecionada
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{missao.emoji}</span>
                    <div>
                      <p className="font-medium text-sm text-gray-900">{missao.nome}</p>
                      <p className="text-xs text-gray-500">{missao.descricao}</p>
                    </div>
                  </div>
                  {selecionada && <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Fases de um Sprint
const FASES_SPRINT = [
  {
    id: "planning",
    nome_key: "Planning",
    nome: "Sprint Planning",
    subtitulo: "Planejamento",
    icon: ClipboardList,
    cor: "text-blue-600",
    bg: "bg-blue-50",
    descricao: "Definir o que será feito nas próximas semanas",
    itens: [
      "Revisar diagnóstico e prioridades",
      "Definir objetivo claro do sprint",
      "Listar entregáveis mensuráveis",
      "Distribuir tarefas e prazos",
    ]
  },
  {
    id: "execucao",
    nome_key: "Execution",
    nome: "Execução",
    subtitulo: "Implementação",
    icon: PlaySquare,
    cor: "text-green-600",
    bg: "bg-green-50",
    descricao: "Assistir treinamentos, implementar ferramentas, executar tarefas",
    itens: [
      "Assistir treinamentos da missão",
      "Implementar ferramentas e processos",
      "Executar tarefas priorizadas",
      "Registrar progresso na plataforma",
    ]
  },
  {
    id: "checkpoint",
    nome_key: "Monitoring",
    nome: "Checkpoint Semanal",
    subtitulo: "Acompanhamento",
    icon: BarChart2,
    cor: "text-purple-600",
    bg: "bg-purple-50",
    descricao: "Reunião de alinhamento e verificação do progresso",
    itens: [
      "Check-in: o que foi feito",
      "Medir resultados parciais",
      "Identificar bloqueios",
      "Ajustar tarefas se necessário",
    ]
  },
  {
    id: "review",
    nome_key: "Review",
    nome: "Sprint Review",
    subtitulo: "Revisão",
    icon: TrendingUp,
    cor: "text-orange-600",
    bg: "bg-orange-50",
    descricao: "Apresentação dos resultados alcançados no sprint",
    itens: [
      "Apresentar entregáveis concluídos",
      "Medir KPIs vs meta do sprint",
      "Validar com o cliente os resultados",
      "Documentar conquistas",
    ]
  },
  {
    id: "retrospectiva",
    nome_key: "Retrospective",
    nome: "Sprint Retrospective",
    subtitulo: "Melhoria",
    icon: MessageSquare,
    cor: "text-red-600",
    bg: "bg-red-50",
    descricao: "Reflexão sobre o processo para melhorar o próximo sprint",
    itens: [
      "O que funcionou bem?",
      "O que precisa melhorar?",
      "Quais ajustes fazer no processo?",
      "Planejar próximo sprint",
    ]
  },
];

const STATUS_SPRINT_BADGE = {
  pending: { label: "Pendente", color: "bg-gray-100 text-gray-600" },
  in_progress: { label: "Em andamento", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Concluído", color: "bg-green-100 text-green-700" },
  overdue: { label: "Atrasado", color: "bg-red-100 text-red-700" },
};

const PHASE_STATUS_ICON = {
  not_started: <Circle className="w-4 h-4 text-gray-300" />,
  in_progress: <Clock className="w-4 h-4 text-blue-500" />,
  completed: <CheckCircle2 className="w-4 h-4 text-green-500" />,
};

function SprintCard({ numero, titulo, emoji, descricao, cor, isFixed, sprint, onSprintUpdated }) {
  const [expandido, setExpandido] = useState(false);
  const [faseAtiva, setFaseAtiva] = useState(null);
  const [modalPhaseIndex, setModalPhaseIndex] = useState(null);

  // Usar dados do sprint salvo se disponível, senão mostrar visualização estática
  const phases = sprint?.phases || [];
  const progress = sprint?.progress_percentage || 0;
  const sprintStatus = sprint?.status || "pending";

  return (
    <div className={`border-2 rounded-xl overflow-hidden ${cor}`}>
      {/* Header do Sprint */}
      <button
        onClick={() => setExpandido(!expandido)}
        className="w-full p-4 flex items-center justify-between hover:opacity-90 transition-opacity text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center text-sm font-bold border-2 border-current">
            {numero}
          </div>
          <div>
            <p className="font-semibold text-sm">{emoji} {titulo}</p>
            <p className="text-xs opacity-70">{descricao}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sprint && (
            <Badge className={`text-xs ${STATUS_SPRINT_BADGE[sprintStatus]?.color}`}>
              {STATUS_SPRINT_BADGE[sprintStatus]?.label}
            </Badge>
          )}
          {isFixed && (
            <div className="flex items-center gap-1 text-xs opacity-60">
              <Lock className="w-3 h-3" />
              Padrão
            </div>
          )}
          {expandido
            ? <ChevronUp className="w-4 h-4 opacity-70" />
            : <ChevronDown className="w-4 h-4 opacity-70" />}
        </div>
      </button>

      {/* Fases do Sprint */}
      {expandido && (
        <div className="border-t border-current/20 bg-white p-4 space-y-3">

          {/* Barra de progresso se tiver sprint salvo */}
          {sprint && (
            <div>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Progresso geral</span>
                <span className="font-semibold">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full">
                <div
                  className="h-2 bg-green-500 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Ciclo visual */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {FASES_SPRINT.map((fase, idx) => {
              const Icon = fase.icon;
              const savedPhase = phases.find(p => p.name === fase.nome_key);
              const phaseStatus = savedPhase?.status || "not_started";
              return (
                <React.Fragment key={fase.id}>
                  <button
                    onClick={() => {
                      if (sprint) {
                        // Se tiver sprint salvo, abrir modal de edição
                        const phaseIdx = sprint.phases?.findIndex(p => p.name === fase.nome_key);
                        if (phaseIdx !== undefined && phaseIdx >= 0) setModalPhaseIndex(phaseIdx);
                      } else {
                        setFaseAtiva(faseAtiva === fase.id ? null : fase.id);
                      }
                    }}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg min-w-[60px] transition-all border ${
                      faseAtiva === fase.id
                        ? `${fase.bg} border-current shadow-sm`
                        : 'border-transparent hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full ${fase.bg} flex items-center justify-center relative`}>
                      <Icon className={`w-4 h-4 ${fase.cor}`} />
                      {sprint && (
                        <span className="absolute -top-1 -right-1">
                          {PHASE_STATUS_ICON[phaseStatus]}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-center leading-tight text-gray-600 font-medium">{fase.subtitulo}</span>
                    {sprint && savedPhase?.due_date && (
                      <span className="text-xs text-gray-400">{new Date(savedPhase.due_date).toLocaleDateString('pt-BR')}</span>
                    )}
                  </button>
                  {idx < FASES_SPRINT.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Detalhe da fase estática (sem sprint salvo) */}
          {!sprint && faseAtiva && (() => {
            const fase = FASES_SPRINT.find(f => f.id === faseAtiva);
            const Icon = fase.icon;
            return (
              <div className={`rounded-xl p-4 ${fase.bg} border border-current/20`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${fase.cor}`} />
                  <p className={`font-semibold text-sm ${fase.cor}`}>{fase.nome}</p>
                </div>
                <p className="text-xs text-gray-600 mb-3">{fase.descricao}</p>
                <div className="space-y-1.5">
                  {fase.itens.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <div className={`w-5 h-5 rounded-full bg-white border flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${fase.cor}`}>
                        {idx + 1}
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Indicador do ciclo (sem sprint salvo) */}
          {!sprint && !faseAtiva && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <RotateCcw className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <p className="text-xs text-gray-500">Clique em uma fase acima para ver os detalhes do ciclo <strong>Planejar → Executar → Medir → Ajustar</strong></p>
            </div>
          )}

          {/* Hint para sprint salvo */}
          {sprint && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <AlertTriangle className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <p className="text-xs text-blue-700">Clique em cada fase para registrar progresso, tarefas e indicadores.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal de edição de fase */}
      {modalPhaseIndex !== null && sprint && (
        <SprintPhaseDetailModal
          sprint={sprint}
          phaseIndex={modalPhaseIndex}
          onClose={() => setModalPhaseIndex(null)}
          onSaved={onSprintUpdated}
        />
      )}
    </div>
  );
}

// Camada 3 - Sprints
function CamadaSprints({ workshopId, missoesSelecionadas }) {
  const missoesSelecionadasData = MISSOES.filter(m => missoesSelecionadas.includes(m.id));
  const [sprints, setSprints] = useState([]);
  const [loadingCreate, setLoadingCreate] = useState(null);

  const loadSprints = useCallback(async () => {
    if (!workshopId) return;
    const data = await base44.entities.ConsultoriaSprint.filter({ workshop_id: workshopId });
    setSprints(data || []);
  }, [workshopId]);

  useEffect(() => {
    loadSprints();
  }, [workshopId, missoesSelecionadas, loadSprints]);



  const getSprintForMission = (missionId, number) =>
    sprints.find(s => s.mission_id === missionId && s.sprint_number === number);

  const initializeSprint = async (mission, numero) => {
    setLoadingCreate(mission.id);
    try {
      const defaultPhases = ["Planning", "Execution", "Monitoring", "Review", "Retrospective"].map(name => ({
        name,
        status: "not_started",
        notes: "",
        metrics: [],
        tasks: [],
      }));
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 30);
      await base44.entities.ConsultoriaSprint.create({
        workshop_id: workshopId,
        mission_id: mission.id,
        sprint_number: numero,
        title: mission.id === "sprint0" ? "Sprint 0 — Diagnóstico & Alinhamento" : `Sprint ${numero} — ${mission.nome}`,
        objective: mission.descricao,
        start_date: today.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        status: "in_progress",
        progress_percentage: 0,
        phases: defaultPhases,
        last_activity_date: new Date().toISOString(),
      });
      await loadSprints();
    } finally {
      setLoadingCreate(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-700 to-emerald-600 rounded-xl p-5 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-5 h-5 text-green-200" />
          <span className="text-xs font-semibold uppercase tracking-wider text-green-200">Camada 3 — Sprints</span>
        </div>
        <h3 className="text-lg font-bold">Execução por Sprint</h3>
        <p className="text-sm text-green-100 mt-1">Cada missão vira um sprint com ciclo completo: Planejar → Executar → Medir → Ajustar.</p>
      </div>

      {/* Ciclo visual explicativo */}
      <div className="grid grid-cols-5 gap-1 text-center">
        {[{ emoji: "📋", label: "Planejar" }, { emoji: "⚙️", label: "Executar" }, { emoji: "📊", label: "Medir" }, { emoji: "🔄", label: "Ajustar" }, { emoji: "🚀", label: "Próximo" }].map((item, idx) => (
          <div key={idx} className="flex flex-col items-center gap-1">
            <div className="w-9 h-9 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center text-base">{item.emoji}</div>
            <span className="text-xs text-gray-500 font-medium">{item.label}</span>
          </div>
        ))}
      </div>

      {missoesSelecionadasData.length === 0 && (
        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
          <Zap className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium">Nenhuma missão selecionada</p>
          <p className="text-xs mt-1">Vá à aba <strong>Trilha</strong> e adicione missões para gerar os sprints.</p>
        </div>
      )}

      <div className="space-y-3">
        {/* Sprint 0 - sempre fixo */}
        {(() => {
          const sprint0 = getSprintForMission("sprint0", 0);
          return (
            <div className="space-y-2">
              <SprintCard
                numero={0}
                titulo="Sprint 0 — Diagnóstico & Alinhamento"
                emoji="🔍"
                descricao="Sprint inicial fixo para todos os clientes"
                cor="border-gray-400 bg-gray-50 text-gray-800"
                isFixed={true}
                sprint={sprint0}
                onSprintUpdated={loadSprints}
              />
              {!sprint0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                  disabled={loadingCreate === "sprint0"}
                  onClick={() => initializeSprint({ id: "sprint0", nome: "Sprint 0", descricao: "Diagnóstico e alinhamento inicial" }, 0)}
                >
                  {loadingCreate === "sprint0" ? "Iniciando..." : "▶ Iniciar Sprint 0"}
                </Button>
              )}
            </div>
          );
        })()}

        {/* Sprints gerados pelas missões */}
        {missoesSelecionadasData.map((missao, idx) => {
          const numero = idx + 1;
          const sprint = getSprintForMission(missao.id, numero);
          return (
            <div key={missao.id} className="space-y-2">
              <SprintCard
                numero={numero}
                titulo={`Sprint ${numero} — ${missao.nome}`}
                emoji={missao.emoji}
                descricao={missao.descricao}
                cor={`${missao.cor}`}
                isFixed={false}
                sprint={sprint}
                onSprintUpdated={loadSprints}
              />
              {!sprint && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                  disabled={loadingCreate === missao.id}
                  onClick={() => initializeSprint(missao, numero)}
                >
                  {loadingCreate === missao.id ? "Iniciando..." : `▶ Iniciar Sprint ${numero}`}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Camada 4 - Trilha do Consultor
function CamadaConsultor({ workshopId }) {
  const guias = [
    {
      titulo: "Como Conduzir o Diagnóstico Inicial",
      descricao: "Passo a passo para levantar informações, identificar dores e priorizar ações.",
      passos: ["Apresente-se e contextualize o programa", "Aplique o checklist de diagnóstico", "Escute ativamente as dores do proprietário", "Priorize os 3 maiores gargalos"],
      cor: "border-l-4 border-l-purple-500 bg-purple-50",
      badge: "Onboarding"
    },
    {
      titulo: "Como Conduzir Atendimentos Semanais",
      descricao: "Estrutura padrão para reuniões de acompanhamento de 60-90 minutos.",
      passos: ["Check-in: resultado da semana anterior", "Revisão das metas e KPIs", "Resolução de bloqueios", "Definição de tarefas para próxima semana", "Registro na plataforma"],
      cor: "border-l-4 border-l-blue-500 bg-blue-50",
      badge: "Reunião Semanal"
    },
    {
      titulo: "Como Fechar um Ciclo de Sprint",
      descricao: "Consolidar aprendizados e planejar o próximo ciclo com o cliente.",
      passos: ["Revise todas as tarefas do sprint", "Calcule os resultados alcançados", "Celebre as conquistas com o cliente", "Apresente o plano do próximo ciclo"],
      cor: "border-l-4 border-l-green-500 bg-green-50",
      badge: "Fechamento"
    },
    {
      titulo: "Como Escalar o Projeto",
      descricao: "Quando e como avançar para etapas de crescimento e autonomia.",
      passos: ["Verifique consolidação dos processos base", "Avalie prontidão da equipe", "Introduza ferramentas de escala", "Reduza dependência gradualmente"],
      cor: "border-l-4 border-l-orange-500 bg-orange-50",
      badge: "Escala"
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-700 to-violet-600 rounded-xl p-5 text-white">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-purple-200" />
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-200">Camada 4 — Guia do Consultor</span>
        </div>
        <h3 className="text-lg font-bold">Como Conduzir Este Projeto</h3>
        <p className="text-sm text-purple-100 mt-1">Trilha de orientação interna para o consultor responsável.</p>
      </div>

      <div className="space-y-4">
        {guias.map((guia, idx) => (
          <div key={idx} className={`rounded-xl p-4 ${guia.cor}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-gray-600 flex-shrink-0" />
                <p className="font-semibold text-sm text-gray-900">{guia.titulo}</p>
              </div>
              <Badge variant="outline" className="text-xs flex-shrink-0">{guia.badge}</Badge>
            </div>
            <p className="text-xs text-gray-600 mb-3 pl-7">{guia.descricao}</p>
            <div className="space-y-1.5 pl-7">
              {guia.passos.map((passo, pidx) => (
                <div key={pidx} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="w-5 h-5 rounded-full bg-white border flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {pidx + 1}
                  </span>
                  {passo}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ConsultoriaClienteTab({ client }) {
  const workshopId = client?.id;
  const [missoesSelecionadas, setMissoesSelecionadas] = useState([]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b">
        <Lightbulb className="w-5 h-5 text-amber-500" />
        <h3 className="font-semibold text-gray-900">Módulo de Consultoria</h3>
        <Badge variant="outline" className="text-xs ml-auto">4 Camadas</Badge>
      </div>

      <Tabs defaultValue="estrategico">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="estrategico" className="text-xs py-2 px-1 flex flex-col gap-0.5 h-auto">
            <Settings2 className="w-3.5 h-3.5" />
            Estratégico
          </TabsTrigger>
          <TabsTrigger value="trilha" className="text-xs py-2 px-1 flex flex-col gap-0.5 h-auto">
            <Map className="w-3.5 h-3.5" />
            Trilha
          </TabsTrigger>
          <TabsTrigger value="sprints" className="text-xs py-2 px-1 flex flex-col gap-0.5 h-auto">
            <Zap className="w-3.5 h-3.5" />
            Sprints
          </TabsTrigger>
          <TabsTrigger value="consultor" className="text-xs py-2 px-1 flex flex-col gap-0.5 h-auto">
            <BookOpen className="w-3.5 h-3.5" />
            Guia
          </TabsTrigger>
        </TabsList>

        <TabsContent value="estrategico" className="mt-4">
          <CamadaEstrategica workshopId={workshopId} />
        </TabsContent>
        <TabsContent value="trilha" className="mt-4">
          <CamadaTrilhaCliente
            workshopId={workshopId}
            missoesSelecionadas={missoesSelecionadas}
            setMissoesSelecionadas={setMissoesSelecionadas}
          />
        </TabsContent>
        <TabsContent value="sprints" className="mt-4">
          <CamadaSprints workshopId={workshopId} missoesSelecionadas={missoesSelecionadas} />
        </TabsContent>
        <TabsContent value="consultor" className="mt-4">
          <CamadaConsultor workshopId={workshopId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}