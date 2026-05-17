import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  ChevronDown, ChevronRight, Plus, Trash2, Pencil, Wallet,
  TrendingUp, TrendingDown, Building2, Landmark, Loader2
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ReferenceLine
} from "recharts";
import { toast } from "sonner";
import { mapDREtoDFC } from "./mapDREtoDFC";

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
      {d.saldoApos != null && (
        <p className="text-gray-500 text-xs mt-1">Saldo após: {fmt(d.saldoApos)}</p>
      )}
    </div>
  );
}

// ─── Gráfico Waterfall ─────────────────────────────────────────────
function GraficoWaterfall({ saldoInicial, fluxoOp, fluxoInv, fluxoFin, saldoFinal }) {
  const barras = [
    { label: "Saldo Inicial", valor: saldoInicial, tipo: "saldo" },
    { label: "Operacional",   valor: fluxoOp,      tipo: fluxoOp  >= 0 ? "positivo" : "negativo" },
    { label: "Investimento",  valor: fluxoInv,     tipo: fluxoInv >= 0 ? "positivo" : "negativo" },
    { label: "Financiamento", valor: fluxoFin,     tipo: fluxoFin >= 0 ? "positivo" : "negativo" },
    { label: "Saldo Final",   valor: saldoFinal,   tipo: "saldo" },
  ];

  let acumulado = 0;
  const dados = barras.map((b, i) => {
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

  const cores = { positivo: "#10b981", negativo: "#ef4444", saldo: "#3b82f6" };

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 10 }} width={90} />
          <Tooltip content={<WaterfallTooltip />} />
          <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={1} />
          <Bar dataKey="base" stackId="w" fill="transparent" />
          <Bar dataKey="altura" stackId="w" radius={[4, 4, 0, 0]}>
            {dados.map((d, i) => (
              <Cell key={i} fill={cores[d.tipo]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Modal CRUD lançamento manual ─────────────────────────────────
function ModalLancamento({ aberto, onFechar, onSalvar, isSaving, lancamentoEdicao, grupoInicial }) {
  const [form, setForm] = useState({ grupo: "operacional", tipo: "entrada", descricao: "", valor: "" });

  useEffect(() => {
    if (aberto) {
      if (lancamentoEdicao) {
        setForm({
          grupo: lancamentoEdicao.grupo,
          tipo: lancamentoEdicao.tipo,
          descricao: lancamentoEdicao.descricao,
          valor: String(lancamentoEdicao.valor)
        });
      } else {
        setForm({ grupo: grupoInicial || "operacional", tipo: "entrada", descricao: "", valor: "" });
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
            <Select value={form.grupo || ""} onValueChange={v => setForm(f => ({ ...f, grupo: v }))}>
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
            <Select value={form.tipo || "entrada"} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
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
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
            />
          </div>
          <div>
            <Label>Valor (R$)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={form.valor}
              onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={!form.descricao || !form.valor || isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            {lancamentoEdicao ? "Salvar alterações" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Linha de item ─────────────────────────────────────────────────
function LinhaItem({ item, onDelete, onEdit }) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 group">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Badge
          variant="outline"
          className={`text-[10px] shrink-0 ${item.origem === "manual"
            ? "border-blue-300 text-blue-600"
            : "border-gray-300 text-gray-500"}`}
        >
          {item.origem === "manual" ? "Manual" : "DRE"}
        </Badge>
        <span className="text-sm text-gray-700 truncate">{item.descricao || "—"}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className={`text-sm font-semibold mr-2 ${item.tipo === "entrada" ? "text-green-700" : "text-red-600"}`}>
          {item.tipo === "entrada" ? "+" : "-"}{fmt(item.valor)}
        </span>
        {item.origem === "manual" && (
          <>
            <button
              onClick={() => onEdit(item)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-blue-500 p-0.5"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(item)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-0.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Seção colapsável ──────────────────────────────────────────────
function SecaoFluxo({ titulo, icone, cor, itens, fluxo, onAddManual, onDelete, onEdit }) {
  const [aberta, setAberta] = useState(true);
  const entradas = itens.filter(i => i.tipo === "entrada");
  const saidas   = itens.filter(i => i.tipo === "saida");

  return (
    <div className={`border-2 rounded-xl overflow-hidden ${cor.border}`}>
      <button
        onClick={() => setAberta(a => !a)}
        className={`w-full flex items-center justify-between px-4 py-3 ${cor.header} text-left`}
      >
        <div className="flex items-center gap-2 font-semibold text-sm">
          {icone}
          {titulo}
          <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${fluxo >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {fluxo >= 0 ? "+" : ""}{fmt(fluxo)}
          </span>
        </div>
        {aberta ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {aberta && (
        <div className="p-4 space-y-3 bg-white">
          {entradas.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-green-600 uppercase mb-1">Entradas</p>
              {entradas.map((item, i) => (
                <LinhaItem key={item.id || i} item={item} onDelete={onDelete} onEdit={onEdit} />
              ))}
            </div>
          )}
          {saidas.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-600 uppercase mb-1">Saídas</p>
              {saidas.map((item, i) => (
                <LinhaItem key={item.id || i} item={item} onDelete={onDelete} onEdit={onEdit} />
              ))}
            </div>
          )}
          {itens.length === 0 && (
            <p className="text-sm text-gray-400 italic text-center py-2">Nenhum lançamento neste grupo</p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onAddManual}
            className="w-full border-dashed text-gray-500 hover:text-gray-700 mt-1"
          >
            <Plus className="w-3 h-3 mr-1" /> Adicionar lançamento manual
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────
export default function DFCTab({ workshopId, mes }) {
  const queryClient = useQueryClient();
  const [modalAberto, setModalAberto] = useState(false);
  const [grupoModal, setGrupoModal] = useState("operacional");
  const [lancamentoEdicao, setLancamentoEdicao] = useState(null);
  const [saldoInicialInput, setSaldoInicialInput] = useState("0");

  // ── Buscar DRELancamentos → mapeados automaticamente (Fase 3) ──
  const { data: lancamentosDRE = [], isLoading: isDRELoading, refetch: refetchDRE } = useQuery({
    queryKey: ["dre-lancamentos-dfc", workshopId, mes],
    queryFn: () => base44.entities.DRELancamento.filter({ workshop_id: workshopId, mes }),
    enabled: !!workshopId && !!mes,
    staleTime: 30_000,
  });

  // BUG FIX #1: Real-time subscription para escutar novos lançamentos do DRE Avançado
  useEffect(() => {
    if (!workshopId || !mes) return;

    const unsubscribe = base44.entities.DRELancamento.subscribe((event) => {
      if (event.data?.workshop_id === workshopId && event.data?.mes === mes) {
        if (event.type === 'create' || event.type === 'delete') {
          refetchDRE();
        }
      }
    });

    // Event listener para cross-tab sync
    const handleDREChange = () => refetchDRE();
    window.addEventListener('dre-lancamento-criado', handleDREChange);

    return () => {
      unsubscribe();
      window.removeEventListener('dre-lancamento-criado', handleDREChange);
    };
  }, [workshopId, mes, refetchDRE]);

  // ── Buscar lançamentos manuais do DFC ──────────────────────────
  const { data: manuaisDB = [], isLoading: isManuaisLoading } = useQuery({
    queryKey: ["dfc-manuais", workshopId, mes],
    queryFn: () => base44.entities.DFCLancamento.filter({ workshop_id: workshopId, mes, origem: "manual" }),
    enabled: !!workshopId && !!mes,
  });

  // ── Buscar saldo inicial salvo (Fase 5) ────────────────────────
  const { data: saldoInicialDB = [] } = useQuery({
    queryKey: ["dfc-saldo", workshopId, mes],
    queryFn: () => base44.entities.DFCLancamento.filter({ workshop_id: workshopId, mes, grupo: "saldo_inicial" }),
    enabled: !!workshopId && !!mes,
  });

  const saldoInicialRecord = saldoInicialDB[0] || null;
  const saldoInicialSalvo  = saldoInicialRecord?.saldo_inicial ?? 0;

  // Sincronizar input local com valor do banco
  useEffect(() => {
    setSaldoInicialInput(String(saldoInicialSalvo));
  }, [saldoInicialSalvo]);

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
  });

  const deletarMutation = useMutation({
    mutationFn: (id) => base44.entities.DFCLancamento.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dfc-manuais", workshopId, mes] });
      queryClient.invalidateQueries({ queryKey: ["budget-metas", workshopId, mes] });
      toast.success("Lançamento removido!");
    },
  });

  const salvarSaldoMutation = useMutation({
    mutationFn: (valor) => {
      if (saldoInicialRecord) {
        return base44.entities.DFCLancamento.update(saldoInicialRecord.id, { saldo_inicial: valor });
      }
      return base44.entities.DFCLancamento.create({
        workshop_id: workshopId,
        mes,
        grupo: "saldo_inicial",
        tipo: "entrada",
        descricao: "Saldo inicial do mês",
        valor: 0,
        origem: "manual",
        saldo_inicial: valor,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dfc-saldo", workshopId, mes] }),
  });

  // ── Cálculos em tempo real (Fase 5) ───────────────────────────
  const dreParaDFC = useMemo(() => mapDREtoDFC(lancamentosDRE), [lancamentosDRE]);
  const manuais    = useMemo(() => manuaisDB.map(m => ({ ...m, origem: "manual" })), [manuaisDB]);
  const todosItens = useMemo(() => [...dreParaDFC, ...manuais], [dreParaDFC, manuais]);

  // Cálculos memoizados por grupo para evitar re-cálculo desnecessário
  const itensPorGrupo = useMemo(() => ({
    operacional:  todosItens.filter(i => i.grupo === "operacional"),
    investimento: todosItens.filter(i => i.grupo === "investimento"),
    financiamento: todosItens.filter(i => i.grupo === "financiamento"),
  }), [todosItens]);

  const calcFluxo = (itens) =>
    itens.reduce((s, i) => s + (i.tipo === "entrada" ? i.valor : -i.valor), 0);

  const saldoInicial = parseFloat(saldoInicialInput) || 0;
  const fluxoOp  = useMemo(() => calcFluxo(itensPorGrupo.operacional),  [itensPorGrupo.operacional]);
  const fluxoInv = useMemo(() => calcFluxo(itensPorGrupo.investimento), [itensPorGrupo.investimento]);
  const fluxoFin = useMemo(() => calcFluxo(itensPorGrupo.financiamento),[itensPorGrupo.financiamento]);
  const saldoFinal = saldoInicial + fluxoOp + fluxoInv + fluxoFin;

  // ── Handlers ──────────────────────────────────────────────────
  const abrirModal = (grupo, item = null) => {
    setGrupoModal(grupo);
    setLancamentoEdicao(item);
    setModalAberto(true);
  };

  const handleSalvarModal = (form) => {
    if (lancamentoEdicao?.id) {
      editarMutation.mutate({ id: lancamentoEdicao.id, data: form });
    } else {
      criarMutation.mutate({ ...form, origem: "manual" });
    }
  };

  const handleDelete = (item) => { if (item.id) deletarMutation.mutate(item.id); };

  const handleSaldoBlur = () => {
    const valor = parseFloat(parseFloat(saldoInicialInput || "0").toFixed(2));
    const salvo = parseFloat(parseFloat(saldoInicialSalvo || 0).toFixed(2));
    if (valor !== salvo) salvarSaldoMutation.mutate(valor);
  };

  const isLoading = isDRELoading || isManuaisLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
        <span className="text-gray-500 text-sm">Carregando fluxo de caixa...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
        <strong>Como funciona:</strong> Dados do <span className="font-semibold">DRE Avançado</span> são importados automaticamente{" "}
        <Badge variant="outline" className="text-[10px] border-gray-300 text-gray-500 mx-1">DRE</Badge>.
        Complemente com o saldo inicial, empréstimos e recebimentos que o DRE não captura.
        {lancamentosDRE.length === 0 && (
          <span className="block mt-1 text-amber-700 font-medium">
            ⚠️ Nenhum lançamento no DRE Avançado para {mes}. Preencha a aba "DRE Avançado" primeiro.
          </span>
        )}
      </div>

      {/* Saldo Inicial — salvo no banco ao sair do campo */}
      <Card className="border-2 border-gray-200">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-gray-700">Saldo Inicial do Mês</p>
              <p className="text-xs text-gray-500">Quanto havia no caixa/banco em 01/{mes}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">R$</span>
              <Input
                type="number"
                step="0.01"
                value={saldoInicialInput}
                onChange={e => setSaldoInicialInput(e.target.value)}
                onBlur={handleSaldoBlur}
                className="w-44 text-right font-semibold"
              />
              {salvarSaldoMutation.isPending && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3 Seções colapsáveis */}
      <SecaoFluxo
        titulo="Operacional"
        icone={<Wallet className="w-4 h-4" />}
        cor={{ border: "border-green-200", header: "bg-green-50 text-green-800" }}
        itens={itensPorGrupo.operacional}
        fluxo={fluxoOp}
        onAddManual={() => abrirModal("operacional")}
        onDelete={handleDelete}
        onEdit={(item) => abrirModal("operacional", item)}
      />
      <SecaoFluxo
        titulo="Investimento"
        icone={<Building2 className="w-4 h-4" />}
        cor={{ border: "border-blue-200", header: "bg-blue-50 text-blue-800" }}
        itens={itensPorGrupo.investimento}
        fluxo={fluxoInv}
        onAddManual={() => abrirModal("investimento")}
        onDelete={handleDelete}
        onEdit={(item) => abrirModal("investimento", item)}
      />
      <SecaoFluxo
        titulo="Financiamento"
        icone={<Landmark className="w-4 h-4" />}
        cor={{ border: "border-purple-200", header: "bg-purple-50 text-purple-800" }}
        itens={itensPorGrupo.financiamento}
        fluxo={fluxoFin}
        onAddManual={() => abrirModal("financiamento")}
        onDelete={handleDelete}
        onEdit={(item) => abrirModal("financiamento", item)}
      />

      {/* Saldo Final — indicador verde/vermelho em tempo real */}
      <Card className={`border-2 ${saldoFinal >= 0 ? "border-emerald-400 bg-emerald-50" : "border-red-400 bg-red-50"}`}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-700">Saldo Final do Mês</p>
              <p className="text-xs text-gray-500">
                {fmt(saldoInicial)} (ini){" "}
                {fluxoOp  >= 0 ? "+" : ""}{fmt(fluxoOp)} (op){" "}
                {fluxoInv >= 0 ? "+" : ""}{fmt(fluxoInv)} (inv){" "}
                {fluxoFin >= 0 ? "+" : ""}{fmt(fluxoFin)} (fin)
              </p>
            </div>
            <div className="flex items-center gap-2">
              {saldoFinal >= 0
                ? <TrendingUp  className="w-6 h-6 text-emerald-600" />
                : <TrendingDown className="w-6 h-6 text-red-600" />}
              <p className={`text-3xl font-bold ${saldoFinal >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                {fmt(saldoFinal)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico Waterfall */}
      <Card className="border border-gray-200">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">📊 Waterfall — Composição do Saldo</p>
          <GraficoWaterfall
            saldoInicial={saldoInicial}
            fluxoOp={fluxoOp}
            fluxoInv={fluxoInv}
            fluxoFin={fluxoFin}
            saldoFinal={saldoFinal}
          />
          <div className="flex items-center gap-4 mt-2 justify-center text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500 inline-block" /> Saldo</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Positivo</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> Negativo</span>
          </div>
        </CardContent>
      </Card>

      {/* Modal CRUD */}
      <ModalLancamento
        aberto={modalAberto}
        onFechar={() => { setModalAberto(false); setLancamentoEdicao(null); }}
        onSalvar={handleSalvarModal}
        isSaving={criarMutation.isPending || editarMutation.isPending}
        lancamentoEdicao={lancamentoEdicao}
        grupoInicial={grupoModal}
      />
    </div>
  );
}