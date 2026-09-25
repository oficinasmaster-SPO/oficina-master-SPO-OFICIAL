import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Wallet, Building2, Landmark, Loader2, AlertCircle, RefreshCw } from
"lucide-react";
import { InputMoeda } from "@/components/ui/InputMoeda";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ReferenceLine, Legend } from
"recharts";
import { toast } from "sonner";
import { mapDREtoDFC } from "./mapDREtoDFC";
import ProjecaoCaixaView from "./ProjecaoCaixaView";
import ModalSaldoInicialDetalhado from "../dfc/ModalSaldoInicialDetalhado";
import TransferenciasEntreContas from "../dfc/TransferenciasEntreContas";
import SaldoConsolidadoCard from "../dfc/SaldoConsolidadoCard";
import FonteSaidaSelector from "../dfc/FonteSaidaSelector";
import FiltroPeriodo from "./FiltroPeriodo";
import ContasReceberPagarTab from "../dfc/ContasReceberPagarTab";
import ModalLiquidacaoDRE from "../dfc/ModalLiquidacaoDRE";
import ModalEstornoLiquidacao from "../dfc/ModalEstornoLiquidacao";
import VencimentosCard from "./VencimentosCard";
import {
  SecaoFluxoDFC, FiltrosDFC, filtrarItensDFC, contarStatusDFC, DFCSkeleton
} from "../dfc/DFCListaFluxo";

// ─── Formatação ────────────────────────────────────────────────────
const fmt = (v) =>
new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

// ─── Tooltip Waterfall ─────────────────────────────────────────────
function WaterfallTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-800">{d.label}</p>
      <p className={`font-bold ${d.valor >= 0 ? "text-green-600" : "text-red-600"}`}>
        {d.valor >= 0 ? "+" : ""}{fmt(d.valor)}
      </p>
      {d.saldoApos != null &&
      <p className="text-gray-500 text-xs mt-1">Saldo após: {fmt(d.saldoApos)}</p>
      }
    </div>);

}

// ─── Gráfico Waterfall ─────────────────────────────────────────────
// FLICKER FIX (Etapa 2): memo + dados memoizados — o gráfico não é reconstruído
// nem re-animado quando o DFC re-renderiza (ex: abrir/fechar modal)
const GraficoWaterfall = React.memo(function GraficoWaterfall({ saldoInicial, fluxoOp, fluxoInv, fluxoFin, saldoFinal }) {
  const dados = useMemo(() => {
  const barras = [
  { label: "Saldo Inicial", valor: saldoInicial, tipo: "saldo" },
  { label: "Operacional", valor: fluxoOp, tipo: fluxoOp >= 0 ? "positivo" : "negativo" },
  { label: "Investimento", valor: fluxoInv, tipo: fluxoInv >= 0 ? "positivo" : "negativo" },
  { label: "Financiamento", valor: fluxoFin, tipo: fluxoFin >= 0 ? "positivo" : "negativo" },
  { label: "Saldo Final", valor: saldoFinal, tipo: "saldo" }];


  let acumulado = 0;
  return barras.map((b, i) => {
    if (i === 0 || i === barras.length - 1) {
      // Saldo inicial e final: barra começa do zero, altura é o valor absoluto
      const altura = Math.abs(b.valor);
      acumulado = b.valor;
      return { ...b, base: 0, altura, saldoApos: b.valor };
    }
    // Barras intermediárias: base = ponto mais baixo da barra
    const base = b.valor >= 0 ? acumulado : acumulado + b.valor;
    const altura = Math.abs(b.valor);
    acumulado += b.valor;
    return { ...b, base, altura, saldoApos: acumulado };
  });
  }, [saldoInicial, fluxoOp, fluxoInv, fluxoFin]);

  const cores = { positivo: "#10b981", negativo: "#ef4444", saldo: "#3b82f6" };

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 10 }} width={90} />
          <Tooltip content={<WaterfallTooltip />} />
          <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={1} />
          <Bar dataKey="base" stackId="w" fill="transparent" />
          <Bar dataKey="altura" stackId="w" radius={[4, 4, 0, 0]}>
            {dados.map((d, i) =>
            <Cell key={i} fill={cores[d.tipo]} />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>);

});

// ─── Modal CRUD lançamento manual ─────────────────────────────────
function ModalLancamento({ aberto, onFechar, onSalvar, isSaving, lancamentoEdicao, grupoInicial }) {
  const [form, setForm] = useState({
    grupo: "operacional",
    tipo: "entrada",
    descricao: "",
    valor: "",
    fonte_saida: ""
  });

  useEffect(() => {
    if (aberto) {
      if (lancamentoEdicao) {
        setForm({
          grupo: lancamentoEdicao.grupo,
          tipo: lancamentoEdicao.tipo,
          descricao: lancamentoEdicao.descricao,
          valor: String(lancamentoEdicao.valor),
          fonte_saida: lancamentoEdicao.fonte_saida || ""
        });
      } else {
        setForm({
          grupo: grupoInicial || "operacional",
          tipo: "entrada",
          descricao: "",
          valor: "",
          fonte_saida: ""
        });
      }
    }
  }, [aberto, lancamentoEdicao, grupoInicial]);

  const handleSalvar = () => {
    if (!form.valor || !form.descricao) return;
    onSalvar({ ...form, valor: parseFloat(form.valor) });
  };

  return (
    <Dialog open={aberto} onOpenChange={onFechar}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{lancamentoEdicao ? "Editar Lançamento" : "Novo Lançamento Manual"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Grupo</Label>
            <Select value={form.grupo || ""} onValueChange={(v) => setForm((f) => ({ ...f, grupo: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="operacional">🟢 Operacional</SelectItem>
                <SelectItem value="investimento">🔵 Investimento</SelectItem>
                <SelectItem value="financiamento">🟣 Financiamento</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={form.tipo || "entrada"} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">+ Entrada de caixa</SelectItem>
                <SelectItem value="saida">- Saída de caixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição</Label>
            <Input
              placeholder="Ex: Empréstimo recebido, Recebimento parcelado..."
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
            
          </div>
          <div>
            <Label>Valor (R$) *</Label>
            <InputMoeda
              value={parseFloat(form.valor) || 0}
              onChange={(v) => setForm((f) => ({ ...f, valor: v }))}
              className="text-right" />
          </div>
          
          {/* Seletor de fonte de saída (apenas para saídas) */}
          {form.tipo === "saida" &&
          <FonteSaidaSelector
            value={form.fonte_saida}
            onChange={(fonte) => setForm((f) => ({ ...f, fonte_saida: fonte }))}
            disabled={false} />

          }
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={!form.descricao || !form.valor || isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            {lancamentoEdicao ? "Salvar alterações" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>);

}

// ─── Formatar data curta ───────────────────────────────────────────
const fmtData = (d) => {
  if (!d) return null;
  const [ano, mes, dia] = d.split("-");
  return `${dia}/${mes}`;
};

// ─── Badge de status: movido para ../dfc/DFCListaFluxo.jsx (statusDFC) ─────────────────────────────────

// ─── Modal para marcar data_pagamento ─────────────────────────────
function ModalMarcarPagamento({ item, onFechar, onSalvo }) {
  const [dataPagamento, setDataPagamento] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [saving, setSaving] = useState(false);

  // BUG FIX: sincronizar state local toda vez que o item muda
  useEffect(() => {
    setDataPagamento(item?.data_pagamento || "");
    setDataVencimento(item?.data_vencimento || "");
  }, [item?.id, item?.data_pagamento, item?.data_vencimento, item]);

  if (!item) return null;

  const handleSalvar = async () => {
    setSaving(true);
    try {
      await base44.entities.DRELancamento.update(item.id, {
        data_vencimento: dataVencimento || null,
        data_pagamento: dataPagamento || null
      });
      toast.success("Datas atualizadas!");
      onSalvo(); // onSalvo já fecha o modal (invalida query + setItemPagamento(null))
    } catch {
      toast.error("Erro ao salvar datas");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!item} onOpenChange={onFechar}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">📅 Datas do Lançamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-1 text-xs text-gray-500 pb-2">
          <p className="font-medium text-gray-800 text-sm truncate">{item.descricao || "—"}</p>
          <p className={item.tipo === "entrada" ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
            {item.tipo === "entrada" ? "+" : "-"}{fmt(item.valor)}
          </p>
        </div>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Data de Vencimento <span className="text-gray-400">(opcional)</span></Label>
            <input
              type="date"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mt-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)} />
            
          </div>
          <div>
            <Label className="text-xs">Data de Pagamento <span className="text-gray-400">(preencha quando pago)</span></Label>
            <input
              type="date"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mt-1 bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)} />
            
            {dataPagamento &&
            <button
              onClick={() => setDataPagamento("")}
              className="text-xs text-red-500 hover:text-red-700 mt-1">
              
                Limpar (marcar como pendente)
              </button>
            }
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onFechar}>Cancelar</Button>
          <Button size="sm" onClick={handleSalvar} disabled={saving}>
            {saving && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>);

}

// ─── Linha de item e seção por grupo: ver ../dfc/DFCListaFluxo.jsx ─────────────────────────────────────────────────

// ─── Lista por grupo: movida para ../dfc/DFCListaFluxo.jsx (SecaoFluxoDFC) ──────────────────────────────────────────────

// ─── DFC Anual ─────────────────────────────────────────────────────
function DFCAnualView({ dados, isLoading, ano, fmt }) {
  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
      <span className="text-gray-500">Carregando DFC anual...</span>
    </div>);


  if (!dados) return (
    <div className="text-center py-12 text-gray-400">
      <p>Nenhum dado de DFC encontrado para {ano}.</p>
    </div>);


  const { meses = [], total_anual = {}, grupos = [] } = dados?.data ?? dados;

  return (
    <div className="space-y-4">
      {/* Cards de totais anuais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
        { label: "Operacional", value: total_anual.operacional, cor: "text-blue-600" },
        { label: "Investimento", value: total_anual.investimento, cor: "text-amber-600" },
        { label: "Financiamento", value: total_anual.financiamento, cor: "text-purple-600" },
        { label: "Saldo Final", value: total_anual.saldo_final, cor: total_anual.saldo_final >= 0 ? "text-emerald-600" : "text-red-600" }].
        map(({ label, value, cor }) =>
        <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-gray-500">{label}</p>
              <p className={`text-lg font-bold ${cor}`}>{fmt(value)}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Gráfico de barras mensais */}
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">📊 Saldo Mensal — {ano}</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={meses} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <XAxis dataKey="mes_nome" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmt(v)} />
              <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
              <Bar dataKey="saldo_final" name="Saldo" radius={[3, 3, 0, 0]}>
                {meses.map((entry, index) =>
                <Cell key={index} fill={entry.saldo_final >= 0 ? "#10b981" : "#ef4444"} />
                )}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabela por grupo */}
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">📋 Resumo por Grupo — {ano}</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-gray-500">
                <th className="text-left py-2">Grupo</th>
                <th className="text-right py-2">Entradas</th>
                <th className="text-right py-2">Saídas</th>
                <th className="text-right py-2">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {grupos.map((g) =>
              <tr key={g.grupo} className="border-b last:border-0">
                  <td className="py-2 font-medium capitalize">{g.label}</td>
                  <td className="py-2 text-right text-emerald-600">{fmt(g.entradas)}</td>
                  <td className="py-2 text-right text-red-500">{fmt(g.saidas)}</td>
                  <td className={`py-2 text-right font-bold ${g.total >= 0 ? "text-emerald-700" : "text-red-600"}`}>{fmt(g.total)}</td>
                </tr>
              )}
              <tr className="bg-gray-50 font-bold text-sm">
                <td className="py-2">Total Anual</td>
                <td className="py-2 text-right text-emerald-600">{fmt(grupos.reduce((s, g) => s + g.entradas, 0))}</td>
                <td className="py-2 text-right text-red-500">{fmt(grupos.reduce((s, g) => s + g.saidas, 0))}</td>
                <td className={`py-2 text-right ${total_anual.saldo_final >= 0 ? "text-emerald-700" : "text-red-600"}`}>{fmt(total_anual.saldo_final)}</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>);

}

// ─── Componente principal ──────────────────────────────────────────
export default function DFCTab({ workshopId, mes }) {
  const queryClient = useQueryClient();
  const [modalAberto, setModalAberto] = useState(false);
  const [grupoModal, setGrupoModal] = useState("operacional");
  const [lancamentoEdicao, setLancamentoEdicao] = useState(null);
  // saldoInicialInput removido — card é somente leitura, valor vem direto de saldoInicialSalvo
  const [itemPagamento, setItemPagamento] = useState(null);
  const [view, setView] = useState("grupos"); // "grupos" | "projecao"
  const [modalSaldoDetalhadoAberto, setModalSaldoDetalhadoAberto] = useState(false);
  // Estorno direto das linhas Operacional/Investimento/Financiamento
  const [contaParaEstornarDFC, setContaParaEstornarDFC] = useState(null); // { conta, tipo }
  const [periodo, setPeriodo] = useState("mensal"); // mensal | anual
  const [showContasTab, setShowContasTab] = useState(false);
  // UI/UX BPO — filtros client-side da visão "Por Grupo"
  const [buscaDFC, setBuscaDFC] = useState("");
  const [statusDFCFiltro, setStatusDFCFiltro] = useState("todos"); // todos | pendentes | vencidos | pagos
  const [tipoDFC, setTipoDFC] = useState("todos");                 // todos | entrada | saida

  const mesAtual = mes ? mes.split('-')[1] : "01";
  const anoAtual = mes ? parseInt(mes.split('-')[0]) : new Date().getFullYear();

  // Sincroniza ano com o prop mes (igual fix do DRE Avançado)
  const [ano, setAno] = useState(anoAtual);
  useEffect(() => {
    setAno(anoAtual);
  }, [anoAtual]);

  // ── Buscar DRELancamentos → mapeados automaticamente (Fase 3) ──
  const { data: lancamentosDRE = [], isLoading: isDRELoading, isError: isDREError, refetch: refetchDRE } = useQuery({
    queryKey: ["dre-lancamentos-dfc", workshopId, mes],
    queryFn: async () => {
      // LIMIT 500 em todas as queries para evitar truncamento silencioso
      const dres = await base44.entities.DRELancamento.filter({ workshop_id: workshopId, mes }, "-created_date", 500);
      if (!dres?.length) return [];
      // QA-DFC-05: busca só as contas vinculadas aos lançamentos do mês (antes: 1.000 registros
      // da oficina inteira a cada refetch, com risco de truncar contas antigas no limite de 500)
      const ids = dres.map((d) => d.id);
      const [contasReceber, contasPagar] = await Promise.all([
      base44.entities.ContaReceber.filter({ workshop_id: workshopId, dre_lancamento_id: { $in: ids } }, "-created_date", 500),
      base44.entities.ContaPagar.filter({ workshop_id: workshopId, dre_lancamento_id: { $in: ids } }, "-created_date", 500)]
      );
      const mapaReceber = Object.fromEntries((contasReceber || []).map((c) => [c.dre_lancamento_id, c]));
      const mapaPagar = Object.fromEntries((contasPagar || []).map((c) => [c.dre_lancamento_id, c]));
      return dres.map((d) => {
        const contaR = mapaReceber[d.id];
        const contaP = mapaPagar[d.id];
        const conta = contaR || contaP;
        if (!conta) return d;
        // Propaga status da conta e data de pagamento
        // data_primeiro_pagamento é o único campo de data de pagamento no schema de ContaReceber/ContaPagar
        const dataPagamento = conta.data_primeiro_pagamento || d.data_pagamento || null;
        return {
          ...d,
          status_conta: conta.status,
          data_pagamento: conta.status === "pago" || conta.status === "parcial" ?
          dataPagamento :
          d.data_pagamento,
          // Propaga a conta vinculada para permitir estorno direto na LinhaItem
          _conta: conta,
          _tipo_conta: contaR ? "receber" : "pagar",
        };
      });
    },
    enabled: !!workshopId && !!mes,
    staleTime: 0
  });

  // BUG FIX #1: Real-time subscription para escutar novos lançamentos do DRE Avançado
  useEffect(() => {
    if (!workshopId || !mes) return;

    const unsubscribe = base44.entities.DRELancamento.subscribe((event) => {
      if (event.data?.workshop_id === workshopId && event.data?.mes === mes) {
        if (event.type === 'create' || event.type === 'delete' || event.type === 'update') {
          refetchDRE();
        }
      }
    });

    // Event listener para cross-tab sync
    const handleDREChange = () => refetchDRE();
    const handleLiquidacao = () => {
      refetchDRE();
      queryClient.invalidateQueries({ queryKey: ["dfc-manuais", workshopId, mes] });
      queryClient.invalidateQueries({ queryKey: ["dfc-saldo", workshopId, mes] });
    };
    window.addEventListener('dre-lancamento-criado', handleDREChange);
    window.addEventListener('liquidacao-registrada', handleLiquidacao);
    window.addEventListener('pagamento-registrado', handleLiquidacao);
    window.addEventListener('recebimento-registrado', handleLiquidacao);

    return () => {
      unsubscribe();
      window.removeEventListener('dre-lancamento-criado', handleDREChange);
      window.removeEventListener('liquidacao-registrada', handleLiquidacao);
      window.removeEventListener('pagamento-registrado', handleLiquidacao);
      window.removeEventListener('recebimento-registrado', handleLiquidacao);
    };
  }, [workshopId, mes, refetchDRE]);

  // ── Buscar lançamentos manuais do DFC ──────────────────────────
  const { data: manuaisDB = [], isLoading: isManuaisLoading, isError: isManuaisError, refetch: refetchManuais } = useQuery({
    queryKey: ["dfc-manuais", workshopId, mes],
    queryFn: () => base44.entities.DFCLancamento.filter({ workshop_id: workshopId, mes, origem: "manual" }),
    enabled: !!workshopId && !!mes
  });

  // ── Buscar saldo inicial salvo (Fase 5) ────────────────────────
  const { data: saldoInicialDB = [] } = useQuery({
    queryKey: ["dfc-saldo", workshopId, mes],
    queryFn: () => base44.entities.DFCLancamento.filter({ workshop_id: workshopId, mes, grupo: "saldo_inicial" }),
    enabled: !!workshopId && !!mes
  });

  // ── DFC Anual ──
  const { data: dadosAnuaisDFC, isLoading: isLoadingAnual } = useQuery({
    queryKey: ["dfc-anual", workshopId, ano],
    queryFn: () => base44.functions.invoke('getDFCDataAnual', { workshop_id: workshopId, ano: String(ano) }),
    enabled: periodo === "anual" && !!workshopId && !!ano,
    staleTime: 60_000
  });

  const saldoInicialRecord = saldoInicialDB[0] || null;
  // Usa `valor` como fonte de verdade (sempre sincronizado pelo modal detalhado E pelo campo simples)
  // Fallback para `saldo_inicial` para compatibilidade com registros antigos
  const saldoInicialSalvo = saldoInicialRecord?.valor ?? saldoInicialRecord?.saldo_inicial ?? 0;

  // Sem sincronização de input local — card exibe saldoInicialSalvo diretamente (somente leitura)

  // ── Mutations ──────────────────────────────────────────────────
  const criarMutation = useMutation({
    mutationFn: (data) => base44.entities.DFCLancamento.create({ ...data, workshop_id: workshopId, mes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dfc-manuais", workshopId, mes] });
      queryClient.invalidateQueries({ queryKey: ["budget-metas", workshopId, mes] });
      toast.success("Lançamento adicionado!");
      setModalAberto(false);
      setLancamentoEdicao(null);
    },
    onError: (e) => toast.error("Erro ao adicionar: " + (e?.message || "tente novamente"))
  });

  const editarMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DFCLancamento.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dfc-manuais", workshopId, mes] });
      queryClient.invalidateQueries({ queryKey: ["budget-metas", workshopId, mes] });
      toast.success("Lançamento atualizado!");
      setModalAberto(false);
      setLancamentoEdicao(null);
    },
    onError: (e) => toast.error("Erro ao atualizar: " + (e?.message || "tente novamente"))
  });

  const deletarMutation = useMutation({
    mutationFn: (id) => base44.entities.DFCLancamento.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dfc-manuais", workshopId, mes] });
      queryClient.invalidateQueries({ queryKey: ["budget-metas", workshopId, mes] });
      toast.success("Lançamento removido!");
    },
    onError: (e) => toast.error("Erro ao remover: " + (e?.message || "tente novamente"))
  });

  // QA-DFC-09: salvarSaldoMutation removida — código morto. O card de saldo é somente leitura;
  // o saldo inicial é editado exclusivamente pelo ModalSaldoInicialDetalhado.

  // ── Cálculos em tempo real (Fase 5) ───────────────────────────
  const dreParaDFC = useMemo(() => mapDREtoDFC(lancamentosDRE), [lancamentosDRE]);
  const manuais = useMemo(() => manuaisDB.map((m) => ({ ...m, origem: "manual" })), [manuaisDB]);
  const todosItens = useMemo(() => [...dreParaDFC, ...manuais], [dreParaDFC, manuais]);

  // Cálculos memoizados por grupo para evitar re-cálculo desnecessário
  const itensPorGrupo = useMemo(() => ({
    operacional: todosItens.filter((i) => i.grupo === "operacional"),
    investimento: todosItens.filter((i) => i.grupo === "investimento"),
    financiamento: todosItens.filter((i) => i.grupo === "financiamento")
  }), [todosItens]);

  const calcFluxo = (itens) =>
  itens.reduce((s, i) => s + (i.tipo === "entrada" ? i.valor : -i.valor), 0);

  // BUG FIX #5: cálculos usam o valor confirmado do banco, não o input local (que pode estar sendo editado)
  // O input local só é sincronizado para exibição; o valor real é saldoInicialSalvo
  const saldoInicial = saldoInicialSalvo;
  const fluxoOp = useMemo(() => calcFluxo(itensPorGrupo.operacional), [itensPorGrupo.operacional]);
  const fluxoInv = useMemo(() => calcFluxo(itensPorGrupo.investimento), [itensPorGrupo.investimento]);
  const fluxoFin = useMemo(() => calcFluxo(itensPorGrupo.financiamento), [itensPorGrupo.financiamento]);
  const saldoFinal = saldoInicial + fluxoOp + fluxoInv + fluxoFin;

  // ── Filtros da lista (somente exibição — totais e composição usam todos os itens) ──
  const filtroAtivo = !!buscaDFC.trim() || statusDFCFiltro !== "todos" || tipoDFC !== "todos";
  const filtrosDFC = useMemo(
    () => ({ busca: buscaDFC, status: statusDFCFiltro, tipo: tipoDFC }),
    [buscaDFC, statusDFCFiltro, tipoDFC]
  );
  const itensFiltrados = useMemo(() => ({
    operacional:   filtrarItensDFC(itensPorGrupo.operacional, filtrosDFC),
    investimento:  filtrarItensDFC(itensPorGrupo.investimento, filtrosDFC),
    financiamento: filtrarItensDFC(itensPorGrupo.financiamento, filtrosDFC),
  }), [itensPorGrupo, filtrosDFC]);
  // Contadores dos chips: respeitam o filtro de tipo, mas não a busca
  const contadoresDFC = useMemo(() => {
    const base = [...itensPorGrupo.operacional, ...itensPorGrupo.investimento, ...itensPorGrupo.financiamento]
      .filter((i) => tipoDFC === "todos" || i.tipo === tipoDFC);
    return contarStatusDFC(base);
  }, [itensPorGrupo, tipoDFC]);
  const limparFiltrosDFC = () => { setBuscaDFC(""); setStatusDFCFiltro("todos"); setTipoDFC("todos"); };

  // ── Handlers ──────────────────────────────────────────────────
  // FLICKER FIX (Etapa 2): callbacks estáveis — LinhaItem (memo) não recebe
  // referências novas quando o DFC re-renderiza (ex: ao abrir/fechar modais)
  const abrirModal = useCallback((grupo, item = null) => {
    setGrupoModal(grupo);
    setLancamentoEdicao(item);
    setModalAberto(true);
  }, []);
  const handleEstornarConta = useCallback((conta, tipo) => {
    setContaParaEstornarDFC({ conta, tipo });
  }, []);
  const editarOperacional = useCallback((item) => abrirModal("operacional", item), [abrirModal]);
  const editarInvestimento = useCallback((item) => abrirModal("investimento", item), [abrirModal]);
  const editarFinanciamento = useCallback((item) => abrirModal("financiamento", item), [abrirModal]);

  const handleSalvarModal = (form) => {
    if (lancamentoEdicao?.id) {
      editarMutation.mutate({
        id: lancamentoEdicao.id,
        data: {
          ...form,
          // Limpar fonte_saida se for entrada
          fonte_saida: form.tipo === "entrada" ? null : form.fonte_saida
        }
      });
    } else {
      criarMutation.mutate({
        ...form,
        origem: "manual",
        // Limpar fonte_saida se for entrada
        fonte_saida: form.tipo === "entrada" ? null : form.fonte_saida
      });
    }
  };

  const deletarMutate = deletarMutation.mutate; // mutate é estável entre renders (React Query)
  // QA-DFC-07: confirmação antes de excluir lançamento manual
  const handleDelete = useCallback((item) => {
    if (!item.id) return;
    if (!window.confirm(`Excluir "${item.descricao || "lançamento"}"? Esta ação não pode ser desfeita.`)) return;
    deletarMutate(item.id);
  }, [deletarMutate]);

  const isLoading = isDRELoading || isManuaisLoading;

  if (isLoading && periodo === "mensal") {
    return <DFCSkeleton />;
  }

  // QA-DFC-06: erro explícito em vez de exibir "Nenhum lançamento no DRE" (mesmo padrão da Frente C3)
  if (periodo === "mensal" && (isDREError || isManuaisError)) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 border-2 border-dashed border-red-200 rounded-xl bg-red-50/40">
        <AlertCircle className="w-8 h-8 text-red-500" />
        <p className="text-sm font-medium text-red-700">Falha ao carregar o fluxo de caixa.</p>
        <p className="text-xs text-gray-500">Verifique a conexão e tente novamente.</p>
        <Button size="sm" variant="outline" onClick={() => { refetchDRE(); refetchManuais(); }}>
          <RefreshCw className="w-4 h-4 mr-1" /> Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toggle DFC vs Contas */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setShowContasTab(false)}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 transition-all cursor-pointer text-xs
            ${!showContasTab ?
          "bg-blue-50 border-blue-400 shadow-md" :
          "bg-white border-gray-200 hover:border-gray-300 hover:shadow"}`}>
          <span className="text-base">💵</span>
          <span className={`text-xs font-semibold ${!showContasTab ? "text-blue-700" : "text-gray-600"}`}>
            Fluxo de Caixa (DFC)
          </span>
        </button>
        <button
          onClick={() => setShowContasTab(true)}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 transition-all cursor-pointer
            ${showContasTab ?
          "bg-blue-50 border-blue-400 shadow-sm" :
          "bg-white border-gray-200 hover:border-gray-300"}`}>
          <span className="text-base">📋</span>
          <span className={`text-xs font-semibold ${showContasTab ? "text-blue-700" : "text-gray-600"}`}>
            Contas a Receber/Pagar
          </span>
        </button>
      </div>

      {/* VIEW: CONTAS */}
      {showContasTab &&
      <ContasReceberPagarTab workshopId={workshopId} mes={mes} />
      }

      {/* VIEW: DFC */}
      {!showContasTab && <>

      {/* Filtro de Período — sempre visível */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <FiltroPeriodo
            mes={mesAtual}
            ano={anoAtual}
            periodo={periodo}
            onMesChange={(novoMes) => {
              const novaData = `${anoAtual}-${novoMes}`;
              window.dispatchEvent(new CustomEvent('dfc-mudar-mes', { detail: { mes: novaData } }));
            }}
            onAnoChange={(novoAno) => {
              const novoAnoInt = parseInt(novoAno);
              setAno(novoAnoInt);
              // No modo mensal: recompõe o mes completo com novo ano e propaga ao pai
              if (periodo === "mensal") {
                const novaData = `${novoAnoInt}-${mesAtual}`;
                window.dispatchEvent(new CustomEvent('dfc-mudar-mes', { detail: { mes: novaData } }));
              }
            }}
            onPeriodoChange={(novoPeriodo) => setPeriodo(novoPeriodo)} />
          
      </div>

      {/* Modo Anual */}
      {periodo === "anual" &&
        <DFCAnualView dados={dadosAnuaisDFC} isLoading={isLoadingAnual} ano={ano} fmt={fmt} />
        }

      {/* Modo Mensal */}
      {periodo === "mensal" && <>

      {/* Vencimentos — card compacto de lembrete */}
      <VencimentosCard workshopId={workshopId} mes={mes} compact />

      {/* Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
        <strong>Como funciona:</strong> Dados do <span className="font-semibold">DRE Avançado</span> são importados automaticamente{" "}
        <Badge variant="outline" className="text-[10px] border-gray-300 text-gray-500 mx-1">DRE</Badge>.
        Complemente com o saldo inicial, empréstimos e recebimentos que o DRE não captura.
        {lancamentosDRE.length === 0 &&
            <span className="block mt-1 text-amber-700 font-medium">
            ⚠️ Nenhum lançamento no DRE Avançado para {mes}. Preencha a aba "DRE Avançado" primeiro.
          </span>
            }
      </div>

      {/* Card consolidado Saldo */}
      <SaldoConsolidadoCard
        saldoInicial={saldoInicialSalvo}
        saldoAtual={saldoFinal}
        mes={mes}
        fmt={fmt}
        onVerDetalhe={() => setModalSaldoDetalhadoAberto(true)}
      />

      {/* Transferências entre contas — sempre visível, independente da view selecionada */}
      <TransferenciasEntreContas workshopId={workshopId} mes={mes} />

      {/* Modal de estorno — modo Conta: disparado pelas linhas Operacional/Investimento/Financiamento */}
      {contaParaEstornarDFC && (
        <ModalEstornoLiquidacao
          aberto={!!contaParaEstornarDFC}
          onFechar={() => setContaParaEstornarDFC(null)}
          conta={contaParaEstornarDFC.conta}
          tipo={contaParaEstornarDFC.tipo}
          workshopId={workshopId}
          onSuccess={() => {
            setContaParaEstornarDFC(null);
            queryClient.invalidateQueries({ queryKey: ["dre-lancamentos-dfc", workshopId, mes] });
            // QA-DFC-08: desfazerLiquidacao altera o saldo das contas — card de saldo precisa refazer a leitura
            queryClient.invalidateQueries({ queryKey: ["dfc-saldo", workshopId, mes] });
            queryClient.invalidateQueries({ queryKey: ["saldo-inicial-fontes", workshopId, mes] });
            queryClient.invalidateQueries({ queryKey: ["dre-lancamentos", workshopId, mes] });
          }}
        />
      )}

      {/* Tabs de view */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          <button
              onClick={() => setView("grupos")}
              className={`text-xs px-3 py-2 rounded-md font-medium transition-all ${view === "grupos" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                
            🗂️ Por Grupo
          </button>
          <button
              onClick={() => setView("projecao")}
              className={`text-xs px-3 py-2 rounded-md font-medium transition-all ${view === "projecao" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                
            📅 Projeção
          </button>
        </div>

      {/* VIEW: PROJEÇÃO */}
      {view === "projecao" &&
          <ProjecaoCaixaView todosItens={todosItens} saldoInicial={saldoInicial} onMarcarPagamento={setItemPagamento} />
          }

      {/* VIEW: POR GRUPO — 3 Seções colapsáveis */}
      {view === "grupos" && <>
      <FiltrosDFC
              busca={buscaDFC} setBusca={setBuscaDFC}
              status={statusDFCFiltro} setStatus={setStatusDFCFiltro}
              tipo={tipoDFC} setTipo={setTipoDFC}
              contadores={contadoresDFC}
              ativo={filtroAtivo}
              onLimpar={limparFiltrosDFC} />
      <SecaoFluxoDFC
              titulo="Operacional"
              icone={<Wallet className="w-4 h-4" />}
              cor={{ border: "border-green-200", header: "bg-green-50 text-green-800" }}
              itens={itensFiltrados.operacional}
              itensTodos={itensPorGrupo.operacional}
              filtroAtivo={filtroAtivo}
              fluxo={fluxoOp}
              onAddManual={() => abrirModal("operacional")}
              onDelete={handleDelete}
              onEdit={editarOperacional}
              onMarcarPagamento={setItemPagamento}
              onEstornar={handleEstornarConta} />
            
      <SecaoFluxoDFC
              titulo="Investimento"
              icone={<Building2 className="w-4 h-4" />}
              cor={{ border: "border-blue-200", header: "bg-blue-50 text-blue-800" }}
              itens={itensFiltrados.investimento}
              itensTodos={itensPorGrupo.investimento}
              filtroAtivo={filtroAtivo}
              fluxo={fluxoInv}
              onAddManual={() => abrirModal("investimento")}
              onDelete={handleDelete}
              onEdit={editarInvestimento}
              onMarcarPagamento={setItemPagamento}
              onEstornar={handleEstornarConta} />
            
      <SecaoFluxoDFC
              titulo="Financiamento"
              icone={<Landmark className="w-4 h-4" />}
              cor={{ border: "border-purple-200", header: "bg-purple-50 text-purple-800" }}
              itens={itensFiltrados.financiamento}
              itensTodos={itensPorGrupo.financiamento}
              filtroAtivo={filtroAtivo}
              fluxo={fluxoFin}
              onAddManual={() => abrirModal("financiamento")}
              onDelete={handleDelete}
              onEdit={editarFinanciamento}
              onMarcarPagamento={setItemPagamento}
              onEstornar={handleEstornarConta} />

      {/* Composição do saldo — grade alinhada (rótulo em cima, valor em baixo, dígitos tabulares) */}
      <div className={`rounded-xl border shadow-sm overflow-hidden grid grid-cols-2 sm:grid-cols-5 ${saldoFinal >= 0 ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50"}`}>
        {[
          { label: "Saldo inicial", valor: saldoInicial, sinal: false },
          { label: "Operacional",   valor: fluxoOp,      sinal: true  },
          { label: "Investimento",  valor: fluxoInv,     sinal: true  },
          { label: "Financiamento", valor: fluxoFin,     sinal: true  },
        ].map((c) => (
          <div key={c.label} className="px-4 py-3 border-b sm:border-b-0 sm:border-r border-gray-200/70 text-right">
            <p className="text-[10px] uppercase tracking-wider text-gray-400">{c.label}</p>
            <p className={`text-sm font-semibold tabular-nums whitespace-nowrap ${
              !c.sinal ? "text-gray-700" : c.valor >= 0 ? "text-emerald-700" : "text-red-600"
            }`}>
              {c.sinal ? (c.valor >= 0 ? "+ " : "− ") : ""}{fmt(c.sinal ? Math.abs(c.valor) : c.valor)}
            </p>
          </div>
        ))}
        <div className="px-4 py-3 text-right col-span-2 sm:col-span-1 bg-white/60">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Saldo final</p>
          <p className={`text-base font-bold tabular-nums whitespace-nowrap ${saldoFinal >= 0 ? "text-emerald-700" : "text-red-700"}`}>
            {fmt(saldoFinal)}
          </p>
        </div>
      </div>

      {/* Gráfico Waterfall */}
      <Card className="border border-gray-200">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">📊 Waterfall — Composição do Saldo</p>
          <GraficoWaterfall
                  saldoInicial={saldoInicial}
                  fluxoOp={fluxoOp}
                  fluxoInv={fluxoInv}
                  fluxoFin={fluxoFin}
                  saldoFinal={saldoFinal} />
                
          <div className="flex items-center gap-4 mt-2 justify-center text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500 inline-block" /> Saldo</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Positivo</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> Negativo</span>
          </div>
        </CardContent>
      </Card>
      </>}
      </>}

      {/* Modals — sempre visíveis */}
      <ModalLancamento
          aberto={modalAberto}
          onFechar={() => {setModalAberto(false);setLancamentoEdicao(null);}}
          onSalvar={handleSalvarModal}
          isSaving={criarMutation.isPending || editarMutation.isPending}
          lancamentoEdicao={lancamentoEdicao}
          grupoInicial={grupoModal} />
        

      {/* Modal liquidação DRE — abre ModalRegistrarPagamento ou ModalRegistrarRecebimento */}
      {/* FLICKER FIX: item._conta já vem da query → modal abre direto, sem Dialog de
          loading intermediário. O fechamento animado é feito pelo próprio modal
          (handleFechar); o onSalvo apenas invalida as queries. */}
      <ModalLiquidacaoDRE
          key={itemPagamento?.id || 'fechado'}
          item={itemPagamento}
          workshopId={workshopId}
          onFechar={() => setItemPagamento(null)}
          onSalvo={() => {
            queryClient.invalidateQueries({ queryKey: ["dre-lancamentos-dfc", workshopId, mes] });
            queryClient.invalidateQueries({ queryKey: ["dre-lancamentos", workshopId, mes] });
            queryClient.invalidateQueries({ queryKey: ["contas-receber", workshopId] });
            queryClient.invalidateQueries({ queryKey: ["contas-pagar", workshopId] });
            // QA-DFC-08: registrarLiquidacao altera o saldo da fonte selecionada
            queryClient.invalidateQueries({ queryKey: ["dfc-saldo", workshopId, mes] });
            queryClient.invalidateQueries({ queryKey: ["saldo-inicial-fontes", workshopId, mes] });
          }} />
        

      {/* Modal saldo inicial detalhado */}
      <ModalSaldoInicialDetalhado
          aberto={modalSaldoDetalhadoAberto}
          onFechar={() => setModalSaldoDetalhadoAberto(false)}
          workshopId={workshopId}
          mes={mes} />
        
      </>}
    </div>);

}