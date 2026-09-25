/**
 * DFCListaFluxo — lista operacional do DFC (UI/UX para BPO)
 *
 * Exporta:
 *   SecaoFluxoDFC   — seção colapsável por grupo (Operacional/Investimento/Financiamento)
 *   FiltrosDFC      — barra de busca + chips de status + filtro entrada/saída
 *   filtrarItensDFC — filtro client-side (sem request extra)
 *   contarStatusDFC — contadores dos chips
 *   DFCSkeleton     — skeleton de carregamento da aba
 *
 * Regras de exibição:
 *   - Totais do cabeçalho da seção usam TODOS os itens do grupo (não mudam com o filtro),
 *     para a composição do saldo continuar correta. O filtro só esconde linhas.
 *   - Valores alinhados em coluna fixa, fonte tabular (dígitos com mesma largura).
 */
import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { hojeLocal } from "@/components/utils/dataValor";
import {
  ChevronDown, ChevronRight, Trash2, Pencil, RotateCcw, Search,
  X as XIcon, CheckCircle2
} from "lucide-react";

// ─── Utilitários ──────────────────────────────────────────────────────────────
const fmt = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const fmtData = (d) => {
  if (!d) return null;
  const [, m, dia] = d.split("-");
  return `${dia}/${m}`;
};

// Data local — toISOString() usa UTC e vira o dia depois das 21h no Brasil
const hojeISO = hojeLocal;

/** Status operacional do item — mesma precedência do antigo StatusPagamento. */
export function statusDFC(item) {
  if (item.origem === "manual") return "manual";
  if (item.data_pagamento && item.status_conta !== "parcial") return "pago";
  if (item.status_conta === "parcial") return "parcial";
  if (item.data_vencimento && item.data_vencimento < hojeISO()) return "vencido";
  return "pendente";
}

const STATUS_UI = {
  pago:     { bar: "bg-emerald-400", badge: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: "✅" },
  parcial:  { bar: "bg-yellow-400",  badge: "text-yellow-700 bg-yellow-50 border-yellow-300",   icon: "◑" },
  vencido:  { bar: "bg-red-400",     badge: "text-red-700 bg-red-50 border-red-200",             icon: "⚠️" },
  pendente: { bar: "bg-amber-300",   badge: "text-amber-700 bg-amber-50 border-amber-200",       icon: "🕐" },
  manual:   { bar: "bg-blue-300",    badge: "",                                                  icon: "" },
};

function textoStatus(item, status) {
  if (status === "pago")    return `pago ${fmtData(item.data_pagamento) || ""}`.trim();
  if (status === "parcial") return item.data_vencimento ? `parcial · vence ${fmtData(item.data_vencimento)}` : "parcial";
  if (status === "vencido") return `venceu ${fmtData(item.data_vencimento)}`;
  if (status === "pendente") return item.data_vencimento ? `vence ${fmtData(item.data_vencimento)}` : "sem vencimento";
  return null;
}

function contraparte(item) {
  return item._conta?.fornecedor_nome || item._conta?.cliente_nome || null;
}

// ─── Filtro + contadores ──────────────────────────────────────────────────────
export function filtrarItensDFC(itens, { busca = "", status = "todos", tipo = "todos" }) {
  const termo = busca.trim().toLowerCase();
  return itens.filter((i) => {
    if (tipo !== "todos" && i.tipo !== tipo) return false;

    const s = statusDFC(i);
    if (status === "pendentes" && !["pendente", "vencido", "parcial"].includes(s)) return false;
    if (status === "vencidos"  && s !== "vencido") return false;
    if (status === "pagos"     && s !== "pago") return false;

    if (termo) {
      const alvo = `${i.descricao || ""} ${contraparte(i) || ""}`.toLowerCase();
      if (!alvo.includes(termo)) return false;
    }
    return true;
  });
}

export function contarStatusDFC(itens) {
  const c = { todos: itens.length, pendentes: 0, vencidos: 0, pagos: 0 };
  for (const i of itens) {
    const s = statusDFC(i);
    if (s === "pago") c.pagos += 1;
    if (s === "vencido") c.vencidos += 1;
    if (s === "pendente" || s === "vencido" || s === "parcial") c.pendentes += 1;
  }
  return c;
}

// ─── Barra de filtros ─────────────────────────────────────────────────────────
export function FiltrosDFC({ busca, setBusca, status, setStatus, tipo, setTipo, contadores, ativo, onLimpar }) {
  const chips = [
    { key: "todos",     label: "Todos",     cor: "gray"  },
    { key: "pendentes", label: "Pendentes", cor: "amber" },
    { key: "vencidos",  label: "Vencidos",  cor: "red"   },
    { key: "pagos",     label: "Pagos",     cor: "green" },
  ];
  const cores = {
    gray:  { base: "border-gray-200 text-gray-600",   on: "bg-gray-800 border-gray-800 text-white" },
    amber: { base: "border-amber-200 text-amber-700", on: "bg-amber-500 border-amber-500 text-white" },
    red:   { base: "border-red-200 text-red-700",     on: "bg-red-600 border-red-600 text-white" },
    green: { base: "border-green-200 text-green-700", on: "bg-green-600 border-green-600 text-white" },
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-3 space-y-2">
      <div className="flex flex-col lg:flex-row gap-2">
        {/* Busca */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por descrição, fornecedor ou cliente..."
            className="w-full text-xs pl-8 pr-8 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder:text-gray-400"
          />
          {busca && (
            <button onClick={() => setBusca("")} title="Limpar busca"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <XIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tipo: entradas / saídas */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 shrink-0">
          {[
            { key: "todos",   label: "Tudo" },
            { key: "entrada", label: "↑ Entradas" },
            { key: "saida",   label: "↓ Saídas" },
          ].map((t) => (
            <button key={t.key} onClick={() => setTipo(t.key)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-all ${
                tipo === t.key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chips de status */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {chips.map(({ key, label, cor }) => {
          const on = status === key;
          const count = contadores[key] ?? 0;
          if (key === "vencidos" && count === 0 && !on) return null;
          return (
            <button key={key} onClick={() => setStatus(key)}
              className={`flex items-center gap-1 text-[11px] font-medium border rounded-full px-2.5 py-1 transition-all ${
                on ? cores[cor].on : `${cores[cor].base} bg-white hover:bg-gray-50`
              }`}>
              {label}
              <span className={`text-[10px] font-bold px-1.5 rounded-full tabular-nums ${on ? "bg-white/20" : "bg-gray-100 text-gray-500"}`}>
                {count}
              </span>
            </button>
          );
        })}
        {ativo && (
          <button onClick={onLimpar} className="ml-auto text-[11px] text-blue-600 hover:underline">
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Linha ────────────────────────────────────────────────────────────────────
// Grid fixo: [barra] [descrição/meta] [valor] [ações] — o valor fica sempre na mesma coluna.
const GRID_LINHA = "grid grid-cols-[4px_minmax(0,1fr)_7.5rem_4.5rem] sm:grid-cols-[4px_minmax(0,1fr)_9rem_5rem] items-center gap-3";

const LinhaItemDFC = React.memo(function LinhaItemDFC({ item, onDelete, onEdit, onMarcarPagamento, onEstornar }) {
  const status = statusDFC(item);
  const ui = STATUS_UI[status];
  const isManual = item.origem === "manual";
  // Conta quitada não reabre a liquidação (evita pagamento duplicado — QA-DFC-04)
  const podeBaixar = !isManual && !!item.id && item.status_conta !== "pago";
  const temBaixa = !!(item.data_pagamento && item._conta &&
    (item.status_conta === "pago" || item.status_conta === "parcial"));
  const nomeContraparte = contraparte(item);
  const txtStatus = textoStatus(item, status);

  return (
    <div
      onClick={() => podeBaixar && onMarcarPagamento(item)}
      title={podeBaixar ? "Clique para registrar a baixa" : undefined}
      className={`group ${GRID_LINHA} px-3 py-2.5 border-b border-gray-100 last:border-b-0 transition-colors ${
        podeBaixar ? "cursor-pointer hover:bg-blue-50/40" : "hover:bg-gray-50"
      }`}
    >
      <span className={`self-stretch rounded-full ${ui.bar}`} />

      {/* Descrição + meta */}
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{item.descricao || "—"}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-[11px] text-gray-400">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${
            isManual ? "border-blue-300 text-blue-600" : "border-gray-300 text-gray-500"
          }`}>
            {isManual ? "Manual" : "DRE"}
          </Badge>
          {nomeContraparte && <span className="truncate max-w-[14rem]">{nomeContraparte}</span>}
          {txtStatus && (
            <span className={`inline-flex items-center gap-1 font-medium border rounded px-1.5 py-0 ${ui.badge}`}>
              {ui.icon} {txtStatus}
            </span>
          )}
        </div>
      </div>

      {/* Valor — coluna fixa, dígitos tabulares */}
      <span className={`text-sm font-semibold text-right tabular-nums whitespace-nowrap ${
        item.tipo === "entrada" ? "text-emerald-700" : "text-red-600"
      }`}>
        {item.tipo === "entrada" ? "+ " : "− "}{fmt(item.valor)}
      </span>

      {/* Ações — coluna fixa */}
      <div className="flex items-center justify-end gap-0.5">
        {isManual ? (
          <>
            <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} title="Editar"
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(item); }} title="Excluir"
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <>
            {podeBaixar && (
              <button onClick={(e) => { e.stopPropagation(); onMarcarPagamento(item); }} title="Registrar baixa"
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1.5 rounded-md text-gray-400 hover:text-emerald-600 hover:bg-emerald-50">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            )}
            {temBaixa && onEstornar && (
              <button onClick={(e) => { e.stopPropagation(); onEstornar(item._conta, item._tipo_conta); }} title="Estornar baixa"
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1.5 rounded-md text-gray-400 hover:text-orange-600 hover:bg-orange-50">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
});

// ─── Subgrupo (Entradas / Saídas) ─────────────────────────────────────────────
function SubgrupoDFC({ titulo, tipo, itens, total, handlers }) {
  if (itens.length === 0) return null;
  return (
    <div>
      <div className={`${GRID_LINHA} px-3 py-1.5 bg-gray-50/80 border-b border-gray-100`}>
        <span />
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${tipo === "entrada" ? "text-emerald-600" : "text-red-600"}`}>
          {titulo} · {itens.length}
        </span>
        <span className={`text-[11px] font-semibold text-right tabular-nums ${tipo === "entrada" ? "text-emerald-700" : "text-red-600"}`}>
          {tipo === "entrada" ? "+ " : "− "}{fmt(total)}
        </span>
        <span />
      </div>
      {itens.map((item, i) => (
        <LinhaItemDFC key={item.id || i} item={item} {...handlers} />
      ))}
    </div>
  );
}

// ─── Seção por grupo ──────────────────────────────────────────────────────────
export function SecaoFluxoDFC({
  titulo, icone, cor, itens, itensTodos, filtroAtivo,
  onDelete, onEdit, onMarcarPagamento, onEstornar,
}) {
  const [aberta, setAberta] = useState(true);
  const todos = itensTodos || itens;

  // Totais sobre TODOS os itens do grupo (independem do filtro)
  const totalEntradas = todos.filter((i) => i.tipo === "entrada").reduce((s, i) => s + (i.valor || 0), 0);
  const totalSaidas   = todos.filter((i) => i.tipo === "saida").reduce((s, i) => s + (i.valor || 0), 0);
  const liquido = totalEntradas - totalSaidas;

  // Linhas visíveis (filtradas), ordenadas por vencimento — sem data vai para o fim
  const ordenados = [...itens].sort((a, b) =>
    (a.data_vencimento || "9999-99-99").localeCompare(b.data_vencimento || "9999-99-99"));
  const entradas = ordenados.filter((i) => i.tipo === "entrada");
  const saidas   = ordenados.filter((i) => i.tipo === "saida");
  const somaVisivel = (lista) => lista.reduce((s, i) => s + (i.valor || 0), 0);

  const handlers = { onDelete, onEdit, onMarcarPagamento, onEstornar };

  return (
    <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Cabeçalho */}
      <button onClick={() => setAberta((a) => !a)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50/70 transition-colors">
        <span className={`p-1.5 rounded-lg shrink-0 ${cor.header}`}>{icone}</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800">{titulo}</p>
          <p className="text-[11px] text-gray-400">
            {filtroAtivo ? `${itens.length} de ${todos.length}` : todos.length} {todos.length === 1 ? "lançamento" : "lançamentos"}
          </p>
        </div>

        {/* Totais — colunas alinhadas */}
        <div className="ml-auto grid grid-cols-3 gap-4 sm:gap-6 text-right tabular-nums">
          <div className="hidden sm:block">
            <p className="text-[10px] uppercase tracking-wider text-gray-400">Entradas</p>
            <p className="text-xs font-semibold text-emerald-700 whitespace-nowrap">+ {fmt(totalEntradas)}</p>
          </div>
          <div className="hidden sm:block">
            <p className="text-[10px] uppercase tracking-wider text-gray-400">Saídas</p>
            <p className="text-xs font-semibold text-red-600 whitespace-nowrap">− {fmt(totalSaidas)}</p>
          </div>
          <div className="col-span-3 sm:col-span-1">
            <p className="text-[10px] uppercase tracking-wider text-gray-400">Líquido</p>
            <p className={`text-sm font-bold whitespace-nowrap ${liquido >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {liquido >= 0 ? "+ " : "− "}{fmt(Math.abs(liquido))}
            </p>
          </div>
        </div>

        {aberta
          ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
          : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>

      {aberta && (
        <div className="border-t border-gray-100">
          {itens.length > 0 && (
            <div className={`${GRID_LINHA} px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-400 border-b border-gray-100`}>
              <span />
              <span>Descrição</span>
              <span className="text-right">Valor</span>
              <span />
            </div>
          )}
          <SubgrupoDFC titulo="Entradas" tipo="entrada" itens={entradas} total={somaVisivel(entradas)} handlers={handlers} />
          <SubgrupoDFC titulo="Saídas"   tipo="saida"   itens={saidas}   total={somaVisivel(saidas)}   handlers={handlers} />

          {itens.length === 0 && (
            <p className="text-xs text-gray-400 italic text-center py-4">
              {filtroAtivo && todos.length > 0 ? "Nenhum lançamento deste grupo corresponde ao filtro." : "Nenhum lançamento neste grupo."}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export function DFCSkeleton() {
  const Secao = ({ linhas }) => (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-7 h-7 bg-gray-200 rounded-lg" />
        <div className="space-y-1.5">
          <div className="h-3 w-24 bg-gray-200 rounded" />
          <div className="h-2.5 w-16 bg-gray-100 rounded" />
        </div>
        <div className="ml-auto flex gap-6">
          <div className="hidden sm:block h-6 w-20 bg-gray-100 rounded" />
          <div className="hidden sm:block h-6 w-20 bg-gray-100 rounded" />
          <div className="h-6 w-20 bg-gray-200 rounded" />
        </div>
      </div>
      {linhas.map((w, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3 border-t border-gray-50">
          <div className="w-1 h-8 bg-gray-200 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <div className={`h-3.5 ${w} bg-gray-200 rounded`} />
            <div className="h-2.5 w-32 bg-gray-100 rounded" />
          </div>
          <div className="h-4 w-24 bg-gray-200 rounded" />
          <div className="w-16" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex gap-2">
        <div className="flex-1 h-10 bg-gray-100 rounded-lg" />
        <div className="flex-1 h-10 bg-gray-100 rounded-lg" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 w-32 bg-gray-100 rounded-lg" />
        <div className="h-8 w-20 bg-gray-100 rounded-lg" />
        <div className="h-8 w-24 bg-gray-100 rounded-lg" />
      </div>
      <div className="h-24 bg-gray-100 rounded-xl" />
      <div className="h-20 bg-white border border-gray-100 rounded-xl" />
      <Secao linhas={["w-2/3", "w-1/2", "w-3/5"]} />
      <Secao linhas={["w-1/2"]} />
      <Secao linhas={["w-2/5", "w-1/2"]} />
    </div>
  );
}
