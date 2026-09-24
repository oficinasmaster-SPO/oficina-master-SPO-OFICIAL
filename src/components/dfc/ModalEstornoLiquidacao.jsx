/**
 * ModalEstornoLiquidacao — modal compartilhado de estorno de baixa financeira.
 *
 * Dois modos:
 *   MODO DFC  (prop `liquidacao` preenchida):
 *     Chamado a partir de uma linha de baixa no DFC onde já sabemos qual
 *     liquidação estornar. Pula a etapa de seleção e exibe os dados da
 *     liquidação diretamente. O motivo continua obrigatório.
 *
 *   MODO CONTA  (prop `conta` + prop `tipo` preenchidas, sem `liquidacao`):
 *     Chamado a partir de Contas a Receber / Pagar. Busca as liquidações da
 *     conta e deixa o usuário selecionar qual reverter (mesmo comportamento
 *     do ModalEstornoTab antigo, agora centralizado aqui).
 *
 * Em ambos os modos a regra de negócio é sempre `desfazerLiquidacao` no backend —
 * sem lógica de estorno duplicada no frontend.
 */
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const fmt = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("pt-BR") : "—";
const fmtForma = (f) =>
  ({ pix: "PIX", ted: "TED", boleto: "Boleto", cartao_credito: "Cartão de Crédito",
     cartao_debito: "Cartão de Débito", dinheiro: "Dinheiro", cheque: "Cheque" }[f] || f || "—");

export default function ModalEstornoLiquidacao({
  // --- modo DFC ---
  liquidacao,          // objeto LiquidacaoFinanceira já carregado

  // --- modo Conta ---
  conta,               // objeto ContaReceber | ContaPagar
  tipo,                // 'receber' | 'pagar'

  // --- comuns ---
  aberto,
  onFechar,
  onSuccess,           // callback após estorno bem-sucedido
  workshopId,          // usado para invalidar bank-transactions
}) {
  const queryClient = useQueryClient();
  const modoDFC = !!liquidacao;

  const [motivo, setMotivo] = useState("");
  const [estornando, setEstornando] = useState(false);

  // Modo Conta: lista de liquidações para selecionar
  const [liquidacoes, setLiquidacoes] = useState([]);
  const [liquidacaoSelecionada, setLiquidacaoSelecionada] = useState(null);
  const [carregando, setCarregando] = useState(false);

  // Reset ao abrir
  useEffect(() => {
    if (!aberto) return;
    setMotivo("");
    setLiquidacaoSelecionada(null);

    if (!modoDFC && conta?.id) {
      setCarregando(true);
      const filtro = tipo === "receber"
        ? { conta_receber_id: conta.id }
        : { conta_pagar_id: conta.id };
      base44.entities.LiquidacaoFinanceira
        .filter(filtro, "-data_liquidacao", 20)
        .then((r) => setLiquidacoes(r || []))
        .catch(() => setLiquidacoes([]))
        .finally(() => setCarregando(false));
    }
  }, [aberto, conta?.id, tipo, modoDFC]);

  const liquidacaoAlvo = modoDFC ? liquidacao : liquidacoes.find((l) => l.id === liquidacaoSelecionada);
  const conciliada     = liquidacaoAlvo?.conciliado === true;

  const handleEstornar = async () => {
    const idAlvo = modoDFC ? liquidacao.id : liquidacaoSelecionada;
    if (!idAlvo)            { toast.error("Selecione a baixa a estornar"); return; }
    if (!motivo.trim())     { toast.error("Informe o motivo do estorno"); return; }

    setEstornando(true);
    try {
      const resultado = await base44.functions.invoke("desfazerLiquidacao", {
        liquidacao_id: idAlvo,
        motivo: motivo.trim(),
      });

      toast.success("✅ Estorno realizado com sucesso!");

      // Invalida queries — sempre DRE + DFC + contas
      // BUG-2 FIX: inclui 'dre-lancamentos-dfc' (key do DFCTab, diferente de 'dre-lancamentos' do DREAvancadoTab)
      queryClient.invalidateQueries({ queryKey: ["dre-lancamentos"] });         // DREAvancadoTab
      queryClient.invalidateQueries({ queryKey: ["dre-lancamentos-dfc"] });     // DFCTab
      queryClient.invalidateQueries({ queryKey: ["dfc-manuais"] });
      queryClient.invalidateQueries({ queryKey: ["dfc-saldo"] });
      queryClient.invalidateQueries({ queryKey: ["dfc-liquidacoes-mes"] });
      queryClient.invalidateQueries({ queryKey: ["contas-receber"] });
      queryClient.invalidateQueries({ queryKey: ["contas-pagar"] });
      // Invalida conciliação bancária se havia vínculo (backend sinaliza)
      if (resultado?.conciliacao_revertida || conciliada) {
        queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      }

      onSuccess?.();
      onFechar();
    } catch (e) {
      toast.error("Erro ao estornar: " + (e.message || "tente novamente"));
    } finally {
      setEstornando(false);
    }
  };

  // Título dinâmico
  const titulo = modoDFC
    ? (liquidacao?.tipo === "recebimento" ? "Estornar Recebimento" : "Estornar Pagamento")
    : tipo === "receber" ? "Estornar Recebimento" : "Estornar Pagamento";

  // Pessoa (cliente ou fornecedor)
  const nomePessoa = modoDFC
    ? null  // no modo DFC não temos o nome da conta diretamente
    : tipo === "receber" ? conta?.cliente_nome : conta?.fornecedor_nome;

  const podeConfirmar = !estornando && !!motivo.trim()
    && (modoDFC ? true : !!liquidacaoSelecionada);

  return (
    <Dialog open={aberto} onOpenChange={onFechar}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-700">
            <RotateCcw className="w-5 h-5" />
            {titulo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">

          {/* Aviso de conciliação */}
          {conciliada && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
              <p>
                Esta baixa está <strong>conciliada com o banco</strong>. O estorno irá
                desvincular a transação bancária e devolvê-la para a fila de
                conciliação pendente.
              </p>
            </div>
          )}

          {/* MODO DFC — exibe os dados da liquidação diretamente */}
          {modoDFC && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-orange-800">
                  {fmt(liquidacao.valor_liquidacao)}
                </span>
                <span className="text-orange-600 text-xs">{fmtDate(liquidacao.data_liquidacao)}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {fmtForma(liquidacao.forma_pagamento)}
                </Badge>
                {conciliada && (
                  <Badge className="text-xs bg-green-100 text-green-800 border-green-300">
                    Conciliada
                  </Badge>
                )}
              </div>
              <p className="text-orange-600 text-xs mt-1">
                O estorno reabre a conta, remove o lançamento do caixa e reverte
                o saldo da conta de origem.
              </p>
            </div>
          )}

          {/* MODO CONTA — card com nome + lista de baixas para selecionar */}
          {!modoDFC && (
            <>
              {nomePessoa && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
                  <p className="font-semibold text-orange-800">{nomePessoa}</p>
                  <p className="text-orange-700 text-xs mt-0.5">
                    Valor original: {fmt(conta?.valor_original)}
                  </p>
                </div>
              )}

              {carregando ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Buscando baixas registradas…
                </div>
              ) : liquidacoes.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  Nenhuma baixa encontrada para esta conta.
                </p>
              ) : (
                <div>
                  <Label className="text-xs">Selecione a baixa a estornar *</Label>
                  <div className="space-y-2 mt-1">
                    {liquidacoes.map((liq) => (
                      <button
                        key={liq.id}
                        type="button"
                        onClick={() => setLiquidacaoSelecionada(liq.id)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all text-sm ${
                          liquidacaoSelecionada === liq.id
                            ? "border-orange-400 bg-orange-50"
                            : "border-gray-200 hover:border-orange-200"
                        }`}
                      >
                        <div className="flex justify-between">
                          <span className="font-medium">{fmt(liq.valor_liquidacao)}</span>
                          <span className="text-gray-500">{fmtDate(liq.data_liquidacao)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500">{fmtForma(liq.forma_pagamento)}</span>
                          {liq.conciliado && (
                            <Badge className="text-xs bg-green-100 text-green-800 border-green-300">
                              Conciliada
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Motivo — sempre obrigatório */}
          <div>
            <Label className="text-xs">Motivo do estorno *</Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Data de pagamento informada incorretamente (09/09 em vez de 18/09)"
              className="mt-1 text-sm resize-none"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar} disabled={estornando}>
            Cancelar
          </Button>
          <Button
            onClick={handleEstornar}
            disabled={!podeConfirmar}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {estornando && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Confirmar Estorno
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
