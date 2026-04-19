import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, X, Plus, Star, Map, Lock, ListChecks, Settings2, Zap, BookOpen, ExternalLink, PlayCircle, ChevronDown, ChevronUp, ChevronRight, RotateCcw, AlertTriangle, Lightbulb, PlaySquare, BarChart2, TrendingUp, MessageSquare, Circle, Clock } from "lucide-react";
import CamadaEstrategica from './CamadaEstrategica';
import SprintPhaseDetailModalRedesigned from './SprintPhaseDetailModalRedesigned';
import { getDefaultPhasesForMission } from './sprintMissionTasks';

const MISSOES = [
  {
    id: "agenda_cheia",
    nome: "Agenda Cheia",
    emoji: "📅",
    descricao: "Preencher a agenda semanal com 100% de ocupação de vendas",
    cor: "border-blue-400 bg-blue-50 text-blue-800"
  },
  {
    id: "fechamento_imbativel",
    nome: "Fechamento Imbatível",
    emoji: "🎯",
    descricao: "Aumentar taxa de conversão de propostas para vendas",
    cor: "border-green-400 bg-green-50 text-green-800"
  },
  {
    id: "caixa_forte",
    nome: "Caixa Forte",
    emoji: "💰",
    descricao: "Fortalecer fluxo de caixa e gestão financeira",
    cor: "border-yellow-400 bg-yellow-50 text-yellow-800"
  },
  {
    id: "empresa_organizada",
    nome: "Empresa Organizada",
    emoji: "📊",
    descricao: "Estruturar processos e operações da empresa",
    cor: "border-purple-400 bg-purple-50 text-purple-800"
  },
  {
    id: "funcoes_claras",
    nome: "Funções Claras",
    emoji: "👥",
    descricao: "Definir papéis, responsabilidades e organograma",
    cor: "border-pink-400 bg-pink-50 text-pink-800"
  },
  {
    id: "contratacao_certa",
    nome: "Contratação Certa",
    emoji: "🎓",
    descricao: "Otimizar processo de seleção e onboarding",
    cor: "border-indigo-400 bg-indigo-50 text-indigo-800"
  },
  {
    id: "cultura_forte",
    nome: "Cultura Forte",
    emoji: "🌟",
    descricao: "Desenvolver cultura organizacional e engajamento",
    cor: "border-red-400 bg-red-50 text-red-800"
  },
]

function CamadaTrilhaCliente({ workshopId, missoesSelecionadas, setMissoesSelecionadas, handleSetMissoesSelecionadas, onRefresh }) {
  const [mostrarSeletor, setMostrarSeletor] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvoRecentemente, setSalvoRecentemente] = useState(false);
  const [mudancasNaoSalvas, setMudancasNaoSalvas] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);

  const handleSalvarTrilha = async () => {
    setSalvando(true);
    try {
      await handleSetMissoesSelecionadas(missoesSelecionadas);
      toast.success('✓ Trilha salva com sucesso!');
      setSalvoRecentemente(true);
      setMudancasNaoSalvas(false);
      setTimeout(() => setSalvoRecentemente(false), 3000);
    } catch (error) {
      console.error('Erro ao salvar trilha:', error);
      toast.error('✗ Erro ao salvar trilha');
    } finally {
      setSalvando(false);
    }
  };

  const sincronizarTrilhas = async () => {
    setSincronizando(true);
    try {
      if (onRefresh) await onRefresh();
      toast.success('✓ Trilhas sincronizadas!');
    } catch (error) {
      toast.error('✗ Erro ao sincronizar');
    } finally {
      setSincronizando(false);
    }
  };

  const toggleMissao = (missaoId) => {
    const novasSelecionadas = missoesSelecionadas.includes(missaoId)
      ? missoesSelecionadas.filter(id => id !== missaoId)
      : [...missoesSelecionadas, missaoId];
    setMissoesSelecionadas(novasSelecionadas);
    setMudancasNaoSalvas(true);
    setSalvoRecentemente(false);
    handleSetMissoesSelecionadas(novasSelecionadas);
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

      {/* Trilha de Implementação */}
      <div>
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-blue-600" />
          Trilha de Implementação
        </h4>

        <div className="space-y-3">
          {/* Botão Sincronizar */}
          {missoesSelecionadas.length === 0 && (
            <button
              onClick={sincronizarTrilhas}
              disabled={sincronizando}
              className="w-full p-3 border-2 border-dashed border-blue-300 rounded-xl text-blue-600 hover:bg-blue-50 transition-colors text-sm font-medium"
            >
              {sincronizando ? '⟳ Sincronizando...' : '⟳ Sincronizar Trilhas'}
            </button>
          )}

          {/* Sprint 0 - Semana 1 Padrão */}
          <div className="border-2 border-gray-300 rounded-xl overflow-hidden bg-gray-50">
            <div className="p-4 flex items-center justify-between border-b">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gray-700 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">0</div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">Sprint 0 — Diagnóstico & Alinhamento</p>
                  <p className="text-xs text-gray-500">Semana 1 (Padrão)</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Lock className="w-3 h-3" />
                Fixo
              </div>
            </div>
            <div className="bg-white/30 p-3 space-y-1.5">
              <div className="text-xs font-semibold text-gray-700">Objetivo: Diagnóstico Inicial e Alinhamento</div>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <span className="text-base">🔍</span> Levantamento de informações
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <span className="text-base">🗂️</span> Organização e priorização de dores
              </div>
            </div>
          </div>

          {/* Missões selecionadas com semanas */}
          {missoesSelecionadasData.map((missao, idx) => {
            const semanaInicio = idx + 2;
            const weeksStructure = [
              { num: semanaInicio, titulo: 'Implementação', descricao: 'Ensinar, configurar e primeira execução', emoji: '🎓' },
              { num: semanaInicio + 1, titulo: 'Execução', descricao: 'Rodar forte, corrigir erros e ajustar', emoji: '⚙️' },
              { num: semanaInicio + 2, titulo: 'Padronização', descricao: 'Melhorar resultado, padronizar e validar', emoji: '✅' },
              { num: semanaInicio + 3, titulo: 'Continuação', descricao: 'Pode continuar ou partir para próxima missão', emoji: '🚀', optional: true }
            ];
            return (
              <div key={missao.id} className={`border-2 rounded-xl overflow-hidden ${missao.cor}`}>
                <div className="p-4 flex items-center justify-between border-b">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-white border-2 border-current flex items-center justify-center text-xs font-bold flex-shrink-0">{idx + 1}</div>
                    <div>
                      <p className="font-semibold text-sm">{missao.emoji} {missao.nome}</p>
                      <p className="text-xs opacity-70">{missao.descricao}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleMissao(missao.id)}
                    className="p-1 rounded-full hover:bg-white/50 transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="bg-white/30 p-3 space-y-2">
                  <div className="text-xs font-semibold text-gray-700 uppercase mb-2">⏱️ Prazo: 3-4 Semanas</div>
                  <div className="grid grid-cols-2 gap-2">
                    {weeksStructure.map((week, wIdx) => (
                      <div key={wIdx} className={`rounded-lg p-2.5 text-xs border ${week.optional ? 'border-dashed opacity-60' : 'border-solid border-current'} bg-white/50`}>
                        <div className="font-bold text-sm mb-1">{week.emoji} S{week.num}</div>
                        <div className="font-semibold text-gray-800">{week.titulo}</div>
                        <div className="text-gray-600 mt-1 leading-tight text-xs">{week.descricao}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

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

      {/* Botão Salvar Trilha */}
      {missoesSelecionadas.length > 0 && (
        <div className="flex items-center gap-3 mt-6 p-4 border rounded-xl bg-blue-50 border-blue-200">
          <Button
            onClick={handleSalvarTrilha}
            disabled={salvando || !mudancasNaoSalvas}
            className={`text-white flex-1 gap-2 ${
              !mudancasNaoSalvas
                ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed opacity-60'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {salvando ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando...
              </>
            ) : !mudancasNaoSalvas ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Trilha salva
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Salvar Trilha
              </>
            )}
          </Button>
          {salvoRecentemente && (
            <div className="text-xs text-green-600 font-medium">✓ Persistido</div>
          )}
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
    icon: ListChecks,
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

function SprintCard({ numero, titulo, emoji, descricao, cor, isFixed, sprint, onSprintUpdated, shouldExpand = false, initialPhaseIndex = null }) {
  const [expandido, setExpandido] = useState(shouldExpand);
  const [faseAtiva, setFaseAtiva] = useState(null);
  const [modalPhaseIndex, setModalPhaseIndex] = useState(initialPhaseIndex);

  const phases = sprint?.phases || [];
  const progress = sprint?.progress_percentage || 0;
  const sprintStatus = sprint?.status || "pending";

  return (
    <div className={`border-2 rounded-xl overflow-hidden ${cor}`}>
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

      {expandido && (
        <div className="border-t border-current/20 bg-white p-4 space-y-3">
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
                  </button>
                  {idx < FASES_SPRINT.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>

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

          {!sprint && !faseAtiva && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <RotateCcw className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <p className="text-xs text-gray-500">Clique em uma fase acima para ver os detalhes do ciclo</p>
            </div>
          )}

          {sprint && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <AlertTriangle className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <p className="text-xs text-blue-700">Clique em cada fase para registrar progresso, tarefas e indicadores.</p>
            </div>
          )}
        </div>
      )}

      {modalPhaseIndex !== null && sprint && (
        <SprintPhaseDetailModalRedesigned
          sprint={sprint}
          phaseIndex={modalPhaseIndex}
          onClose={() => setModalPhaseIndex(null)}
          onSaved={onSprintUpdated}
          onNavigateToPhase={(nextIdx) => setModalPhaseIndex(nextIdx)}
        />
      )}
    </div>
  );
}

function CamadaSprints({ workshopId, missoesSelecionadas, cronogramaTemplateId }) {
  const missoesSelecionadasData = MISSOES.filter(m => missoesSelecionadas.includes(m.id));
  const [sprints, setSprints] = useState([]);
  const [loadingCreate, setLoadingCreate] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const sprintIdFromUrl = urlParams.get('sprint_id');
  const phaseIndexFromUrl = urlParams.get('phase_index') ? parseInt(urlParams.get('phase_index')) : null;

  const loadSprints = useCallback(async () => {
    // Em modo global: carrega TODOS os sprints
    // Em modo contextual: carrega apenas do cliente específico
    const query = workshopId ? { workshop_id: workshopId } : {};
    const data = await base44.entities.ConsultoriaSprint.filter(query);
    setSprints(data || []);
  }, [workshopId]);

  useEffect(() => {
    loadSprints();
  }, [loadSprints]);

  useEffect(() => {
    if (workshopId) {
      loadSprints();
    }
  }, [workshopId, missoesSelecionadas]);

  const getSprintForMission = (missionId, number) =>
    sprints.find(s => s.mission_id === missionId && s.sprint_number === number);

  const initializeSprint = async (mission, numero) => {
    // Regra: só pode ter 2 sprints se o primeiro foi CONCLUÍDO
    const sprintDaMissao = sprints.filter(s => s.mission_id === mission.id);
    
    if (sprintDaMissao.length > 0) {
      const primeiro = sprintDaMissao.sort((a, b) => new Date(a.created_date) - new Date(b.created_date))[0];
      
      // Se tem sprint em andamento e o primeiro não foi concluído
      if (primeiro.status !== 'completed') {
        toast.error(`⚠️ Sprint de "${mission.nome}" ainda está em andamento! Conclua antes de criar outro.`);
        return;
      }
      
      // Se já tem 2 sprints dessa missão
      if (sprintDaMissao.length >= 2) {
        toast.error(`⚠️ Já existe uma repetição dessa missão. Máximo 2 sprints permitidos.`);
        return;
      }
    }
    
    setLoadingCreate(mission.id);
    try {
      const defaultPhases = getDefaultPhasesForMission(mission.id);
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 21); // 3 semanas padrão
      const sprintData = {
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
      };
      if (cronogramaTemplateId) {
        sprintData.cronograma_template_id = cronogramaTemplateId;
      }
      await base44.entities.ConsultoriaSprint.create(sprintData);
      toast.success(`✓ Sprint ${numero} iniciado! (3 semanas)`);
      await loadSprints();
    } catch (error) {
      toast.error('✗ Erro ao iniciar sprint');
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
        <p className="text-sm text-green-100 mt-1">Cada missão vira um sprint com ciclo de 3-4 semanas definidas.</p>
      </div>

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
        {(() => {
          const sprint0 = getSprintForMission("sprint0", 0);
          const shouldExpandSprint0 = sprint0?.id === sprintIdFromUrl;
          return (
            <div className="space-y-2">
              <SprintCard
                numero={0}
                titulo="Sprint 0 — Diagnóstico & Alinhamento"
                emoji="🔍"
                descricao="Sprint inicial fixo para todos os clientes (Semana 1)"
                cor="border-gray-400 bg-gray-50 text-gray-800"
                isFixed={true}
                sprint={sprint0}
                onSprintUpdated={loadSprints}
                shouldExpand={shouldExpandSprint0}
                initialPhaseIndex={shouldExpandSprint0 ? phaseIndexFromUrl : null}
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

        {missoesSelecionadasData.map((missao, idx) => {
          const numero = idx + 1;
          const sprint = getSprintForMission(missao.id, numero);
          const shouldExpandSprint = sprint?.id === sprintIdFromUrl;
          const semanaInicio = idx + 2;
          return (
            <div key={missao.id} className="space-y-2">
              <SprintCard
                numero={numero}
                titulo={`Sprint ${numero} — ${missao.nome}`}
                emoji={missao.emoji}
                descricao={`Semanas ${semanaInicio}-${semanaInicio + 3} (3-4 semanas)`}
                cor={`${missao.cor}`}
                isFixed={false}
                sprint={sprint}
                onSprintUpdated={loadSprints}
                shouldExpand={shouldExpandSprint}
                initialPhaseIndex={shouldExpandSprint ? phaseIndexFromUrl : null}
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

export default function ConsultoriaClienteTab({ client, mode = "contextual" }) {
  const workshopId = client?.id;
  const isGlobalMode = mode === "global" || !workshopId;
  const [missoesSelecionadas, setMissoesSelecionadas] = useState([]);
  const [cronogramaTemplateId, setCronogramaTemplateId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Em modo global, não há workshopId, então carregamos sem filtro
    // Em modo contextual, carregamos para o cliente específico
    const loadSelectedMissions = async () => {
      try {
        if (isGlobalMode) {
          // Modo global: não há seleção de missões agregadas
          // Cada sprint funciona independentemente
          setMissoesSelecionadas([]);
          setLoading(false);
        } else if (workshopId) {
          // Modo contextual: carrega para o cliente específico
          const cronogramas = await base44.entities.CronogramaTemplate.filter(
            { workshop_id: workshopId }
          );
          
          if (cronogramas?.length > 0) {
            const selecionadas = cronogramas[0].missoes_selecionadas || [];
            setMissoesSelecionadas(selecionadas);
            setCronogramaTemplateId(cronogramas[0].id);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Erro ao carregar trilhas selecionadas:', error);
        setLoading(false);
      }
    };
    loadSelectedMissions();
  }, [workshopId, isGlobalMode]);

  const handleSetMissoesSelecionadas = useCallback(async (novasSelecionadas) => {
    // Em modo global, não há operação de salvar para cliente específico
    // Cada sprint é autossuficiente
    if (isGlobalMode) return;
    
    if (!workshopId) return;
    try {
      const existing = await base44.entities.CronogramaTemplate.filter(
        { workshop_id: workshopId }
      );
      
      if (existing?.length > 0) {
        await base44.entities.CronogramaTemplate.update(existing[0].id, {
          missoes_selecionadas: novasSelecionadas
        });
      } else {
        const novo = await base44.entities.CronogramaTemplate.create({
          workshop_id: workshopId,
          fase_oficina: 1,
          nome_fase: 'Trilhas Selecionadas',
          missoes_selecionadas: novasSelecionadas
        });
        if (novo?.id) setCronogramaTemplateId(novo.id);
      }
      
      const existingSprints = await base44.entities.ConsultoriaSprint.filter(
        { workshop_id: workshopId }
      );
      for (const sprint of existingSprints) {
        if (sprint.mission_id !== 'sprint0' && !novasSelecionadas.includes(sprint.mission_id)) {
          await base44.entities.ConsultoriaSprint.delete(sprint.id);
        }
      }
      
      console.log('✅ Trilhas salvas:', novasSelecionadas);
    } catch (error) {
      console.error('❌ Erro ao salvar trilhas:', error);
    }
  }, [workshopId, isGlobalMode]);

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
          {!loading && (
            <CamadaTrilhaCliente
              workshopId={workshopId}
              missoesSelecionadas={missoesSelecionadas}
              setMissoesSelecionadas={setMissoesSelecionadas}
              handleSetMissoesSelecionadas={handleSetMissoesSelecionadas}
              onRefresh={async () => {
                const cronogramas = await base44.entities.CronogramaTemplate.filter({ workshop_id: workshopId });
                if (cronogramas?.length > 0) {
                  setMissoesSelecionadas(cronogramas[0].missoes_selecionadas || []);
                  setCronogramaTemplateId(cronogramas[0].id);
                }
              }}
            />
          )}
          {loading && <div className="text-center py-4 text-gray-500">Carregando trilhas...</div>}
        </TabsContent>
        <TabsContent value="sprints" className="mt-4">
          <CamadaSprints workshopId={workshopId} missoesSelecionadas={missoesSelecionadas} cronogramaTemplateId={cronogramaTemplateId} />
        </TabsContent>
        <TabsContent value="consultor" className="mt-4">
          <CamadaConsultor workshopId={workshopId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}