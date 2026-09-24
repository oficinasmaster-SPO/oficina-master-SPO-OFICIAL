/**
 * ContasReceberPagarTab — Carteira de Contas a Receber e a Pagar.
 *
 * Correções aplicadas nesta reescrita:
 *   #1  Botão Estornar acessível — ListaContas recebe onEstornar; contas pagas aparecem.
 *   #2  Código morto removido — ModalRegistrarRecebimento_LEGACY_UNUSED,
 *       ModalRegistrarPagamento_LEGACY_UNUSED e atualizarSaldoFonte deletados (~250 linhas).
 *   #4  Ordenação de urgência — queries usam "data_vencimento" (ascendente); vencidas primeiro.
 *   #5  Vencidas destacadas — badge vermelho "⚠️ Vencida" quando status===aberto e data passada.
 *   #6  Contas sem vencimento visíveis — filtro de data removido da query; filtro client-side
 *       inclui contas sem data_vencimento.
 *   #7  Período sincronizado com o prop `mes` — estado local de mês/ano derivado do prop,
 *       não independente; mudança no DFC reflete aqui automaticamente.
 *   #8  staleTime 0 → 30 000 ms — handleSuccess invalida explicitamente; staleTime 0
 *       forçava re-fetch desnecessário a cada render.
 *  #10  Estado de erro visível — isError + botão Tentar Novamente em vez de lista vazia silenciosa.
 */

import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign, CreditCard, CheckCircle, AlertCircle, RotateCcw, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import FiltroPeriodo from "../dre/FiltroPeriodo";
import ModalRegistrarRecebimentoShared from "@/components/financeiro/ModalRegistrarRecebimento";
import ModalRegistrarPagamentoContaShared from "@/components/financeiro/ModalRegistrarPagamentoConta";
import ModalEstornoLiquidacao from "@/components/dfc/ModalEstornoLiquidacao";

// ─────────────────────────────────────────────────────────────────────────────
// Utilitários
// ─────────────────────────────────────────────────────────────────────────────

const fmt = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const hoje = new Date().toISOString().split("T")[0];
const hojeMs = new Date(hoje + "T12:00:00").getTime();

/** Retorna true quando a conta está aberta/parcial e a data de vencimento já passou. */
function isVencida(conta) {
  return (
    (conta.status === "aberto" || conta.status === "parcial") &&
    !!conta.data_vencimento &&
    conta.data_vencimento < hoje
  );
}

/** Calcula dias de atraso.
 *  Usa `dias_atraso` do backend se disponível (ContaReceber).
 *  Caso contrário calcula client-side (ContaPagar não tem o campo). */
function diasDeAtraso(conta) {
  if (typeof conta.dias_atraso === "number" && conta.dias_atraso > 0) return conta.dias_atraso;
  if (!conta.data_vencimento) return 0;
  const diffMs = hojeMs - new Date(conta.data_vencimento + "T12:00:00").getTime();
  const dias = Math.floor(diffMs / 86400000);
  return dias > 0 ? dias : 0;
}

/**
 * B1 — Ordenação tri-faixa:
 *   1º Vencidas (atraso decrescente — mais atrasada primeiro)
 *   2º A vencer (vencimento crescente — próxima primeiro)
 *   3º Sem data de vencimento (por último)
 *   4º Pagas (no final, só para contexto de estorno)
 */
function ordenarPorUrgencia(contas) {
  return [...contas].sort((a, b) => {
    const aVencida = isVencida(a);
    const bVencida = isVencida(b);
    const aPago    = a.status === "pago";
    const bPago    = b.status === "pago";
    const aSemData = !a.data_vencimento;
    const bSemData = !b.data_vencimento;

    // Pagas sempre no final
    if (aPago !== bPago) return aPago ? 1 : -1;

    // Faixa 1: Vencidas primeiro
    if (aVencida !== bVencida) return aVencida ? -1 : 1;
    if (aVencida && bVencida) {
      // Mais atrasada primeiro (atraso decrescente)
      return diasDeAtraso(b) - diasDeAtraso(a);
    }

    // Faixa 3: Sem data por último (antes das pagas)
    if (aSemData !== bSemData) return aSemData ? 1 : -1;

    // Faixa 2: A vencer — vencimento crescente (próxima primeiro)
    if (a.data_vencimento && b.data_vencimento) {
      return a.data_vencimento.localeCompare(b.data_vencimento);
    }

    return 0;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ListaContas — renderiza a lista de contas e expõe ações de registrar/estornar
// ─────────────────────────────────────────────────────────────────────────────

function ListaContas({ contas, tipo, onRegistrar, onEstornar }) {
  if (!contas?.length) {
    return (
      <div className="text-center py-8 text-gray-400">
        <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Nenhuma conta a {tipo === "receber" ? "receber" : "pagar"} neste período</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {contas.map((conta) => {
        const vencida = isVencida(conta);
        const pago    = conta.status === "pago";
        const parcial = conta.status === "parcial";

        // Badge de status — #5 vencidas em vermelho
        let badgeClass = "bg-blue-100 text-blue-700";
        let badgeLabel = conta.status;
        if (vencida)       { badgeClass = "bg-red-100 text-red-700";    badgeLabel = "⚠️ Vencida"; }
        else if (parcial)  { badgeClass = "bg-yellow-100 text-yellow-700"; }
        else if (pago)     { badgeClass = "bg-green-100 text-green-700"; }

        // Borda da linha — destaque visual para vencidas
        const rowClass = vencida
          ? "border-red-200 bg-red-50 hover:bg-red-100"
          : "border-gray-200 hover:bg-gray-50";

        const nome = tipo === "receber" ? conta.cliente_nome : conta.fornecedor_nome;
        const vencimentoTxt = conta.data_vencimento
          ? new Date(conta.data_vencimento + "T12:00:00").toLocaleDateString("pt-BR")
          : "Sem vencimento";

        return (
          <div
            key={conta.id}
            className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${rowClass}`}
          >
            {/* Lado esquerdo — identificação */}
            <div className="flex-1 min-w-0 mr-3">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-gray-900 text-sm truncate">{nome || "—"}</p>
                <Badge className={`text-[11px] px-1.5 py-0.5 ${badgeClass}`}>
                  {badgeLabel}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Vencimento: {vencimentoTxt}
              </p>
            </div>

            {/* Lado direito — valor e ações */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <p className="font-bold text-gray-900 text-sm">{fmt(conta.valor_aberto)}</p>

              {/* Registrar pagamento/recebimento — apenas para contas não totalmente pagas */}
              {!pago && (
                <Button
                  size="sm"
                  variant="outline"
                  className={tipo === "receber"
                    ? "border-green-300 text-green-700 hover:bg-green-50"
                    : "border-red-300 text-red-700 hover:bg-red-50"}
                  onClick={() => onRegistrar(conta)}
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {tipo === "receber" ? "Receber" : "Pagar"}
                </Button>
              )}

              {/* #1 Estornar — visível para contas pagas ou parciais */}
              {(pago || parcial) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-orange-300 text-orange-600 hover:bg-orange-50"
                  onClick={() => onEstornar(conta)}
                  title="Estornar baixa"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Estornar
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente Principal
// ─────────────────────────────────────────────────────────────────────────────

export default function ContasReceberPagarTab({ workshopId, mes }) {
  const queryClient = useQueryClient();

  // Modais
  const [contaReceberModal, setContaReceberModal]   = useState(null);
  const [contaPagarModal,   setContaPagarModal]     = useState(null);
  const [contaEstornoModal, setContaEstornoModal]   = useState(null);
  const [tipoEstorno,       setTipoEstorno]         = useState(null); // 'receber' | 'pagar'

  // #7 Período derivado do prop `mes` — sincronizado com o DFC
  // O FiltroPeriodo permite ajuste local sem desconectar do pai.
  const [periodo, setPeriodo] = useState("mensal");
  const [ano, setAno]         = useState(() => mes ? parseInt(mes.split("-")[0]) : new Date().getFullYear());
  const [mesSelecionado, setMesSelecionado] = useState(
    () => mes ? mes.split("-")[1] : String(new Date().getMonth() + 1).padStart(2, "0")
  );

  // Quando o prop `mes` mudar (usuário troca mês no DFC), sincroniza o estado local
  useEffect(() => {
    if (!mes) return;
    const [a, m] = mes.split("-");
    setAno(parseInt(a));
    setMesSelecionado(m);
  }, [mes]);

  const mesPadded = String(mesSelecionado).padStart(2, "0");
  const mesRef    = `${ano}-${mesPadded}`; // YYYY-MM — usado nos modais de registrar

  // #6 Datas de filtro client-side — contas sem vencimento sempre incluídas
  const dataInicio = periodo === "mensal" ? `${ano}-${mesPadded}-01` : `${ano}-01-01`;
  const dataFim    = periodo === "mensal" ? `${ano}-${mesPadded}-31` : `${ano}-12-31`;

  // ── Queries ───────────────────────────────────────────────────────────────

  // #1 Inclui "pago" para permitir estorno de contas já baixadas
  // #4 "data_vencimento" ascendente — vencidas primeiro
  // #6 Sem filtro de data na query — filtramos client-side para incluir sem vencimento
  // #8 staleTime 30 s — handleSuccess invalida explicitamente quando necessário
  const {
    data: contasReceberRaw = [],
    isLoading: isReceberLoading,
    isError: isReceberError,
    refetch: refetchReceber,
  } = useQuery({
    queryKey: ["contas-receber", workshopId],
    queryFn: () =>
      base44.entities.ContaReceber.filter(
        { workshop_id: workshopId, status: { $in: ["aberto", "parcial", "pago"] } },
        "data_vencimento",
        500
      ),
    enabled: !!workshopId,
    staleTime: 30_000,
  });

  const {
    data: contasPagarRaw = [],
    isLoading: isPagarLoading,
    isError: isPagarError,
    refetch: refetchPagar,
  } = useQuery({
    queryKey: ["contas-pagar", workshopId],
    queryFn: () =>
      base44.entities.ContaPagar.filter(
        { workshop_id: workshopId, status: { $in: ["aberto", "parcial", "pago"] } },
        "data_vencimento",
        500
      ),
    enabled: !!workshopId,
    staleTime: 30_000,
  });

  // #6 Filtro client-side: inclui contas sem vencimento; exclui pagas fora do período
  const filtrarPorPeriodo = (contas) =>
    contas.filter((c) => {
      // Contas pagas: só mostra do período atual (para contexto de estorno)
      if (c.status === "pago") {
        return c.data_vencimento
          ? c.data_vencimento >= dataInicio && c.data_vencimento <= dataFim
          : false; // pagas sem vencimento: omite (não há como inferir o período)
      }
      // Abertas/parciais sem vencimento: sempre visíveis
      if (!c.data_vencimento) return true;
      // Abertas/parciais com vencimento: filtra pelo período
      return c.data_vencimento >= dataInicio && c.data_vencimento <= dataFim;
    });

  const contasReceber = useMemo(() => filtrarPorPeriodo(contasReceberRaw), [contasReceberRaw, dataInicio, dataFim]);
  const contasPagar   = useMemo(() => filtrarPorPeriodo(contasPagarRaw),   [contasPagarRaw,   dataInicio, dataFim]);

  // Totais apenas sobre contas abertas/parciais (não pagas)
  const totalReceber = contasReceber
    .filter((c) => c.status !== "pago")
    .reduce((s, c) => s + (c.valor_aberto || 0), 0);
  const totalPagar = contasPagar
    .filter((c) => c.status !== "pago")
    .reduce((s, c) => s + (c.valor_aberto || 0), 0);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["contas-receber",      workshopId] });
    queryClient.invalidateQueries({ queryKey: ["contas-pagar",        workshopId] });
    queryClient.invalidateQueries({ queryKey: ["dre-lancamentos-dfc", workshopId] });
    queryClient.invalidateQueries({ queryKey: ["dre-lancamentos",     workshopId] });
    queryClient.invalidateQueries({ queryKey: ["dfc-manuais",         workshopId] });
    queryClient.invalidateQueries({ queryKey: ["dfc-saldo",           workshopId] });
    queryClient.invalidateQueries({ queryKey: ["dfc-liquidacoes-mes", workshopId] });
    queryClient.invalidateQueries({ queryKey: ["saldo-inicial-fontes",workshopId] });
    queryClient.invalidateQueries({ queryKey: ["liquidacoes"] });
    queryClient.invalidateQueries({ queryKey: ["budget-metas"] });
  };

  const abrirEstorno = (conta, tipo) => {
    setContaEstornoModal(conta);
    setTipoEstorno(tipo);
  };

  // ── Loading / Error ───────────────────────────────────────────────────────

  if (isReceberLoading || isPagarLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-blue-500 mr-2" />
        <span className="text-gray-500 text-sm">Carregando contas...</span>
      </div>
    );
  }

  // #10 Estado de erro visível
  if (isReceberError || isPagarError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-500">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-sm">Erro ao carregar as contas. Verifique a conexão.</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => { refetchReceber(); refetchPagar(); }}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Tentar Novamente
        </Button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
        <strong>Contas a Receber/Pagar:</strong> Registre recebimentos e pagamentos — os lançamentos
        alimentam o DFC automaticamente. Contas <strong>pagas</strong> aparecem no período para
        permitir estorno quando necessário.
      </div>

      {/* #7 Filtro de período — sincronizado com o DFC via useEffect acima */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <FiltroPeriodo
          mes={mesPadded}
          ano={ano}
          periodo={periodo}
          onMesChange={setMesSelecionado}
          onAnoChange={(v) => setAno(parseInt(v))}
          onPeriodoChange={setPeriodo}
        />
      </div>

      <Tabs defaultValue="receber" className="space-y-4">
        <TabsList className="bg-white shadow-md">
          <TabsTrigger value="receber">💰 Contas a Receber</TabsTrigger>
          <TabsTrigger value="pagar">💳 Contas a Pagar</TabsTrigger>
        </TabsList>

        {/* ── Contas a Receber ── */}
        <TabsContent value="receber">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    Contas a Receber
                  </CardTitle>
                  <CardDescription>Recebimentos pendentes de clientes</CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total Pendente</p>
                  <p className="text-2xl font-bold text-green-600">{fmt(totalReceber)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ListaContas
                contas={contasReceber}
                tipo="receber"
                onRegistrar={(conta) => setContaReceberModal(conta)}
                onEstornar={(conta) => abrirEstorno(conta, "receber")}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Contas a Pagar ── */}
        <TabsContent value="pagar">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-red-600" />
                    Contas a Pagar
                  </CardTitle>
                  <CardDescription>Pagamentos pendentes a fornecedores</CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total Pendente</p>
                  <p className="text-2xl font-bold text-red-600">{fmt(totalPagar)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ListaContas
                contas={contasPagar}
                tipo="pagar"
                onRegistrar={(conta) => setContaPagarModal(conta)}
                onEstornar={(conta) => abrirEstorno(conta, "pagar")}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Modais ── */}
      {contaReceberModal && (
        <ModalRegistrarRecebimentoShared
          aberto={!!contaReceberModal}
          onFechar={() => setContaReceberModal(null)}
          conta={contaReceberModal}
          workshopId={workshopId}
          mes={mesRef}
          onSuccess={() => { setContaReceberModal(null); handleSuccess(); }}
        />
      )}

      {contaPagarModal && (
        <ModalRegistrarPagamentoContaShared
          aberto={!!contaPagarModal}
          onFechar={() => setContaPagarModal(null)}
          conta={contaPagarModal}
          workshopId={workshopId}
          mes={mesRef}
          onSuccess={() => { setContaPagarModal(null); handleSuccess(); }}
        />
      )}

      {/* #1 Modal de Estorno — usa componente compartilhado */}
      {contaEstornoModal && (
        <ModalEstornoLiquidacao
          aberto={!!contaEstornoModal}
          onFechar={() => { setContaEstornoModal(null); setTipoEstorno(null); }}
          conta={contaEstornoModal}
          tipo={tipoEstorno}
          workshopId={workshopId}
          onSuccess={() => { setContaEstornoModal(null); setTipoEstorno(null); handleSuccess(); }}
        />
      )}
    </div>
  );
}
