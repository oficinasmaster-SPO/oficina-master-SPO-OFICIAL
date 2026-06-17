import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InputMoeda } from "@/components/ui/InputMoeda";
import { Loader2, Building2, AlertCircle, CreditCard, Calendar, DollarSign, Minus, Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

function useFontesDinheiro(workshopId, mes) {
  return useQuery({
    queryKey: ["saldo-inicial-fontes", workshopId, mes],
    queryFn: async () => {
      if (!workshopId) return { bancos: [], maquinas_cartao: [], caixa: 0 };
      if (mes) {
        const records = await base44.entities.DFCLancamento.filter(
          { workshop_id: workshopId, mes, grupo: "saldo_inicial" }, "-created_date", 1
        );
        if (records?.[0]?.detalhes) {
          const d = records[0].detalhes;
          if ((d.bancos?.length > 0) || (d.maquinas_cartao?.length > 0) || (d.caixa > 0)) {
            return { bancos: d.bancos || [], maquinas_cartao: d.maquinas_cartao || [], caixa: d.caixa || 0 };
          }
        }
      }
      const allRecords = await base44.entities.DFCLancamento.filter(
        { workshop_id: workshopId, grupo: "saldo_inicial" }, "-created_date", 5
      );
      for (const rec of (allRecords || [])) {
        const d = rec.detalhes;
        if (d && ((d.bancos?.length > 0) || (d.maquinas_cartao?.length > 0) || (d.caixa > 0))) {
          return { bancos: d.bancos || [], maquinas_cartao: d.maquinas_cartao || [], caixa: d.caixa || 0 };
        }
      }
      return { bancos: [], maquinas_cartao: [], caixa: 0 };
    },
    enabled: !!workshopId,
    staleTime: 0,
  });
}

async function atualizarSaldoFonte(workshopId, mes, fonteKey, valor, operacao, queryClient) {
  try {
    const records = await base44.entities.DFCLancamento.filter(
      { workshop_id: workshopId, mes, grupo: "saldo_inicial" }, "-created_date", 1
    );
    const registro = records?.[0];
    if (!registro) return;
    const detalhes = {
      bancos: registro.detalhes?.bancos || [],
      maquinas_cartao: registro.detalhes?.maquinas_cartao || [],
      caixa: registro.detalhes?.caixa || 0,
    };
    const [tipo, id] = fonteKey.split(":");
    const delta = operacao === "soma" ? valor : -valor;
    if (tipo === "banco") {
      detalhes.bancos = detalhes.bancos.map(b =>
        b.id === id ? { ...b, saldo: Math.max(0, (b.saldo || 0) + delta) } : b
      );
    } else if (tipo === "maquina") {
      detalhes.maquinas_cartao = detalhes.maquinas_cartao.map(m =>
        m.id === id ? { ...m, saldo: Math.max(0, (m.saldo || 0) + delta) } : m
      );
    } else if (tipo === "caixa") {
      detalhes.caixa = Math.max(0, detalhes.caixa + delta);
    }
    const novoTotal = detalhes.bancos.reduce((s, b) => s + (b.saldo || 0), 0)
      + detalhes.maquinas_cartao.reduce((s, m) => s + (m.saldo || 0), 0)
      + detalhes.caixa;
    await base44.entities.DFCLancamento.update(registro.id, { detalhes, valor: novoTotal, saldo_inicial: novoTotal });
    queryClient.invalidateQueries({ queryKey: ["saldo-inicial-fontes", workshopId, mes] });
    queryClient.invalidateQueries({ queryKey: ["dfc-saldo", workshopId, mes] });
  } catch (e) {
    console.warn("Não foi possível atualizar saldo inicial:", e.message);
  }
}

/**
 * Modal para registrar pagamento de ContaPagar.
 * Usado em: pages/ContasPagar, components/dfc/ContasReceberPagarTab
 */
export default function ModalRegistrarPagamentoConta({ aberto, onFechar, conta, workshopId, mes, onSuccess }) {
  const queryClient = useQueryClient();
  const [valor, setValor] = useState(0);
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [dataLiquidacao, setDataLiquidacao] = useState(new Date().toISOString().split("T")[0]);
  const [fonteSaida, setFonteSaida] = useState("");
  const [desconto, setDesconto] = useState(0);
  const [juros, setJuros] = useState(0);
  const [multa, setMulta] = useState(0);
  const [saving, setSaving] = useState(false);

  const { data: fontes } = useFontesDinheiro(workshopId, mes);

  useEffect(() => {
    if (aberto && conta) {
      setValor(conta.valor_aberto || 0);
      setDataLiquidacao(new Date().toISOString().split("T")[0]);
      setFonteSaida("");
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
    setSaving(true);
    try {
      // FIX 7: passar fonte_selecionada para o backend — ele já atualiza o saldo da fonte,
      // eliminando a duplicação de lógica com atualizarSaldoFonte no frontend
      await base44.functions.invoke("registrarLiquidacao", {
        workshop_id: workshopId,
        conta_pagar_id: conta.id,
        tipo: "pagamento",
        valor_liquidacao: valor,
        forma_pagamento: formaPagamento,
        data_liquidacao: dataLiquidacao,
        desconto_concedido: desconto,
        juros_recebido: juros,
        multa_recebida: multa,
        fonte_selecionada: fonteSaida || undefined,
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
      queryClient.invalidateQueries({ queryKey: ["saldo-inicial-fontes"] });
      toast.success("Pagamento registrado!");
      onSuccess?.();
      onFechar();
    } catch (error) {
      toast.error("Erro ao registrar pagamento: " + (error.message || "Erro desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={onFechar}>
      <DialogContent className="max-w-2xl w-full p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-red-50">
          <DialogTitle className="text-lg font-bold text-red-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-red-600" />
            Registrar Pagamento
          </DialogTitle>
          <p className="text-sm text-red-700 font-medium">{conta.fornecedor_nome || "—"}</p>
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
                  <span className="text-base font-bold text-red-700">{fmt(conta.valor_aberto)}</span>
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
                  <Label className="text-xs text-green-700 flex items-center gap-1 mb-1">
                    <Minus className="w-3 h-3" /> Desconto
                  </Label>
                  <InputMoeda value={desconto} onChange={(v) => setDesconto(v)} className="text-right text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-orange-700 flex items-center gap-1 mb-1">
                    <Plus className="w-3 h-3" /> Juros
                  </Label>
                  <InputMoeda value={juros} onChange={(v) => setJuros(v)} className="text-right text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-orange-700 flex items-center gap-1 mb-1">
                    <AlertTriangle className="w-3 h-3" /> Multa
                  </Label>
                  <InputMoeda value={multa} onChange={(v) => setMulta(v)} className="text-right text-sm" />
                </div>
              </div>
            </div>

            {/* Valor líquido destacado */}
            <div className="rounded-xl bg-red-600 text-white p-4">
              <p className="text-xs opacity-80 mb-1">Total a pagar (líquido)</p>
              <p className="text-3xl font-bold tracking-tight">{fmt(valorLiquido)}</p>
            </div>
          </div>

          {/* Coluna direita: campos de pagamento */}
          <div className="p-6 space-y-5">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Dados do Pagamento</p>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                    <DollarSign className="w-4 h-4 text-gray-500" /> Valor Pago (R$) *
                  </Label>
                  <InputMoeda
                    value={valor}
                    onChange={(v) => setValor(v)}
                    className="text-right text-base font-semibold h-11"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                    <Calendar className="w-4 h-4 text-gray-500" /> Data de Pagamento *
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
                    <Building2 className="w-4 h-4 text-gray-500" /> De onde saiu o dinheiro?
                  </Label>
                  {!temFontes ? (
                    <div className="p-3 rounded-lg border border-yellow-200 bg-yellow-50 text-xs text-yellow-800 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Nenhum banco ou máquina cadastrado no Saldo Inicial. Cadastre em <strong>Saldo Inicial Detalhado</strong>.</span>
                    </div>
                  ) : (
                    <Select value={fonteSaida} onValueChange={setFonteSaida}>
                      <SelectTrigger className="h-11 text-sm">
                        <SelectValue placeholder="Selecione a fonte..." />
                      </SelectTrigger>
                      <SelectContent>
                        {bancos.map((b) => (
                          <SelectItem key={`banco-${b.id}`} value={`banco:${b.id}:${b.nome}`}>
                            🏦 {b.nome} — {fmt(b.saldo || 0)}
                          </SelectItem>
                        ))}
                        {maquinas.map((m) => (
                          <SelectItem key={`maq-${m.id}`} value={`maquina:${m.id}:${m.nome}`}>
                            💳 {m.nome} — {fmt(m.saldo || 0)}
                          </SelectItem>
                        ))}
                        {(fontes?.caixa > 0) && (
                          <SelectItem value="caixa:caixa:Caixa">
                            💵 Caixa — {fmt(fontes.caixa)}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
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
            disabled={saving || !valor}
            className="flex-1 max-w-xs bg-red-600 hover:bg-red-700 text-white font-semibold text-base"
          >
            {saving ? (
              <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Registrando...</>
            ) : (
              <>✓ Confirmar Pagamento</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}