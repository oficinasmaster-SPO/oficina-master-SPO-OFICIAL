import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  ChevronDown, ChevronRight, Plus, Trash2, Wallet, TrendingUp, TrendingDown, Building2, Landmark
} from "lucide-react";

const fmt = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

// ─── Seção colapsável ──────────────────────────────────────────────
function SecaoFluxo({ titulo, icone, cor, itens, fluxo, onAddManual, onDelete }) {
  const [aberta, setAberta] = useState(true);

  const entradas = itens.filter(i => i.tipo === "entrada");
  const saidas = itens.filter(i => i.tipo === "saida");

  return (
    <div className={`border-2 rounded-xl overflow-hidden ${cor.border}`}>
      {/* Header colapsável */}
      <button
        onClick={() => setAberta(a => !a)}
        className={`w-full flex items-center justify-between px-4 py-3 ${cor.header} text-left`}
      >
        <div className="flex items-center gap-2 font-semibold text-sm">
          {icone}
          {titulo}
          <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${fluxo >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {fluxo >= 0 ? '+' : ''}{fmt(fluxo)}
          </span>
        </div>
        {aberta ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {aberta && (
        <div className="p-4 space-y-3 bg-white">
          {/* Entradas */}
          {entradas.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-green-600 uppercase mb-1">Entradas</p>
              <div className="space-y-1">
                {entradas.map((item, i) => (
                  <LinhaItem key={i} item={item} onDelete={onDelete} />
                ))}
              </div>
            </div>
          )}

          {/* Saídas */}
          {saidas.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-600 uppercase mb-1">Saídas</p>
              <div className="space-y-1">
                {saidas.map((item, i) => (
                  <LinhaItem key={i} item={item} onDelete={onDelete} />
                ))}
              </div>
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

// ─── Linha de item ─────────────────────────────────────────────────
function LinhaItem({ item, onDelete }) {
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
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-sm font-semibold ${item.tipo === "entrada" ? "text-green-700" : "text-red-600"}`}>
          {item.tipo === "entrada" ? "+" : "-"}{fmt(item.valor)}
        </span>
        {item.origem === "manual" && onDelete && (
          <button
            onClick={() => onDelete(item)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Modal de novo lançamento ──────────────────────────────────────
function ModalNovoLancamento({ aberto, onFechar, onSalvar, grupoInicial }) {
  const [form, setForm] = useState({
    grupo: grupoInicial || "operacional",
    tipo: "saida",
    descricao: "",
    valor: "",
  });

  const handleSalvar = () => {
    if (!form.valor || !form.descricao) return;
    onSalvar({ ...form, valor: parseFloat(form.valor), origem: "manual" });
    setForm({ grupo: grupoInicial || "operacional", tipo: "saida", descricao: "", valor: "" });
    onFechar();
  };

  return (
    <Dialog open={aberto} onOpenChange={onFechar}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Lançamento Manual</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Grupo</Label>
            <Select value={form.grupo} onValueChange={v => setForm(f => ({ ...f, grupo: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="operacional">🟢 Operacional</SelectItem>
                <SelectItem value="investimento">🔵 Investimento</SelectItem>
                <SelectItem value="financiamento">🟣 Financiamento</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
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
          <Button onClick={handleSalvar} disabled={!form.descricao || !form.valor}>
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Componente principal ──────────────────────────────────────────
export default function DFCTab({ workshopId, mes, lancamentosDRE = [] }) {
  const [saldoInicial, setSaldoInicial] = useState(0);
  const [manuais, setManuais] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [grupoModal, setGrupoModal] = useState("operacional");

  // Mapeamento DRE → DFC automático
  const dreParaDFC = (lancamentosDRE || []).map(l => {
    let grupo = "operacional";
    let tipo = l.tipo === "receita" ? "entrada" : "saida";

    if (["financeiro"].includes(l.categoria) &&
        ["Financiamento (veículo/imóvel)", "Consórcio", "Parcelamento de equipamento"].includes(l.subcategoria)) {
      grupo = "financiamento";
    } else if (["manutencao"].includes(l.categoria) && l.subcategoria?.includes("equipamento")) {
      grupo = "investimento";
    } else if (["pecas_estoque"].includes(l.categoria)) {
      grupo = "operacional";
    }

    return {
      descricao: l.descricao || l.subcategoria || l.categoria,
      valor: l.valor,
      tipo,
      grupo,
      origem: "dre_automatico",
    };
  });

  const todosItens = [...dreParaDFC, ...manuais];

  const itensPorGrupo = (grupo) => todosItens.filter(i => i.grupo === grupo);

  const fluxoGrupo = (grupo) => {
    const itens = itensPorGrupo(grupo);
    return itens.reduce((s, i) => s + (i.tipo === "entrada" ? i.valor : -i.valor), 0);
  };

  const fluxoOp = fluxoGrupo("operacional");
  const fluxoInv = fluxoGrupo("investimento");
  const fluxoFin = fluxoGrupo("financiamento");
  const saldoFinal = saldoInicial + fluxoOp + fluxoInv + fluxoFin;

  const abrirModal = (grupo) => {
    setGrupoModal(grupo);
    setModalAberto(true);
  };

  const adicionarManual = (item) => {
    setManuais(m => [...m, item]);
  };

  const deletarManual = (item) => {
    setManuais(m => m.filter(i => i !== item));
  };

  return (
    <div className="space-y-6">
      {/* Aviso informativo */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
        <strong>Como funciona:</strong> Os dados do <span className="font-semibold">DRE Avançado</span> são importados automaticamente (badge <Badge variant="outline" className="text-[10px] border-gray-300 text-gray-500 mx-1">DRE</Badge>). Adicione manualmente apenas o que o DRE não captura: saldo inicial, empréstimos recebidos, recebimentos parcelados de meses anteriores.
      </div>

      {/* Saldo inicial */}
      <Card className="border-2 border-gray-200">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-700">Saldo Inicial do Mês</p>
              <p className="text-xs text-gray-500">Quanto havia no caixa/banco em 01/{mes}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">R$</span>
              <Input
                type="number"
                step="0.01"
                value={saldoInicial}
                onChange={e => setSaldoInicial(parseFloat(e.target.value) || 0)}
                className="w-40 text-right font-semibold"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3 Seções */}
      <SecaoFluxo
        titulo="Operacional"
        icone={<Wallet className="w-4 h-4" />}
        cor={{ border: "border-green-200", header: "bg-green-50 text-green-800" }}
        itens={itensPorGrupo("operacional")}
        fluxo={fluxoOp}
        onAddManual={() => abrirModal("operacional")}
        onDelete={deletarManual}
      />
      <SecaoFluxo
        titulo="Investimento"
        icone={<Building2 className="w-4 h-4" />}
        cor={{ border: "border-blue-200", header: "bg-blue-50 text-blue-800" }}
        itens={itensPorGrupo("investimento")}
        fluxo={fluxoInv}
        onAddManual={() => abrirModal("investimento")}
        onDelete={deletarManual}
      />
      <SecaoFluxo
        titulo="Financiamento"
        icone={<Landmark className="w-4 h-4" />}
        cor={{ border: "border-purple-200", header: "bg-purple-50 text-purple-800" }}
        itens={itensPorGrupo("financiamento")}
        fluxo={fluxoFin}
        onAddManual={() => abrirModal("financiamento")}
        onDelete={deletarManual}
      />

      {/* Saldo Final */}
      <Card className={`border-2 ${saldoFinal >= 0 ? "border-emerald-400 bg-emerald-50" : "border-red-400 bg-red-50"}`}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-700">Saldo Final do Mês</p>
              <p className="text-xs text-gray-500">
                {fmt(saldoInicial)} (inicial) {fluxoOp >= 0 ? "+" : ""}{fmt(fluxoOp)} (op) {fluxoInv >= 0 ? "+" : ""}{fmt(fluxoInv)} (inv) {fluxoFin >= 0 ? "+" : ""}{fmt(fluxoFin)} (fin)
              </p>
            </div>
            <div className="flex items-center gap-2">
              {saldoFinal >= 0
                ? <TrendingUp className="w-6 h-6 text-emerald-600" />
                : <TrendingDown className="w-6 h-6 text-red-600" />}
              <p className={`text-3xl font-bold ${saldoFinal >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                {fmt(saldoFinal)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      <ModalNovoLancamento
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        onSalvar={adicionarManual}
        grupoInicial={grupoModal}
      />
    </div>
  );
}