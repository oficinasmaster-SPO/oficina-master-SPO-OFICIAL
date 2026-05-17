import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";

const fmt = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const fmtDataLonga = (d) => {
  if (!d) return "";
  const [ano, mes, dia] = d.split("-");
  const nomes = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const semana = nomes[new Date(`${ano}-${mes}-${dia}T12:00:00`).getDay()];
  return `${semana}, ${dia}/${mes}`;
};

/**
 * Monta a linha do tempo cronológica de caixa a partir dos lançamentos do DRE.
 * 
 * Regras:
 *  - Itens com data_pagamento  → REALIZADOS → usam data_pagamento como âncora de data
 *  - Itens com data_vencimento (sem data_pagamento) → PROJETADOS → usam data_vencimento
 *  - Itens sem nenhuma data → ignorados nesta view (aparecem na view por grupo)
 * 
 * Saldo acumulado começa com saldoInicial.
 */
function buildLinhaDoTempo(todosItens, saldoInicial) {
  // 1. Filtrar apenas itens com alguma data
  const comData = todosItens.filter(i => i.data_pagamento || i.data_vencimento);

  // 2. Determinar data e tipo de cada item
  const eventos = comData.map(item => {
    const realizado = !!item.data_pagamento;
    const data = realizado ? item.data_pagamento : item.data_vencimento;
    const delta = item.tipo === "entrada" ? item.valor : -item.valor;
    return { ...item, _data: data, _realizado: realizado, _delta: delta };
  });

  // 3. Ordenar por data
  eventos.sort((a, b) => a._data.localeCompare(b._data));

  // 4. Agrupar por data
  const porData = {};
  for (const ev of eventos) {
    if (!porData[ev._data]) porData[ev._data] = [];
    porData[ev._data].push(ev);
  }

  // 5. Calcular saldo acumulado por dia
  let saldo = saldoInicial;
  const linhas = Object.entries(porData).map(([data, itens]) => {
    const movDia = itens.reduce((s, i) => s + i._delta, 0);
    saldo += movDia;
    const todosRealizados = itens.every(i => i._realizado);
    const algumRealizado = itens.some(i => i._realizado);
    return { data, itens, movDia, saldoApos: saldo, todosRealizados, algumRealizado };
  });

  return linhas;
}

export default function ProjecaoCaixaView({ todosItens, saldoInicial, onMarcarPagamento }) {
  const hoje = new Date().toISOString().split("T")[0];

  const linhas = useMemo(
    () => buildLinhaDoTempo(todosItens, saldoInicial),
    [todosItens, saldoInicial]
  );

  const semDatas = useMemo(
    () => todosItens.filter(i => !i.data_pagamento && !i.data_vencimento),
    [todosItens]
  );

  if (linhas.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
        <p className="text-2xl mb-2">📅</p>
        <p className="text-sm font-medium">Nenhum lançamento com data cadastrada.</p>
        <p className="text-xs mt-1">
          Clique nos itens da aba <strong>Por Grupo</strong> para definir datas de vencimento e pagamento.
        </p>
      </div>
    );
  }

  // Índice da linha "hoje" — para separador visual
  const indexHoje = linhas.findIndex(l => l.data >= hoje);

  return (
    <div className="space-y-4">

      {/* KPIs rápidos */}
      <KPIsProjecao linhas={linhas} hoje={hoje} saldoInicial={saldoInicial} />

      {/* Tabela cronológica */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 grid grid-cols-[110px_1fr_110px_110px] px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <span>Data</span>
          <span>Lançamentos</span>
          <span className="text-right">Movimento</span>
          <span className="text-right">Saldo</span>
        </div>

        {/* Linha do saldo inicial */}
        <div className="grid grid-cols-[110px_1fr_110px_110px] px-3 py-2 text-xs border-b border-gray-100 bg-blue-50">
          <span className="text-blue-600 font-semibold">Início</span>
          <span className="text-blue-700 text-xs">Saldo inicial do mês</span>
          <span />
          <span className="text-right font-bold text-blue-700">{fmt(saldoInicial)}</span>
        </div>

        {linhas.map((linha, idx) => {
          const isHoje = linha.data === hoje;
          const isPassado = linha.data < hoje;
          const isFuturo = linha.data > hoje;

          // Separador "HOJE" — inserir antes da primeira linha >= hoje
          const mostrarSeparadorHoje = idx === indexHoje && indexHoje > 0;

          return (
            <React.Fragment key={linha.data}>
              {mostrarSeparadorHoje && (
                <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 border-y border-amber-300">
                  <div className="h-px flex-1 bg-amber-400" />
                  <span className="text-xs font-bold text-amber-600 shrink-0">▶ HOJE — {fmtDataLonga(hoje)}</span>
                  <div className="h-px flex-1 bg-amber-400" />
                </div>
              )}

              <div className={`border-b border-gray-100 last:border-0 ${isHoje ? "bg-amber-50" : isPassado ? "bg-white" : "bg-gray-50/50"}`}>
                {/* Cabeçalho da linha de data */}
                <div className="grid grid-cols-[110px_1fr_110px_110px] px-3 py-2 items-center">
                  <div>
                    <p className={`text-xs font-bold ${isHoje ? "text-amber-700" : isPassado ? "text-gray-600" : "text-gray-500"}`}>
                      {fmtDataLonga(linha.data)}
                    </p>
                    {!linha.todosRealizados && (
                      <span className="text-[10px] text-amber-500">projeção</span>
                    )}
                    {linha.todosRealizados && (
                      <span className="text-[10px] text-emerald-600">realizado</span>
                    )}
                  </div>

                  {/* Itens do dia — lista compacta */}
                  <div className="space-y-0.5 min-w-0">
                    {linha.itens.map((item, i) => (
                      <div key={i} className="flex items-center gap-1.5 min-w-0 group cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5 transition-colors" onClick={() => onMarcarPagamento?.(item)}>
                        <span className={`text-[10px] shrink-0 ${item._realizado ? "text-emerald-500" : "text-amber-500"}`}>
                          {item._realizado ? "✓" : "○"}
                        </span>
                        <span className="text-xs text-gray-600 truncate">{item.descricao || "—"}</span>
                        <span className={`text-xs font-semibold shrink-0 ml-auto ${item._delta >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {item._delta >= 0 ? "+" : ""}{fmt(Math.abs(item._delta))}
                        </span>
                        <span className="opacity-0 group-hover:opacity-100 text-[10px] text-blue-500 transition-opacity ml-1">
                          📅
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Movimento do dia */}
                  <span className={`text-sm font-semibold text-right ${linha.movDia >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {linha.movDia >= 0 ? "+" : ""}{fmt(linha.movDia)}
                  </span>

                  {/* Saldo acumulado */}
                  <div className="text-right">
                    <span className={`text-sm font-bold ${linha.saldoApos >= 0 ? "text-gray-800" : "text-red-600"}`}>
                      {fmt(linha.saldoApos)}
                    </span>
                    {linha.saldoApos < 0 && (
                      <p className="text-[10px] text-red-500 font-semibold">⚠️ Negativo</p>
                    )}
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Aviso sobre itens sem data */}
      {semDatas.length > 0 && (
        <div className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          ℹ️ <strong>{semDatas.length} lançamento(s)</strong> sem data de vencimento ou pagamento não aparecem nesta projeção.
          Acesse a aba <strong>Por Grupo</strong> e clique em cada item para definir as datas.
        </div>
      )}
    </div>
  );
}

// ─── KPIs rápidos no topo da projeção ────────────────────────────
function KPIsProjecao({ linhas, hoje, saldoInicial }) {
  const vencidosPendentes = linhas
    .filter(l => l.data < hoje && !l.todosRealizados)
    .flatMap(l => l.itens.filter(i => !i._realizado));

  const vencimentosHoje = linhas
    .filter(l => l.data === hoje)
    .flatMap(l => l.itens.filter(i => !i._realizado));

  const proximosSemana = (() => {
    const fim = new Date();
    fim.setDate(fim.getDate() + 7);
    const fimStr = fim.toISOString().split("T")[0];
    return linhas
      .filter(l => l.data > hoje && l.data <= fimStr)
      .flatMap(l => l.itens.filter(i => !i._realizado));
  })();

  const somaVencidos = vencidosPendentes.reduce((s, i) => s + Math.abs(i._delta), 0);
  const somaHoje = vencimentosHoje.reduce((s, i) => s + Math.abs(i._delta), 0);
  const somaSemana = proximosSemana.reduce((s, i) => s + Math.abs(i._delta), 0);

  // Saldo real = apenas realizados até hoje
  const linhasPassadas = linhas.filter(l => l.data <= hoje && l.todosRealizados);
  const movRealizado = linhasPassadas.reduce((s, l) => s + l.movDia, 0);
  const saldoReal = saldoInicial + movRealizado;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="bg-white border border-gray-200 rounded-xl p-3">
        <p className="text-xs text-gray-500">Saldo Real (realizados)</p>
        <p className={`text-lg font-bold ${saldoReal >= 0 ? "text-emerald-700" : "text-red-700"}`}>{fmt(saldoReal)}</p>
      </div>
      <div className={`border rounded-xl p-3 ${vencidosPendentes.length > 0 ? "bg-red-50 border-red-200" : "bg-white border-gray-200"}`}>
        <p className="text-xs text-gray-500">Vencidos em aberto</p>
        <p className={`text-lg font-bold ${vencidosPendentes.length > 0 ? "text-red-700" : "text-gray-400"}`}>
          {vencidosPendentes.length > 0 ? fmt(somaVencidos) : "—"}
        </p>
        {vencidosPendentes.length > 0 && (
          <p className="text-[10px] text-red-500">{vencidosPendentes.length} item(s)</p>
        )}
      </div>
      <div className={`border rounded-xl p-3 ${vencimentosHoje.length > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200"}`}>
        <p className="text-xs text-gray-500">Vence hoje</p>
        <p className={`text-lg font-bold ${vencimentosHoje.length > 0 ? "text-amber-700" : "text-gray-400"}`}>
          {vencimentosHoje.length > 0 ? fmt(somaHoje) : "—"}
        </p>
        {vencimentosHoje.length > 0 && (
          <p className="text-[10px] text-amber-500">{vencimentosHoje.length} item(s)</p>
        )}
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-3">
        <p className="text-xs text-gray-500">Próx. 7 dias</p>
        <p className="text-lg font-bold text-gray-700">{proximosSemana.length > 0 ? fmt(somaSemana) : "—"}</p>
        {proximosSemana.length > 0 && (
          <p className="text-[10px] text-gray-400">{proximosSemana.length} item(s)</p>
        )}
      </div>
    </div>
  );
}