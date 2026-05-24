import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InputMoeda } from "@/components/ui/InputMoeda";
import { Loader2, Building2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

function useFontesDinheiro(workshopId, mes) {
  return useQuery({
    queryKey: ["saldo-inicial-fontes", workshopId, mes],
    queryFn: async () => {
      if (!workshopId) return { bancos: [], maquinas_cartao: [], caixa: 0 };
      if (mes) {
        const records = await base44.entities.DFCLancamento.filter({
          workshop_id: workshopId, mes, grupo: "saldo_inicial",
        }, "-created_date", 1);
        if (records?.[0]?.detalhes) {
          const d = records[0].detalhes;
          if ((d.bancos?.length > 0) || (d.maquinas_cartao?.length > 0) || (d.caixa > 0)) {
            return { bancos: d.bancos || [], maquinas_cartao: d.maquinas_cartao || [], caixa: d.caixa || 0 };
          }
        }
      }
      const allRecords = await base44.entities.DFCLancamento.filter({
        workshop_id: workshopId, grupo: "saldo_inicial",
      }, "-created_date", 5);
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
    const records = await base44.entities.DFCLancamento.filter({
      workshop_id: workshopId, mes, grupo: "saldo_inicial",
    }, "-created_date", 1);
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

    await base44.entities.DFCLancamento.update(registro.id, {
      detalhes, valor: novoTotal, saldo_inicial: novoTotal,
    });

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
      });

      if (fonteSaida && mes) {
        await atualizarSaldoFonte(workshopId, mes, fonteSaida, valor, "subtrai", queryClient);
      }

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
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">💳 Registrar Pagamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-0 overflow-y-auto flex-1">
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p className="font-medium text-gray-900">{conta.fornecedor_nome || "—"}</p>
            <p className="text-gray-500">Valor original: {fmt(conta.valor_original)}</p>
            <p className="text-gray-500">Saldo aberto: <span className="font-semibold text-red-700">{fmt(conta.valor_aberto)}</span></p>
          </div>

          <div>
            <Label className="text-xs">Data de Pagamento *</Label>
            <Input
              type="date"
              value={dataLiquidacao}
              onChange={(e) => setDataLiquidacao(e.target.value)}
              className="mt-0.5 text-sm"
            />
          </div>

          <div>
            <Label className="text-xs">Valor Pago (R$) *</Label>
            <InputMoeda
              value={valor}
              onChange={(v) => setValor(v)}
              className="text-right text-sm"
            />
          </div>

          <div>
            <Label className="text-xs">Forma de Pagamento *</Label>
            <Select value={formaPagamento} onValueChange={setFormaPagamento}>
              <SelectTrigger className="text-sm">
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
            <Label className="text-xs flex items-center gap-1">
              <Building2 className="w-3 h-3 text-blue-600" /> De onde saiu o dinheiro?
            </Label>
            {!temFontes ? (
              <div className="mt-1 p-2 rounded-md border border-yellow-200 bg-yellow-50 text-xs text-yellow-700 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                Nenhum banco ou máquina cadastrado no Saldo Inicial. Cadastre em <strong>Saldo Inicial Detalhado</strong>.
              </div>
            ) : (
              <Select value={fonteSaida} onValueChange={setFonteSaida}>
                <SelectTrigger className="mt-1 text-sm">
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

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Desconto</Label>
              <InputMoeda value={desconto} onChange={(v) => setDesconto(v)} className="text-right text-xs" />
            </div>
            <div>
              <Label className="text-xs">Juros</Label>
              <InputMoeda value={juros} onChange={(v) => setJuros(v)} className="text-right text-xs" />
            </div>
            <div>
              <Label className="text-xs">Multa</Label>
              <InputMoeda value={multa} onChange={(v) => setMulta(v)} className="text-right text-xs" />
            </div>
          </div>

          <div className="p-2 bg-red-50 rounded border border-red-200">
            <p className="text-xs text-red-700">Valor Líquido</p>
            <p className="text-lg font-bold text-red-900">{fmt(valorLiquido)}</p>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2 mt-auto">
          <Button variant="outline" size="sm" onClick={onFechar} disabled={saving}>Cancelar</Button>
          <Button size="sm" onClick={handleSalvar} disabled={saving || !valor}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Confirmar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}