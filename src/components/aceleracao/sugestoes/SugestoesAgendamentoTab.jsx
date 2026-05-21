import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, CheckCircle2, XCircle, Clock, RefreshCw, CalendarDays, Users, Zap, Info } from "lucide-react";
import { toast } from "sonner";
import SugestaoCard from "./SugestaoCard";

export default function SugestoesAgendamentoTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [consultorFiltro, setConsultorFiltro] = useState("todos");
  const [gerando, setGerando] = useState(false);
  const [config, setConfig] = useState({
    max_por_dia: 2,
    dias_a_frente: 7,
  });

  // Busca sugestões existentes
  const { data: sugestoes = [], isLoading, refetch } = useQuery({
    queryKey: ["sugestoes-agendamento"],
    queryFn: () => base44.entities.SugestaoAgendamento.list("-created_date", 200),
    staleTime: 0,
    gcTime: 0,
  });

  // 🔗 Busca tipos de atendimento reais do banco (mesmos do RegistrarAtendimento)
  const { data: tiposAtendimentoBanco = [] } = useQuery({
    queryKey: ["tipos-atendimento-consultoria"],
    queryFn: () => base44.entities.TipoAtendimentoConsultoria.list(),
    staleTime: 5 * 60 * 1000,
  });

  // 🔗 Busca lista de admins/consultores reais do sistema
  const { data: consultoresBanco = [] } = useQuery({
    queryKey: ["consultores-admin-list"],
    queryFn: () => base44.entities.User.filter({ role: "admin" }, "full_name", 100),
    staleTime: 5 * 60 * 1000,
  });

  // 🔗 Busca horários disponíveis do consultor selecionado (Grade de Horários)
  const consultorParaHorarios = consultorFiltro !== "todos" ? consultorFiltro : user?.id;
  const { data: horariosGrade = [] } = useQuery({
    queryKey: ["horarios-disponiveis-sugestoes", consultorParaHorarios],
    queryFn: () => consultorParaHorarios
      ? base44.entities.HorarioDisponivel.filter({ consultor_id: consultorParaHorarios })
      : [],
    enabled: !!consultorParaHorarios,
    staleTime: 2 * 60 * 1000,
  });

  // Extrai slots ativos da grade (todos os dias)
  const horariosDoConsultor = useMemo(() => {
    const slots = new Set();
    horariosGrade.forEach(diaGrade => {
      if (!diaGrade.ativo) return;
      (diaGrade.horarios || []).forEach(h => {
        if (h.ativo) slots.add(h.hora);
      });
    });
    const sorted = Array.from(slots).sort();
    return sorted.length > 0 ? sorted : ["09:00", "14:00"]; // fallback
  }, [horariosGrade]);

  // Busca lista de consultores das sugestões (para filtro)
  const consultores = React.useMemo(() => {
    // Usa a lista real de admins do banco
    return consultoresBanco;
  }, [consultoresBanco]);

  // Filtra por consultor
  const sugestoesFiltradas = React.useMemo(() => {
    if (consultorFiltro === "todos") return sugestoes;
    return sugestoes.filter(s => s.consultor_id === consultorFiltro);
  }, [sugestoes, consultorFiltro]);

  // Contadores
  const contadores = React.useMemo(() => ({
    pendentes:  sugestoesFiltradas.filter(s => s.status === "pendente").length,
    aprovados:  sugestoesFiltradas.filter(s => s.status === "aprovado").length,
    reprovados: sugestoesFiltradas.filter(s => s.status === "reprovado").length,
    processando: sugestoesFiltradas.filter(s => s.status === "processando").length,
  }), [sugestoesFiltradas]);

  // Ordena: processando → pendente → aprovado → reprovado
  const sugestoesOrdenadas = React.useMemo(() => {
    const ordem = { processando: 0, pendente: 1, aprovado: 2, reprovado: 3 };
    return [...sugestoesFiltradas].sort((a, b) => {
      const oa = ordem[a.status] ?? 9;
      const ob = ordem[b.status] ?? 9;
      if (oa !== ob) return oa - ob;
      return (b.score_prioridade || 0) - (a.score_prioridade || 0);
    });
  }, [sugestoesFiltradas]);

  const handleGerar = async () => {
    setGerando(true);
    try {
      const hoje = new Date();
      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);
      const dataInicio = amanha.toISOString().split("T")[0];

      const consultorId = consultorFiltro !== "todos" ? consultorFiltro : user?.id;
      const consultorObj = consultores.find(c => c.id === consultorId);

      const res = await base44.functions.invoke("gerarSugestoesAgendamento", {
        consultor_id: consultorId,
        consultor_nome: consultorObj?.full_name || user?.full_name,
        data_inicio: dataInicio,
        max_por_dia: config.max_por_dia,
        horarios_disponiveis: horariosDoConsultor, // 🔗 da Grade de Horários
        dias_a_frente: config.dias_a_frente,
      });

      const total = res?.data?.total_geradas ?? 0;
      if (total > 0) {
        toast.success(`${total} sugestão(ões) gerada(s) com sucesso!`);
      } else {
        toast.info("Nenhuma sugestão gerada. Todos os clientes críticos já possuem sugestão ativa.");
      }
      refetch();
    } catch (err) {
      toast.error("Erro ao gerar sugestões: " + err.message);
    } finally {
      setGerando(false);
    }
  };

  // Troca consultor diretamente na sugestão sem aprovar
  const handleConsultorChange = async (sugestaoId, novoConsultorId, novoConsultorNome) => {
    try {
      await base44.entities.SugestaoAgendamento.update(sugestaoId, {
        consultor_id: novoConsultorId,
        consultor_nome: novoConsultorNome,
      });
      queryClient.setQueryData(["sugestoes-agendamento"], (old = []) =>
        old.map(s => s.id === sugestaoId ? { ...s, consultor_id: novoConsultorId, consultor_nome: novoConsultorNome } : s)
      );
    } catch {
      toast.error("Erro ao atribuir consultor");
    }
  };

  const handleAprovar = async (sugestaoId, { tipoFinal, dataFinal, horaFinal, consultorId, consultorNome }) => {
    try {
      // Otimistic update
      queryClient.setQueryData(["sugestoes-agendamento"], (old = []) =>
        old.map(s => s.id === sugestaoId ? { ...s, status: "processando" } : s)
      );

      const res = await base44.functions.invoke("processarAprovacaoSugestao", {
        sugestao_id: sugestaoId,
        acao: "aprovar",
        tipo_final: tipoFinal,
        data_final: dataFinal,
        hora_final: horaFinal,
        consultor_id_override: consultorId,
        consultor_nome_override: consultorNome,
      });

      if (res?.data?.success) {
        const msgs = [`✅ Reunião agendada!`];
        if (res.data.meet_link) msgs.push("Google Meet criado");
        if (res.data.email_enviado) msgs.push(`E-mail enviado para ${res.data.emails_enviados} destinatário(s)`);
        toast.success(msgs.join(" · "));
      }
      refetch();
    } catch (err) {
      toast.error("Erro ao aprovar: " + err.message);
      refetch();
    }
  };

  const handleReprovar = async (sugestaoId, motivo) => {
    try {
      await base44.functions.invoke("processarAprovacaoSugestao", {
        sugestao_id: sugestaoId,
        acao: "reprovar",
        motivo_reprovacao: motivo,
      });
      toast.info("Sugestão reprovada.");
      refetch();
    } catch (err) {
      toast.error("Erro ao reprovar: " + err.message);
    }
  };

  const handleLimparReprovados = async () => {
    const reprovados = sugestoes.filter(s => s.status === "reprovado");
    for (const s of reprovados) {
      await base44.entities.SugestaoAgendamento.delete(s.id);
    }
    toast.success(`${reprovados.length} sugestão(ões) reprovada(s) removida(s).`);
    refetch();
  };

  return (
    <div className="space-y-4">

      {/* Header configuração */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">

          {/* Filtro consultor */}
          <div className="flex items-center gap-2 min-w-0">
            <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <Select value={consultorFiltro} onValueChange={setConsultorFiltro}>
              <SelectTrigger className="h-8 text-xs w-44">
                <SelectValue placeholder="Todos os consultores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">Todos os consultores</SelectItem>
                {consultores.map(c => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">{c.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Config: max por dia */}
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-500 flex-shrink-0">Máx/dia:</span>
            <Select value={String(config.max_por_dia)} onValueChange={v => setConfig(c => ({ ...c, max_por_dia: Number(v) }))}>
              <SelectTrigger className="h-8 text-xs w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1,2,3,4,5].map(n => (
                  <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Horários da Grade (somente leitura, sincronizados) */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-500 flex-shrink-0">Slots:</span>
            <div className="flex gap-1 flex-wrap">
              {horariosDoConsultor.map(h => (
                <span key={h} className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 rounded px-1.5 py-0.5 font-mono">{h}</span>
              ))}
            </div>
            <span className="text-[10px] text-gray-400 italic flex items-center gap-0.5">
              <Info className="w-3 h-3" /> Grade
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {sugestoes.filter(s => s.status === "reprovado").length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-gray-400 hover:text-gray-600"
                onClick={handleLimparReprovados}
              >
                Limpar reprovados
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-gray-500"
              onClick={() => refetch()}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-gray-900 hover:bg-gray-800 text-white"
              onClick={handleGerar}
              disabled={gerando}
            >
              {gerando ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              )}
              {gerando ? "Gerando..." : "Gerar Sugestões IA"}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span className="font-semibold text-amber-700 text-sm">{contadores.pendentes}</span>
          <span className="text-amber-500 text-xs">pendentes</span>
        </div>
        <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 rounded-lg px-3 py-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          <span className="font-semibold text-green-700 text-sm">{contadores.aprovados}</span>
          <span className="text-green-500 text-xs">agendados</span>
        </div>
        <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
          <XCircle className="w-3.5 h-3.5 text-red-400" />
          <span className="font-semibold text-red-700 text-sm">{contadores.reprovados}</span>
          <span className="text-red-400 text-xs">reprovados</span>
        </div>
        {contadores.processando > 0 && (
          <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5">
            <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
            <span className="font-semibold text-blue-700 text-sm">{contadores.processando}</span>
            <span className="text-blue-500 text-xs">processando</span>
          </div>
        )}
      </div>

      {/* Lista de sugestões */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Carregando sugestões...</span>
        </div>
      ) : sugestoesOrdenadas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
            <CalendarDays className="w-7 h-7 text-gray-300" />
          </div>
          <div>
            <p className="font-semibold text-gray-700">Nenhuma sugestão gerada</p>
            <p className="text-sm text-gray-400 mt-1">
              Clique em "Gerar Sugestões IA" para analisar os clientes mais críticos<br />
              e criar automaticamente uma fila de agendamentos priorizados.
            </p>
          </div>
          <Button
            size="sm"
            className="mt-2 bg-gray-900 hover:bg-gray-800 text-white text-xs"
            onClick={handleGerar}
            disabled={gerando}
          >
            {gerando ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
            {gerando ? "Gerando..." : "Gerar agora"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sugestoesOrdenadas.map(sugestao => (
            <SugestaoCard
              key={sugestao.id}
              sugestao={sugestao}
              onAprovar={handleAprovar}
              onReprovar={handleReprovar}
              tiposAtendimento={tiposAtendimentoBanco}
              consultores={consultores}
              onConsultorChange={handleConsultorChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}