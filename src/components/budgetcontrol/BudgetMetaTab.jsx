import React, { useState, useMemo, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputMoeda } from "@/components/ui/InputMoeda";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit2, Trash2, Loader2, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { formatCurrency, formatNumber } from "../utils/formatters";
import { toast } from "sonner";
import BudgetSummaryCards from "./BudgetSummaryCards";
import BudgetProgressBars from "./BudgetProgressBars";
import BudgetVariationReport from "./BudgetVariationReport";
import BudgetConsolidatedReport from "./BudgetConsolidatedReport";
import BudgetHistoryTable from "./BudgetHistoryTable";
import BudgetResponsibilityMatrix from "./BudgetResponsibilityMatrix";
import BudgetDREResumoCard from "./BudgetDREResumoCard";
import ConfigurarMetaFromDREModal from "./ConfigurarMetaFromDREModal";
import MetaAnualEditor from "./MetaAnualEditor";
import BudgetConsolidadoAnual from "./BudgetConsolidadoAnual";

const CATEGORIAS = ["operacional", "pessoas", "marketing", "manutencao", "terceirizados", "administrativo", "financeiro", "pecas"];

const ITEMS_PADRAO = {
  operacional: ["Aluguel", "Energia", "Água", "Telefone"],
  pessoas: ["Salários", "Encargos", "Benefícios"],
  marketing: ["Publicidade", "Eventos", "Material"],
  manutencao: ["Manutenção Predial", "Manutenção Equipamentos"],
  terceirizados: ["Contabilidade", "Advocacia", "Limpeza"],
  administrativo: ["Material Escritório", "Software", "Seguros"],
  financeiro: ["Juros", "Multas", "Taxas Bancárias"],
  pecas: ["Compra Peças"]
};

export default function BudgetMetaTab({ workshopId, mes, onMetasLoaded }) {
  const { data: colaboradores = [] } = useQuery({
    queryKey: ["employees-budget", workshopId],
    queryFn: () => base44.entities.Employee.filter({ workshop_id: workshopId, status: "ativo" }, "full_name", 100),
    enabled: !!workshopId,
    staleTime: 5 * 60 * 1000,
  });
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [syncPulse, setSyncPulse] = useState(false);
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [selectedDREItem, setSelectedDREItem] = useState(null);
  const [visaoPeriodo, setVisaoPeriodo] = useState("mensal"); // "mensal" | "anual"
  const [anoSelecionado, setAnoSelecionado] = useState(parseInt(mes.split('-')[0]));
  const [formData, setFormData] = useState({
    faturamento_meta_rs: 0,
    item: "",
    categoria: "operacional",
    meta_percentual: 0,
    meta_fixa_rs: 0,
    responsavel_nome: "",
    notas: ""
  });

  const handleSelectDREItem = (lancamento) => {
    setSelectedDREItem({
      categoria: lancamento.categoria,
      // item = descricao do lancamento (campo que usamos para match)
      item: lancamento.descricao || lancamento.subcategoria || lancamento.categoria,
      valor_realizado: lancamento.valor,
      tipo: lancamento.tipo,
      entra_tcmp2: lancamento.entra_tcmp2
    });
    setShowMetaModal(true);
  };

  const handleSaveMetaFromDRE = (metaData) => {
    saveMutation.mutate({
      categoria: metaData.categoria,
      item: metaData.item,
      tipo: metaData.tipo,
      responsavel_nome: metaData.responsavel_nome || "",
      meta_fixa_rs: metaData.meta_fixa_rs || 0,
      meta_percentual: metaData.meta_percentual || 0,
      notas: metaData.notas || "",
      faturamento_meta_rs: metaData.faturamento_meta_rs || 0
    });
  };

  // Buscar metas do mês (visão mensal)
  const { data: metas = [], isLoading: isLoadingMetas } = useQuery({
    queryKey: ["budget-metas", workshopId, mes],
    queryFn: async () => {
      if (!workshopId) return [];
      const result = await base44.entities.BudgetMeta.filter({
        workshop_id: workshopId,
        mes: mes
      }, "-created_date");
      return Array.isArray(result) ? result : [];
    },
    enabled: !!workshopId && !!mes && visaoPeriodo === "mensal"
  });

  // Buscar metas anuais (visão anual)
  const { data: metasAnuais = [], isLoading: isLoadingMetasAnuais } = useQuery({
    queryKey: ["budget-metas-anuais", workshopId, anoSelecionado],
    queryFn: async () => {
      if (!workshopId) return [];
      const anoInicio = `${anoSelecionado}-01`;
      const anoFim = `${anoSelecionado}-12`;
      const result = await base44.entities.BudgetMeta.filter({
        workshop_id: workshopId,
        periodicidade: "anual"
      }, "-created_date");
      // Filtrar apenas do ano selecionado
      return Array.isArray(result) ? result.filter(m => m.mes >= anoInicio && m.mes <= anoFim) : [];
    },
    enabled: !!workshopId && visaoPeriodo === "anual"
  });

  // Buscar realizados do ano (para visão anual) — busca mês a mês para filtrar no servidor
  const { data: realizadosAno = [] } = useQuery({
    queryKey: ["dre-realizados-ano", workshopId, anoSelecionado],
    queryFn: async () => {
      if (!workshopId) return [];
      // Buscar os 12 meses do ano filtrando no servidor (evita overfetch de todos os anos)
      const promises = Array.from({ length: 12 }, (_, i) => {
        const mesRef = `${anoSelecionado}-${String(i + 1).padStart(2, '0')}`;
        return base44.entities.DRELancamento.filter({ workshop_id: workshopId, mes: mesRef });
      });
      const resultados = await Promise.all(promises);
      return resultados.flat().filter(Boolean);
    },
    enabled: !!workshopId && visaoPeriodo === "anual"
  });

  // Buscar lançamentos do DRE para comparação
  // LIMIT 500 para evitar truncamento silencioso do default 50
  const { data: lancamentos = [] } = useQuery({
    queryKey: ["dre-lancamentos", workshopId, mes],
    queryFn: async () => {
      if (!workshopId) return [];
      const result = await base44.entities.DRELancamento.filter({
        workshop_id: workshopId,
        mes: mes
      }, "-created_date", 500);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!workshopId && !!mes,
    staleTime: 0,
  });

  // Buscar ContaReceber e ContaPagar filtrados pelo mês para cruzar realizado via dre_lancamento_id
  const { data: contasReceber = [] } = useQuery({
    queryKey: ["contas-receber-budget", workshopId],
    queryFn: () => base44.entities.ContaReceber.filter({ workshop_id: workshopId }, "-created_date", 500),
    enabled: !!workshopId && !!mes,
    staleTime: 0,
  });

  const { data: contasPagar = [] } = useQuery({
    queryKey: ["contas-pagar-budget", workshopId],
    queryFn: () => base44.entities.ContaPagar.filter({ workshop_id: workshopId }, "-created_date", 500),
    enabled: !!workshopId && !!mes,
    staleTime: 0,
  });

  // Mapas de dre_lancamento_id → conta (para cruzamento rápido)
  const mapaContasReceber = useMemo(() =>
    Object.fromEntries((contasReceber || []).map(c => [c.dre_lancamento_id, c])),
    [contasReceber]
  );
  const mapaContasPagar = useMemo(() =>
    Object.fromEntries((contasPagar || []).map(c => [c.dre_lancamento_id, c])),
    [contasPagar]
  );

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["dre-lancamentos", workshopId, mes] });
    queryClient.invalidateQueries({ queryKey: ["contas-receber-budget", workshopId] });
    queryClient.invalidateQueries({ queryKey: ["contas-pagar-budget", workshopId] });
    queryClient.invalidateQueries({ queryKey: ["budget-metas", workshopId, mes] });
  }, [queryClient, workshopId, mes]);

  // Real-time subscription: atualizar quando DRELancamento, ContaPagar ou ContaReceber mudar
  // Sem filtro restritivo no evento — payload pode vir nulo/parcial em registros grandes
  useEffect(() => {
    if (!workshopId || !mes) return;

    const pulse = () => { setSyncPulse(true); setTimeout(() => setSyncPulse(false), 1500); };

    const unsubscribeDRE = base44.entities.DRELancamento.subscribe((event) => {
      const wid = event.data?.workshop_id;
      const emes = event.data?.mes;
      // Aceitar se workshop_id bater OU se vier nulo (payload_too_large)
      if (!wid || (wid === workshopId && emes === mes)) {
        pulse();
        queryClient.invalidateQueries({ queryKey: ["dre-lancamentos", workshopId, mes] });
      }
    });

    const unsubscribePagar = base44.entities.ContaPagar.subscribe((event) => {
      const wid = event.data?.workshop_id;
      if (!wid || wid === workshopId) {
        pulse();
        queryClient.invalidateQueries({ queryKey: ["contas-pagar-budget", workshopId] });
      }
    });

    const unsubscribeReceber = base44.entities.ContaReceber.subscribe((event) => {
      const wid = event.data?.workshop_id;
      if (!wid || wid === workshopId) {
        pulse();
        queryClient.invalidateQueries({ queryKey: ["contas-receber-budget", workshopId] });
      }
    });

    const handleDREChange = (e) => {
      if (e.detail?.workshop_id === workshopId && e.detail?.mes === mes) {
        pulse();
        queryClient.invalidateQueries({ queryKey: ["dre-lancamentos", workshopId, mes] });
      }
    };
    window.addEventListener('dre-lancamento-criado', handleDREChange);

    // Escutar evento global disparado ao registrar pagamento/recebimento
    const handlePagamentoRegistrado = () => {
      pulse();
      queryClient.invalidateQueries({ queryKey: ["contas-pagar-budget", workshopId] });
      queryClient.invalidateQueries({ queryKey: ["contas-receber-budget", workshopId] });
    };
    window.addEventListener('pagamento-registrado', handlePagamentoRegistrado);
    window.addEventListener('recebimento-registrado', handlePagamentoRegistrado);
    window.addEventListener('liquidacao-registrada', handlePagamentoRegistrado);

    return () => {
      unsubscribeDRE();
      unsubscribePagar();
      unsubscribeReceber();
      window.removeEventListener('dre-lancamento-criado', handleDREChange);
      window.removeEventListener('pagamento-registrado', handlePagamentoRegistrado);
      window.removeEventListener('recebimento-registrado', handlePagamentoRegistrado);
      window.removeEventListener('liquidacao-registrada', handlePagamentoRegistrado);
    };
  }, [workshopId, mes, queryClient]);

  // Criar/Atualizar meta
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        workshop_id: workshopId,
        mes: mes,
        ...data
      };

      if (editingId) {
        return await base44.entities.BudgetMeta.update(editingId, payload);
      } else {
        return await base44.entities.BudgetMeta.create(payload);
      }
    },
    onSuccess: () => {
      invalidateAll();
      toast.success(editingId ? "Meta atualizada!" : "Meta criada!");
      resetForm();
    },
    onError: () => {
      toast.error("Erro ao salvar meta");
    }
  });

  // Deletar meta
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.BudgetMeta.delete(id);
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Meta deletada!");
    },
    onError: () => {
      toast.error("Erro ao deletar meta");
    }
  });

  const resetForm = () => {
    setFormData({
      faturamento_meta_rs: 0,
      item: "",
      categoria: "operacional",
      meta_percentual: 0,
      meta_fixa_rs: 0,
      responsavel_nome: "",
      notas: ""
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (meta) => {
    setFormData({
      faturamento_meta_rs: meta.faturamento_meta_rs,
      item: meta.item,
      categoria: meta.categoria,
      meta_percentual: meta.meta_percentual || 0,
      meta_fixa_rs: meta.meta_fixa_rs || 0,
      responsavel_nome: meta.responsavel_nome || "",
      notas: meta.notas || ""
    });
    setEditingId(meta.id);
    setShowForm(true);
  };

  // Calcular totais e comparações
  // realizado = valor_liquido das LiquidacaoFinanceira do mês (efetivamente pago)
  // previsto  = soma do DRELancamento (lançado mas ainda não pago)
  const calculado = useMemo(() => {
    if (!metas.length) return { total_meta: 0, por_categoria: {}, receita: {}, despesa: {}, detalhes_subcategorias: {} };

    const por_categoria = {};
    const detalhes_subcategorias = {};
    let total_meta_receita = 0;
    let total_realizado_receita = 0;
    let total_previsto_receita = 0;
    let total_meta_despesa = 0;
    let total_realizado_despesa = 0;
    let total_previsto_despesa = 0;

    metas.forEach(meta => {
      const controlar = meta.controlar_orcamento !== false;

      const faturamento = meta.faturamento_meta_rs || 0;
      const meta_rs = (meta.meta_percentual && meta.meta_percentual > 0)
        ? (meta.meta_percentual / 100) * faturamento
        : (meta.meta_fixa_rs || 0);

      if (!meta_rs || meta_rs === 0) {
        por_categoria[meta.id] = { meta_rs: 0, realizado: 0, previsto: 0, diferenca: 0, variacao: 0, performance: 0, status: "—" };
        return;
      }

      const metaItem = (meta.item || "").trim().toLowerCase();
      const lancamentosDaCategoria = lancamentos.filter(l => l.categoria === meta.categoria);

      // Match fino por item no DRE (para previsto)
      const matchPorDescricao = lancamentosDaCategoria.filter(
        l => (l.descricao || "").trim().toLowerCase() === metaItem
      );
      const matchPorSubcategoria = lancamentosDaCategoria.filter(
        l => (l.subcategoria || "").trim().toLowerCase() === metaItem
      );
      const lancamentosFiltrados =
        matchPorDescricao.length > 0
          ? matchPorDescricao
          : matchPorSubcategoria.length > 0
            ? matchPorSubcategoria
            : lancamentosDaCategoria;

      // PREVISTO = soma do DRE (todos os lançamentos, pagos ou não)
      const previsto = lancamentosFiltrados.reduce((sum, l) => sum + (l.valor || 0), 0);

      // REALIZADO = valor_pago das ContaReceber/ContaPagar vinculadas via dre_lancamento_id
      const isDespesa = meta.tipo !== "receita";
      const mapa = isDespesa ? mapaContasPagar : mapaContasReceber;
      const realizado = lancamentosFiltrados.reduce((sum, l) => {
        const conta = mapa[l.id];
        if (!conta) return sum;
        // Para status "pago" ou "parcial", usar valor_pago
        return sum + (conta.valor_pago || 0);
      }, 0);

      // Detalhamento subcategorias
      const subcategoriasDetalhes = lancamentosFiltrados
        .filter(l => l.subcategoria)
        .reduce((acc, l) => {
          if (!acc[l.subcategoria]) acc[l.subcategoria] = 0;
          acc[l.subcategoria] += l.valor || 0;
          return acc;
        }, {});
      detalhes_subcategorias[meta.id] = subcategoriasDetalhes;

      // Performance baseada no REALIZADO (pago efetivamente)
      let performance, variacao, status, diferenca;

      if (!isDespesa) {
        performance = meta_rs > 0 ? (realizado / meta_rs) * 100 : 0;
        variacao = ((realizado - meta_rs) / meta_rs) * 100;
        diferenca = realizado - meta_rs;
        if (performance >= 100) status = "✅";
        else if (performance >= 80) status = "⚠️";
        else status = "❌";
      } else {
        performance = realizado > 0 ? (meta_rs / realizado) * 100 : 100;
        variacao = ((meta_rs - realizado) / meta_rs) * 100;
        diferenca = meta_rs - realizado;
        if (realizado <= meta_rs) status = "✅";
        else if (realizado <= meta_rs * 1.05) status = "⚠️";
        else status = "❌";
      }

      por_categoria[meta.id] = { meta_rs, realizado, previsto, diferenca, variacao, performance, status, isDespesa };

      if (controlar) {
        if (isDespesa) {
          total_meta_despesa += meta_rs;
          total_realizado_despesa += realizado;
          total_previsto_despesa += previsto;
        } else {
          total_meta_receita += meta_rs;
          total_realizado_receita += realizado;
          total_previsto_receita += previsto;
        }
      }
    });

    const economia_despesa = total_meta_despesa - total_realizado_despesa;
    const atingimento_receita = total_meta_receita > 0
      ? (total_realizado_receita / total_meta_receita) * 100
      : null;

    return {
      total_meta: total_meta_receita + total_meta_despesa,
      por_categoria,
      receita: {
        meta: total_meta_receita,
        realizado: total_realizado_receita,
        previsto: total_previsto_receita,
        atingimento: atingimento_receita
      },
      despesa: {
        meta: total_meta_despesa,
        realizado: total_realizado_despesa,
        previsto: total_previsto_despesa,
        economia: economia_despesa
      }
    };
  }, [metas, lancamentos, mapaContasReceber, mapaContasPagar]);

  if (isLoadingMetas) {
    return <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Toggle Visão Mensal | Visão Anual */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Controle Orçamentário</h3>
          <p className="text-sm text-gray-500">Acompanhe metas e realizado</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setVisaoPeriodo("mensal")}
            className={`text-xs px-3 py-2 rounded-md font-medium transition-all ${visaoPeriodo === "mensal" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            📅 Visão Mensal
          </button>
          <button
            onClick={() => setVisaoPeriodo("anual")}
            className={`text-xs px-3 py-2 rounded-md font-medium transition-all ${visaoPeriodo === "anual" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            📊 Visão Anual
          </button>
        </div>
      </div>

      {/* VISÃO ANUAL */}
      {visaoPeriodo === "anual" && (
        <div className="space-y-6">
          {/* Seletor de Ano */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Ano:</span>
            <select
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={anoSelecionado}
              onChange={e => setAnoSelecionado(parseInt(e.target.value))}
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Editor de Meta Anual */}
          <MetaAnualEditor
            workshopId={workshopId}
            ano={anoSelecionado.toString()}
            item="Faturamento Total"
            categoria="geral"
            tipo="receita"
            metaAnualExistente={metasAnuais.find(m => m.mes === `${anoSelecionado}-01`)?.meta_anual_rs}
            onMetaSalva={() => queryClient.invalidateQueries({ queryKey: ['budget-metas-anuais', workshopId, anoSelecionado] })}
          />

          {/* Consolidado Anual */}
          <BudgetConsolidadoAnual
            ano={anoSelecionado}
            workshopId={workshopId}
            metas={metasAnuais}
            realizados={realizadosAno}
          />
        </div>
      )}

      {/* VISÃO MENSAL */}
      {visaoPeriodo === "mensal" && (
        <>
      {/* Feedback de Sincronismo */}
      {syncPulse && (
        <div className="fixed top-4 right-4 z-50 animate-pulse bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          Dados do DRE atualizados instantaneamente
        </div>
      )}

      {/* FASE 4: Relatório Consolidado */}
      {metas.length > 0 && (
        <BudgetConsolidatedReport calculado={calculado} metas={metas} />
      )}

      {/* FASE 4: Histórico de Variações */}
      <BudgetHistoryTable workshopId={workshopId} mes={mes} />

      {/* Card: Todas despesas/receitas lançadas no DRE Avançado */}
      <BudgetDREResumoCard lancamentos={lancamentos} onSelectDREItem={handleSelectDREItem} />

      {/* Modal: Configurar Meta a partir do DRE */}
      {showMetaModal && selectedDREItem && (
        <ConfigurarMetaFromDREModal
          item={selectedDREItem}
          onClose={() => { setShowMetaModal(false); setSelectedDREItem(null); }}
          onSave={(metaData) => {
            setShowMetaModal(false);
            setSelectedDREItem(null);
            handleSaveMetaFromDRE(metaData);
          }}
        />
      )}

      {/* Cards Resumo */}
      <BudgetSummaryCards calculado={calculado} metas={metas} />

      {/* Progress Bars */}
      {metas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Progresso por Categoria</CardTitle>
            <CardDescription>Acompanhe o andamento de cada meta visualmente</CardDescription>
          </CardHeader>
          <CardContent>
            <BudgetProgressBars metas={metas} calculado={calculado} />
          </CardContent>
        </Card>
      )}

      {/* Relatório de Variações */}
      {metas.length > 0 && (
        <BudgetVariationReport metas={metas} calculado={calculado} />
      )}

      {/* FASE 4: Responsáveis & Ações */}
      {metas.length > 0 && (
        <BudgetResponsibilityMatrix metas={metas} calculado={calculado} />
      )}

      {/* Seção: Configurar Metas */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>⚙️ Configurar Metas do Mês</CardTitle>
              <CardDescription>Defina as metas por categoria para controlar o orçamento</CardDescription>
            </div>
            {!showForm && (
              <Button onClick={() => setShowForm(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Meta
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {showForm && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Meta Total de Faturamento (R$)</Label>
                  <InputMoeda
                   value={formData.faturamento_meta_rs}
                   onChange={(v) => setFormData({ ...formData, faturamento_meta_rs: v })}
                  />
                </div>
                <div>
                  <Label>Nome do Item</Label>
                  <Input
                    value={formData.item}
                    onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                    placeholder="ex: Aluguel, Salários..."
                  />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={formData.categoria} onValueChange={(value) => setFormData({ ...formData, categoria: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Responsável</Label>
                  <Select
                    value={formData.responsavel_nome}
                    onValueChange={(value) => setFormData({ ...formData, responsavel_nome: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um colaborador..." />
                    </SelectTrigger>
                    <SelectContent>
                      {colaboradores.map(c => (
                        <SelectItem key={c.id} value={c.full_name}>{c.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Label className="mb-0">Meta em % do Faturamento</Label>
                    <div className="relative group">
                      <span className="w-4 h-4 rounded-full bg-gray-300 text-gray-700 text-[10px] font-bold flex items-center justify-center cursor-help select-none">?</span>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                        <p className="font-semibold mb-1">Como funciona a % ?</p>
                        <p>A meta em R$ será calculada automaticamente como:</p>
                        <p className="mt-1 bg-gray-700 rounded px-2 py-1 font-mono">Meta R$ = % × Faturamento Base</p>
                        <p className="mt-1 text-gray-300">Ex: 15% com faturamento de R$ 50.000 → meta de R$ 7.500</p>
                        <p className="mt-1 text-yellow-300 text-[10px]">Se preencher R$ Fixo, ele prevalece sobre o %.</p>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                      </div>
                    </div>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Ex: 15"
                    value={formData.meta_percentual === 0 ? "" : formData.meta_percentual}
                    onChange={(e) => setFormData({ ...formData, meta_percentual: parseInt(e.target.value) || 0 })}
                  />
                  {formData.meta_percentual > 0 && formData.faturamento_meta_rs > 0 && (
                    <p className="text-xs text-blue-600 mt-1">
                      = {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((formData.meta_percentual / 100) * formData.faturamento_meta_rs)}
                    </p>
                  )}
                </div>
                <div>
                  <Label>OU Meta em R$ Fixo</Label>
                  <InputMoeda
                    value={formData.meta_fixa_rs}
                    onChange={(v) => setFormData({ ...formData, meta_fixa_rs: v })}
                  />
                </div>
              </div>
              <div>
                <Label>Notas</Label>
                <Input
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  placeholder="Anotações sobre esta meta..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button 
                  onClick={() => saveMutation.mutate(formData)}
                  disabled={saveMutation.isPending || !formData.item}
                >
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {editingId ? "Atualizar" : "Criar"} Meta
                </Button>
              </div>
            </div>
          )}

          {/* Lista de Metas */}
          <div className="space-y-3">
            {metas.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhuma meta cadastrada para este mês.</p>
            ) : (
              metas.map(meta => {
                const calc = calculado.por_categoria[meta.id] || {};
                const meta_rs = meta.meta_percentual 
                  ? (meta.meta_percentual / 100) * (meta.faturamento_meta_rs || 0)
                  : meta.meta_fixa_rs;

                return (
                  <div key={meta.id} className="p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{meta.item}</h4>
                          <Badge>{meta.categoria}</Badge>
                          <span className="text-2xl">{calc.status}</span>
                        </div>
                        <p className="text-sm text-gray-600">{meta.responsavel_nome || "Sem responsável"}</p>
                        {meta.notas && <p className="text-xs text-gray-500 mt-1">📝 {meta.notas}</p>}
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-sm"><strong>Meta:</strong> {formatCurrency(meta_rs)}</p>
                        <p className="text-sm text-gray-500"><strong>Previsto:</strong> {formatCurrency(calc.previsto || 0)}</p>
                        <p className="text-sm text-blue-700 font-semibold"><strong>Realizado:</strong> {formatCurrency(calc.realizado || 0)}</p>
                        <p className={`text-sm font-semibold ${calc.diferenca >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {calc.diferenca >= 0 ? '+' : ''}{formatCurrency(calc.diferenca || 0)}
                        </p>
                      </div>
                      <div className="flex gap-1 ml-4">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(meta)}><Edit2 className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(meta.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Seção: Comparação Real vs Meta */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Comparação: Real vs Meta</CardTitle>
          <CardDescription>Acompanhe o realizado versus as metas definidas</CardDescription>
        </CardHeader>
        <CardContent>
          {metas.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Configure as metas acima para visualizar as comparações.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-2 px-2">Item</th>
                    <th className="text-left py-2 px-2">Tipo</th>
                    <th className="text-right py-2 px-2">Base (R$)</th>
                    <th className="text-right py-2 px-2">Meta %</th>
                    <th className="text-right py-2 px-2">Meta R$</th>
                    <th className="text-right py-2 px-2 text-gray-500">Previsto (DRE)</th>
                    <th className="text-right py-2 px-2 text-blue-700">Realizado (Pago)</th>
                    <th className="text-right py-2 px-2">Diferença</th>
                    <th className="text-center py-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {metas.map(meta => {
                    const calc = calculado.por_categoria[meta.id] || {};
                    const isDespesa = meta.tipo === "despesa";
                    const diferencaPositiva = calc.diferenca >= 0;
                    // Para despesa: positivo = dentro do limite (verde). Para receita: positivo = acima da meta (verde)
                    const diferencaCor = diferencaPositiva ? "text-green-600" : "text-red-600";
                    return (
                      <tr key={meta.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2 font-medium">{meta.item}</td>
                        <td className="py-3 px-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isDespesa ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                            {isDespesa ? "Despesa" : "Receita"}
                          </span>
                        </td>
                        <td className="text-right py-3 px-2 text-gray-500">{formatCurrency(meta.faturamento_meta_rs || 0)}</td>
                        <td className="text-right py-3 px-2">{meta.meta_percentual > 0 ? `${meta.meta_percentual}%` : "—"}</td>
                        <td className="text-right py-3 px-2 font-semibold">{formatCurrency(calc.meta_rs || 0)}</td>
                        <td className="text-right py-3 px-2 text-gray-500">{formatCurrency(calc.previsto || 0)}</td>
                        <td className="text-right py-3 px-2 font-semibold text-blue-700">{formatCurrency(calc.realizado || 0)}</td>
                        <td className={`text-right py-3 px-2 font-semibold ${diferencaCor}`}>
                          {diferencaPositiva ? "+" : ""}{formatCurrency(calc.diferenca || 0)}
                        </td>
                        <td className="text-center py-3 px-2 text-xl">{calc.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}