import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, X, Plus, Star, Map, Lock, ListChecks, ExternalLink } from "lucide-react";

const MISSION_COLORS = [
  "border-blue-400 bg-blue-50 text-blue-800",
  "border-green-400 bg-green-50 text-green-800",
  "border-yellow-400 bg-yellow-50 text-yellow-800",
  "border-purple-400 bg-purple-50 text-purple-800",
  "border-pink-400 bg-pink-50 text-pink-800",
  "border-indigo-400 bg-indigo-50 text-indigo-800",
  "border-red-400 bg-red-50 text-red-800",
  "border-teal-400 bg-teal-50 text-teal-800",
  "border-orange-400 bg-orange-50 text-orange-800",
  "border-cyan-400 bg-cyan-50 text-cyan-800",
];

const MISSOES_FALLBACK = [
  { id: "agenda_cheia", nome: "Agenda Cheia", emoji: "📅", descricao: "Preencher a agenda semanal com 100% de ocupação de vendas", cor: MISSION_COLORS[0] },
  { id: "fechamento_imbativel", nome: "Fechamento Imbatível", emoji: "🎯", descricao: "Aumentar taxa de conversão de propostas para vendas", cor: MISSION_COLORS[1] },
  { id: "caixa_forte", nome: "Caixa Forte", emoji: "💰", descricao: "Fortalecer fluxo de caixa e gestão financeira", cor: MISSION_COLORS[2] },
  { id: "empresa_organizada", nome: "Empresa Organizada", emoji: "📊", descricao: "Estruturar processos e operações da empresa", cor: MISSION_COLORS[3] },
  { id: "funcoes_claras", nome: "Funções Claras", emoji: "👥", descricao: "Definir papéis, responsabilidades e organograma", cor: MISSION_COLORS[4] },
  { id: "contratacao_certa", nome: "Contratação Certa", emoji: "🎓", descricao: "Otimizar processo de seleção e onboarding", cor: MISSION_COLORS[5] },
  { id: "cultura_forte", nome: "Cultura Forte", emoji: "🌟", descricao: "Desenvolver cultura organizacional e engajamento", cor: MISSION_COLORS[6] },
];

function convertSystemMissions(savedMissions) {
  return savedMissions.map((m, idx) => ({
    id: m.id,
    nome: m.name,
    emoji: m.icon || "📋",
    descricao: m.description || "",
    cor: MISSION_COLORS[idx % MISSION_COLORS.length],
  }));
}

/**
 * TrilhaClientePanel — componente autocontido para exibir e editar a trilha de um cliente.
 * Usado no IniciarAtendimentoModal como substituto do TrailsTab.
 */
export default function TrilhaClientePanel({ workshopId }) {
  const queryClient = useQueryClient();

  // Carregar missões do SystemSetting
  const { data: missoes = MISSOES_FALLBACK } = useQuery({
    queryKey: ['missions_templates_for_picker'],
    queryFn: async () => {
      const settings = await base44.entities.SystemSetting.filter({ key: 'missions_templates_v1' });
      if (settings?.length > 0 && settings[0].value) {
        const saved = JSON.parse(settings[0].value);
        if (Array.isArray(saved) && saved.length > 0) return convertSystemMissions(saved);
      }
      return MISSOES_FALLBACK;
    },
    initialData: MISSOES_FALLBACK,
    staleTime: 30 * 1000,
  });

  // Estado local da trilha
  const [missoesSelecionadas, setMissoesSelecionadas] = useState([]);
  const [cronogramaTemplateId, setCronogramaTemplateId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mostrarSeletor, setMostrarSeletor] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mudancasNaoSalvas, setMudancasNaoSalvas] = useState(false);
  const [salvoRecentemente, setSalvoRecentemente] = useState(false);

  // Carregar trilha do cliente
  useEffect(() => {
    if (!workshopId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setMissoesSelecionadas([]);
    setCronogramaTemplateId(null);

    base44.entities.CronogramaTemplate.filter({ workshop_id: workshopId }).then(cronogramas => {
      if (cancelled) return;
      if (cronogramas?.length > 0) {
        setMissoesSelecionadas(cronogramas[0].missoes_selecionadas || []);
        setCronogramaTemplateId(cronogramas[0].id);
      }
      setLoading(false);
    }).catch(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [workshopId]);

  const toggleMissao = (missaoId) => {
    setMissoesSelecionadas(prev =>
      prev.includes(missaoId) ? prev.filter(id => id !== missaoId) : [...prev, missaoId]
    );
    setMudancasNaoSalvas(true);
    setSalvoRecentemente(false);
  };

  const handleSalvarTrilha = useCallback(async () => {
    setSalvando(true);
    try {
      const existing = await base44.entities.CronogramaTemplate.filter({ workshop_id: workshopId });
      if (existing?.length > 0) {
        await base44.entities.CronogramaTemplate.update(existing[0].id, {
          missoes_selecionadas: missoesSelecionadas
        });
      } else {
        const novo = await base44.entities.CronogramaTemplate.create({
          workshop_id: workshopId,
          fase_oficina: 1,
          nome_fase: 'Trilhas Selecionadas',
          missoes_selecionadas: missoesSelecionadas
        });
        if (novo?.id) setCronogramaTemplateId(novo.id);
      }

      // Remover sprints de missões que foram desmarcadas (exceto sprint0)
      const existingSprints = await base44.entities.ConsultoriaSprint.filter({ workshop_id: workshopId });
      for (const sprint of existingSprints) {
        if (sprint.mission_id !== 'sprint0' && !missoesSelecionadas.includes(sprint.mission_id)) {
          await base44.entities.ConsultoriaSprint.delete(sprint.id);
        }
      }

      toast.success('✓ Trilha salva com sucesso!');
      setMudancasNaoSalvas(false);
      setSalvoRecentemente(true);
      setTimeout(() => setSalvoRecentemente(false), 3000);
      queryClient.invalidateQueries({ queryKey: ['camada-sprints', workshopId] });
    } catch (err) {
      toast.error('✗ Erro ao salvar trilha');
    } finally {
      setSalvando(false);
    }
  }, [workshopId, missoesSelecionadas, queryClient]);

  const missoesSelecionadasData = missoes.filter(m => missoesSelecionadas.includes(m.id));

  if (!workshopId) return <p className="text-xs text-gray-500 italic">Sem cliente selecionado</p>;

  if (loading) return <div className="text-center py-6 text-gray-500 text-sm">Carregando trilhas...</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 rounded-xl p-4 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Map className="w-4 h-4 text-blue-200" />
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-200">Camada 2 — Trilha do Cliente</span>
        </div>
        <h3 className="text-base font-bold">Jornada de Implementação</h3>
      </div>

      {/* Link cronograma */}
      <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
        <Map className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <p className="text-xs text-blue-700 flex-1">O cliente acompanha a trilha no Cronograma de Consultoria.</p>
        <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100 flex-shrink-0 text-xs"
          onClick={() => window.open(`/CronogramaConsultoria?workshop_id=${workshopId}`, '_blank')}>
          <ExternalLink className="w-3 h-3 mr-1" />
          Abrir
        </Button>
      </div>

      {/* Trilha */}
      <div>
        <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm">
          <ListChecks className="w-4 h-4 text-blue-600" />
          Trilha de Implementação
        </h4>

        <div className="space-y-2">
          {/* Sprint 0 fixo */}
          <div className="border-2 border-gray-300 rounded-xl overflow-hidden bg-gray-50">
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gray-700 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">0</div>
                <div>
                  <p className="font-semibold text-xs text-gray-900">Sprint 0 — Diagnóstico & Alinhamento</p>
                  <p className="text-[10px] text-gray-500">Semana 1 (Padrão)</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Lock className="w-3 h-3" />
                Fixo
              </div>
            </div>
          </div>

          {/* Missões selecionadas */}
          {missoesSelecionadasData.map((missao, idx) => {
            const semanaInicio = idx + 2;
            const weeks = [
              { num: semanaInicio, titulo: 'Implementação', emoji: '🎓' },
              { num: semanaInicio + 1, titulo: 'Execução', emoji: '⚙️' },
              { num: semanaInicio + 2, titulo: 'Padronização', emoji: '✅' },
              { num: semanaInicio + 3, titulo: 'Continuação', emoji: '🚀', optional: true }
            ];
            return (
              <div key={missao.id} className={`border-2 rounded-xl overflow-hidden ${missao.cor}`}>
                <div className="p-3 flex items-center justify-between border-b border-current/20">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white border-2 border-current flex items-center justify-center text-xs font-bold flex-shrink-0">{idx + 1}</div>
                    <div>
                      <p className="font-semibold text-xs">{missao.emoji} {missao.nome}</p>
                      <p className="text-[10px] opacity-70">{missao.descricao}</p>
                    </div>
                  </div>
                  <button onClick={() => toggleMissao(missao.id)} className="p-1 rounded-full hover:bg-white/50 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="bg-white/30 p-2 grid grid-cols-2 gap-1.5">
                  {weeks.map((w, wIdx) => (
                    <div key={wIdx} className={`rounded-lg p-2 text-xs border ${w.optional ? 'border-dashed opacity-60' : 'border-solid border-current'} bg-white/50`}>
                      <div className="font-bold text-xs mb-0.5">{w.emoji} S{w.num}</div>
                      <div className="font-semibold text-gray-800 text-[10px]">{w.titulo}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Botão adicionar */}
          <button
            onClick={() => setMostrarSeletor(!mostrarSeletor)}
            className="w-full border-2 border-dashed border-blue-300 rounded-xl p-3 text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            {mostrarSeletor ? 'Fechar seletor' : 'Adicionar Missão à Trilha'}
          </button>
        </div>
      </div>

      {/* Seletor de missões */}
      {mostrarSeletor && (
        <div className="border rounded-xl p-3 bg-white shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <p className="font-semibold text-xs text-gray-900">Selecionar Missões</p>
          </div>
          <div className="space-y-1.5">
            {missoes.map(missao => {
              const selecionada = missoesSelecionadas.includes(missao.id);
              return (
                <button key={missao.id} onClick={() => toggleMissao(missao.id)}
                  className={`w-full text-left p-2.5 rounded-lg border-2 transition-all flex items-center justify-between ${
                    selecionada ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">{missao.emoji}</span>
                    <div>
                      <p className="font-medium text-xs text-gray-900">{missao.nome}</p>
                      <p className="text-[10px] text-gray-500">{missao.descricao}</p>
                    </div>
                  </div>
                  {selecionada && <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Botão salvar */}
      {missoesSelecionadas.length > 0 && (
        <div className="flex items-center gap-3 p-3 border rounded-xl bg-blue-50 border-blue-200">
          <Button
            onClick={handleSalvarTrilha}
            disabled={salvando || !mudancasNaoSalvas}
            className={`text-white flex-1 gap-2 text-xs ${
              !mudancasNaoSalvas ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed opacity-60' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {salvando ? (
              <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Salvando...</>
            ) : !mudancasNaoSalvas ? (
              <><CheckCircle2 className="w-3 h-3" />Trilha salva</>
            ) : (
              <><CheckCircle2 className="w-3 h-3" />Salvar Trilha</>
            )}
          </Button>
          {salvoRecentemente && <span className="text-xs text-green-600 font-medium">✓ Persistido</span>}
        </div>
      )}
    </div>
  );
}