import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InputMoeda } from "@/components/ui/InputMoeda";
import { Loader2, Building2, AlertCircle, CreditCard, Calendar, DollarSign, Minus, Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import useFontesDinheiro from "@/components/dfc/useFontesDinheiro";
import { hojeLocal } from "@/components/utils/dataValor";
import useModalScrollLock from "@/hooks/useModalScrollLock";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

// D1: atualizarSaldoFonte removida — lógica migrada para o backend (registrarLiquidacao).
// D1: useFontesDinheiro inline removido — importado de @/components/dfc/useFontesDinheiro.js.
// Mantê-la aqui causava duplicação e risco de double-write no saldo.

/**
 * Modal para registrar recebimento de ContaReceber.
 * Usado em: pages/ContasReceber, components/dfc/ContasReceberPagarTab
 */
export default function ModalRegistrarRecebimento({ aberto, onFechar, conta, workshopId, mes, onSuccess }) {
  const queryClient = useQueryClient();
  // Anti layout-shift: trava o scroll de fundo (<html>) e anula a compensação de
  // largura do react-remove-scroll — a página por trás não desliza ao abrir o modal
  useModalScrollLock(aberto);
  const [valor, setValor] = useState(0);
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [dataLiquidacao, setDataLiquidacao] = useState(hojeLocal());
  const [fonteDestino, setFonteDestino] = useState("");
  const [desconto, setDesconto] = useState(0);
  const [juros, setJuros] = useState(0);
  const [multa, setMulta] = useState(0);
  const [saving, setSaving] = useState(false);

  // FIX QA-2.8: as fontes devem refletir o mês da DATA DE RECEBIMENTO, não o mês
  // de vencimento da conta (prop `mes`). O backend (registrarLiquidacao) credita o
  // saldo do mês de data_liquidacao — usar o mês de vencimento aqui fazia o modal
  // cair no fallback com saldos zerados e bloquear o registro ("Saldo insuficiente: R$ 0").
  const mesRecebimento = (dataLiquidacao || hojeLocal()).slice(0, 7);
  const { data: fontes } = useFontesDinheiro(workshopId, mesRecebimento);

  useEffect(() => {
    if (aberto && conta) {
      setValor(conta.valor_aberto || 0);
      setDataLiquidacao(hojeLocal());
      setFonteDestino("");
      setDesconto(0);
      setJuros(0);
      setMulta(0);
    }
  }, [aberto, conta]);

  if (!conta) return null;

  const bancos = fontes?.bancos || [];
  const maquinas = fontes?.maquinas_cartao || [];
  const temFontes = bancos.length > 0 || maquinas.length > 0 || (fontes?.caixa > 0);
  const valorLiquido = (valor || 0) + juros + multa - desconto;

  const handleSalvar = async () => {
    if (!valor || valor <= 0) { toast.error('Informe um valor válido'); return; }
    if (!fonteDestino) { toast.error('Selecione onde vai entrar o dinheiro'); return; }
    setSaving(true);
    try {
      // FIX 7: passar fonte_selecionada para o backend — ele já atualiza o saldo da fonte,
      // eliminando a duplicação de lógica com atualizarSaldoFonte no frontend
      await base44.functions.invoke("registrarLiquidacao", {
        workshop_id: workshopId,
        conta_receber_id: conta.id,
        tipo: "recebimento",
        valor_liquidacao: valor,
        forma_pagamento: formaPagamento,
        data_liquidacao: dataLiquidacao,
        desconto_concedido: desconto,
        juros_recebido: juros,
        multa_recebida: multa,
        fonte_selecionada: fonteDestino || undefined,
      });

      queryClient.invalidateQueries({ queryKey: ["contas-pagar"] });
      queryClient.invalidateQueries({ queryKey: ["contas-receber"] });
      queryClient.invalidateQueries({ queryKey: ["dre-lancamentos"] });
      queryClient.invalidateQueries({ queryKey: ["dre-lancamentos-dfc"] });
      queryClient.invalidateQueries({ queryKey: ["budget-metas"] });
      queryClient.invalidateQueries({ queryKey: ["contas-pagar-budget"] });
      queryClient.invalidateQueries({ queryKey: ["contas-receber-budget"] });
      queryClient.invalidateQueries({ queryKey: ["liquidacoes"] });
      queryClient.invalidateQueries({ queryKey: ["dfc-manuais"] });
      queryClient.invalidateQueries({ queryKey: ["dfc-saldo"] });
      queryClient.invalidateQueries({ queryKey: ["saldoInicial"] });
      queryClient.invalidateQueries({ queryKey: ["saldo-inicial-fontes"] });
      window.dispatchEvent(new CustomEvent('recebimento-registrado', { detail: { workshopId, mes: mesRecebimento } }));
      window.dispatchEvent(new CustomEvent('liquidacao-registrada', { detail: { workshopId, mes: mesRecebimento } }));
      toast.success("Recebimento registrado!");
      onSuccess?.();
      onFechar();
    } catch (error) {
      toast.error("Erro ao registrar recebimento: " + (error.message || "Erro desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={onFechar}>
      <DialogContent className="max-w-2xl w-full p-0 gap-0 overflow-hidden [&>button]:hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-green-50">
          <DialogTitle className="text-lg font-bold text-green-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Registrar Recebimento
          </DialogTitle>
          <p className="text-sm text-green-700 font-medium">{conta.cliente_nome || "—"}</p>
        </DialogHeader>

        {/* Body: 2 colunas */}
        <div className="grid grid-cols-2 divide-x">

          {/* Coluna esquerda: Resumo + ajustes */}
          <div className="p-6 space-y-5">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Resumo da Conta</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-200">
                  <span className="text-sm text-gray-600">Valor original</span>
                  <span className="text-sm font-medium text-gray-900">{fmt(conta.valor_original)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-200">
                  <span className="text-sm text-gray-600">Saldo em aberto</span>
                  <span className="text-base font-bold text-green-700">{fmt(conta.valor_aberto)}</span>
                </div>
                {conta.data_vencimento && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Vencimento</span>
                    <span className="text-sm text-gray-800">
                      {new Date(conta.data_vencimento + "T12:00:00").toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Ajustes</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-red-700 flex items-center gap-1 mb-1">
                    <Minus className="w-3 h-3" /> Desconto
                  </Label>
                  <InputMoeda value={desconto} onChange={(v) => setDesconto(v)} className="text-right text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-green-700 flex items-center gap-1 mb-1">
                    <Plus className="w-3 h-3" /> Juros
                  </Label>
                  <InputMoeda value={juros} onChange={(v) => setJuros(v)} className="text-right text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-green-700 flex items-center gap-1 mb-1">
                    <AlertTriangle className="w-3 h-3" /> Multa
                  </Label>
                  <InputMoeda value={multa} onChange={(v) => setMulta(v)} className="text-right text-sm" />
                </div>
              </div>
            </div>

            {/* Valor líquido destacado */}
            <div className="rounded-xl bg-green-600 text-white p-4">
              <p className="text-xs opacity-80 mb-1">Total a receber (líquido)</p>
              <p className="text-3xl font-bold tracking-tight">{fmt(valorLiquido)}</p>
            </div>
          </div>

          {/* Coluna direita: campos de recebimento */}
          <div className="p-6 space-y-5">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Dados do Recebimento</p>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                    <DollarSign className="w-4 h-4 text-gray-500" /> Valor Recebido (R$) *
                  </Label>
                  <InputMoeda
                    value={valor}
                    onChange={(v) => setValor(v)}
                    className="text-right text-base font-semibold h-11"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                    <Calendar className="w-4 h-4 text-gray-500" /> Data de Recebimento *
                  </Label>
                  <Input
                    type="date"
                    value={dataLiquidacao}
                    onChange={(e) => setDataLiquidacao(e.target.value)}
                    className="h-11 text-sm"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                    <CreditCard className="w-4 h-4 text-gray-500" /> Forma de Pagamento *
                  </Label>
                  <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                    <SelectTrigger className="h-11 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="ted">TED</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                      <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                    <Building2 className="w-4 h-4 text-gray-500" /> Onde vai entrar o dinheiro? *
                  </Label>
                  {!temFontes ? (
                    <div className="p-3 rounded-lg border border-yellow-200 bg-yellow-50 text-xs text-yellow-800 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Nenhum banco ou máquina cadastrado no Saldo Inicial. Cadastre em <strong>Saldo Inicial Detalhado</strong>.</span>
                    </div>
                  ) : (
                    <>
                      {fontes?._de_outro_mes && (
                        <div className="mb-2 p-2 rounded-lg border border-blue-200 bg-blue-50 text-xs text-blue-700 flex items-start gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                          <span>Contas do mês {fontes._mes_origem} (saldo zerado). Configure o Saldo Inicial deste mês para ver os saldos.</span>
                        </div>
                      )}
                      <Select value={fonteDestino} onValueChange={setFonteDestino}>
                        <SelectTrigger className="h-11 text-sm">
                          <SelectValue placeholder="Selecione a fonte..." />
                        </SelectTrigger>
                        <SelectContent>
                          {bancos.map((b) => (
                            <SelectItem key={`banco-${b.id}`} value={`banco:${b.id}:${b.nome}`}>
                              🏦 {b.nome}{b.saldo > 0 ? ` — ${fmt(b.saldo)}` : ""}
                            </SelectItem>
                          ))}
                          {maquinas.map((m) => (
                            <SelectItem key={`maq-${m.id}`} value={`maquina:${m.id}:${m.nome}`}>
                              💳 {m.nome}{m.saldo > 0 ? ` — ${fmt(m.saldo)}` : ""}
                            </SelectItem>
                          ))}
                          {(fontes?.caixa > 0) && (
                            <SelectItem value="caixa:caixa:Caixa">
                              💵 Caixa — {fmt(fontes.caixa)}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer fixo */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between gap-3">
          <Button variant="outline" size="lg" onClick={onFechar} disabled={saving} className="min-w-[120px]">
            Cancelar
          </Button>
          <Button
            size="lg"
            onClick={handleSalvar}
            disabled={saving || !valor || !fonteDestino}
            className="flex-1 max-w-xs bg-green-600 hover:bg-green-700 text-white font-semibold text-base"
          >
            {saving ? (
              <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Registrando...</>
            ) : (
              <>✓ Confirmar Recebimento</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}