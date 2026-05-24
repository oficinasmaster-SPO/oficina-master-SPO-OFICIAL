import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InputMoeda } from "@/components/ui/InputMoeda";
import { Loader2, AlertCircle, Building2, CreditCard, DollarSign, Calendar, Minus, Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import SeletorFonte from "./SeletorFonte";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

/**
 * Modal de Liquidação via DFC:
 * - Ao clicar num lançamento DRE (saída) → busca ContaPagar pelo dre_lancamento_id → abre modal de pagamento
 * - Ao clicar num lançamento DRE (entrada) → busca ContaReceber pelo dre_lancamento_id → abre modal de recebimento
 * - Se não houver conta vinculada → fallback para modal de datas simples (DRELancamento)
 */
export default function ModalLiquidacaoDRE({ item, workshopId, onFechar, onSalvo }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [contaVinculada, setContaVinculada] = useState(null);
  const [semConta, setSemConta] = useState(false);

  // Form state
  const [valor, setValor] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [dataLiquidacao, setDataLiquidacao] = useState(new Date().toISOString().split("T")[0]);
  const [fonteSelecionada, setFonteSelecionada] = useState(""); // de onde sai/onde entra o dinheiro
  const [desconto, setDesconto] = useState(0);
  const [juros, setJuros] = useState(0);
  const [multa, setMulta] = useState(0);
  const [saving, setSaving] = useState(false);

  // Fallback: datas simples
  const [dataVencimento, setDataVencimento] = useState("");
  const [dataPagamento, setDataPagamento] = useState("");

  const isDespesa = item?.tipo === "saida";

  // Buscar fontes de dinheiro do mês
  const mesReferencia = item?.mes;
  const { data: fontes } = useQuery({
    queryKey: ["saldo-inicial-fontes", workshopId, mesReferencia],
    queryFn: async () => {
      if (!workshopId) return { bancos: [], maquinas_cartao: [], caixa: 0 };
      const allRecords = await base44.entities.DFCLancamento.filter({
        workshop_id: workshopId,
        grupo: "saldo_inicial",
      }, "-created_date", 5);
      for (const rec of (allRecords || [])) {
        const d = rec.detalhes;
        if (d && ((d.bancos?.length > 0) || (d.maquinas_cartao?.length > 0) || (d.caixa > 0))) {
          return {
            bancos: d.bancos || [],
            maquinas_cartao: d.maquinas_cartao || [],
            caixa: d.caixa || 0,
          };
        }
      }
      return { bancos: [], maquinas_cartao: [], caixa: 0 };
    },
    enabled: !!workshopId && !!item,
    staleTime: 0,
  });

  useEffect(() => {
    if (!item?.id) return;

    setLoading(true);
    setContaVinculada(null);
    setSemConta(false);

    const buscarConta = async () => {
      try {
        if (isDespesa) {
          const contas = await base44.entities.ContaPagar.filter({ dre_lancamento_id: item.id });
          if (contas?.length > 0) {
            setContaVinculada(contas[0]);
            setValor(String(contas[0].valor_aberto || 0));
          } else {
            setSemConta(true);
            setDataVencimento(item.data_vencimento || "");
            setDataPagamento(item.data_pagamento || "");
          }
        } else {
          const contas = await base44.entities.ContaReceber.filter({ dre_lancamento_id: item.id });
          if (contas?.length > 0) {
            setContaVinculada(contas[0]);
            setValor(String(contas[0].valor_aberto || 0));
          } else {
            setSemConta(true);
            setDataVencimento(item.data_vencimento || "");
            setDataPagamento(item.data_pagamento || "");
          }
        }
      } catch {
        setSemConta(true);
      } finally {
        setLoading(false);
      }
    };

    buscarConta();
  }, [item?.id]);

  if (!item) return null;

  const valorLiquido = (parseFloat(valor) || 0) + juros + multa - desconto;

  // ── Handler: Liquidação via registrarLiquidacao + atualiza saldo inicial ──────────────────
  const handleSalvarLiquidacao = async () => {
    setSaving(true);
    try {
      const valorLiquidacao = parseFloat(valor) || 0;
      if (isDespesa) {
        await base44.functions.invoke("registrarLiquidacao", {
          workshop_id: workshopId,
          conta_pagar_id: contaVinculada.id,
          tipo: "pagamento",
          valor_liquidacao: valorLiquidacao,
          forma_pagamento: formaPagamento,
          data_liquidacao: dataLiquidacao,
          desconto_concedido: desconto,
          juros_recebido: juros,
          multa_recebida: multa,
        });
        toast.success("Pagamento registrado!");
      } else {
        await base44.functions.invoke("registrarLiquidacao", {
          workshop_id: workshopId,
          conta_receber_id: contaVinculada.id,
          tipo: "recebimento",
          valor_liquidacao: valorLiquidacao,
          forma_pagamento: formaPagamento,
          data_liquidacao: dataLiquidacao,
          desconto_concedido: desconto,
          juros_recebido: juros,
          multa_recebida: multa,
        });
        toast.success("Recebimento registrado!");
      }

      // ✅ Sincronizar data_pagamento no DRELancamento de origem
      if (item?.id) {
        await base44.entities.DRELancamento.update(item.id, {
          data_pagamento: dataLiquidacao
        });
      }

      // ✅ Atualizar saldo inicial da fonte selecionada
      if (fonteSelecionada && mesReferencia) {
        const [tipo, id] = fonteSelecionada.split(":");
        const operacao = isDespesa ? "subtrai" : "soma";
        
        const records = await base44.entities.DFCLancamento.filter({
          workshop_id: workshopId,
          mes: mesReferencia,
          grupo: "saldo_inicial",
        }, "-created_date", 1);
        const registro = records?.[0];
        if (registro) {
          const detalhes = {
            bancos: registro.detalhes?.bancos || [],
            maquinas_cartao: registro.detalhes?.maquinas_cartao || [],
            caixa: registro.detalhes?.caixa || 0,
          };
          const delta = operacao === "soma" ? valorLiquidacao : -valorLiquidacao;

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
            detalhes,
            valor: novoTotal,
            saldo_inicial: novoTotal,
          });

          queryClient.invalidateQueries({ queryKey: ["saldo-inicial-fontes", workshopId, mesReferencia] });
          queryClient.invalidateQueries({ queryKey: ["dfc-saldo", workshopId, mesReferencia] });
        }
      }

      onSalvo?.();
    } catch (error) {
      toast.error("Erro: " + (error.message || "Erro desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  // ── Handler: Fallback — apenas datas no DRELancamento ───────────
  const handleSalvarDatas = async () => {
    setSaving(true);
    try {
      await base44.entities.DRELancamento.update(item.id, {
        data_vencimento: dataVencimento || null,
        data_pagamento: dataPagamento || null,
      });
      toast.success("Datas atualizadas!");
      onSalvo?.();
    } catch {
      toast.error("Erro ao salvar datas");
    } finally {
      setSaving(false);
    }
  };

  const isReceita = !isDespesa;
  const corPrincipal = isReceita ? "text-green-600" : "text-red-600";
  const bgLiquido = isReceita ? "bg-green-50" : "bg-red-50";
  const textLiquido = isReceita ? "text-green-900" : "text-red-900";
  const labelLiquido = isReceita ? "text-green-700" : "text-red-700";
  const titulo = isReceita ? "💰 Registrar Recebimento" : "💳 Registrar Pagamento";
  const labelNome = isReceita ? "Cliente" : "Fornecedor";
  const nomeConta = isReceita ? contaVinculada?.cliente_nome : contaVinculada?.fornecedor_nome;

  const headerBg = isReceita ? "bg-green-50" : "bg-red-50";
  const headerTitle = isReceita ? "text-green-900" : "text-red-900";
  const headerSub = isReceita ? "text-green-700" : "text-red-700";
  const headerIcon = isReceita ? "text-green-600" : "text-red-600";
  const btnConfirm = isReceita ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700";
  const cardLiquido = isReceita ? "bg-green-600" : "bg-red-600";

  return (
    <Dialog open={!!item} onOpenChange={onFechar}>
      <DialogContent className="max-w-2xl w-full p-0 gap-0 overflow-hidden">

        {/* HEADER */}
        <DialogHeader className={`px-6 py-4 border-b ${headerBg}`}>
          <DialogTitle className={`text-lg font-bold ${headerTitle} flex items-center gap-2`}>
            <CreditCard className={`w-5 h-5 ${headerIcon}`} />
            {loading ? "Carregando..." : semConta ? "Datas do Lançamento" : (isReceita ? "Registrar Recebimento" : "Registrar Pagamento")}
          </DialogTitle>
          <p className={`text-sm font-medium ${headerSub}`}>
            {nomeConta || item?.descricao || "—"}
          </p>
        </DialogHeader>

        {/* LOADING */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400 mr-2" />
            <span className="text-sm text-gray-500">Buscando conta vinculada...</span>
          </div>
        )}

        {/* ── COM CONTA VINCULADA: layout 2 colunas ── */}
        {!loading && !semConta && contaVinculada && (
          <div className="grid grid-cols-2 divide-x">

            {/* Coluna esquerda: Resumo + Ajustes */}
            <div className="p-6 space-y-5">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Resumo da Conta</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-200">
                    <span className="text-sm text-gray-600">Valor original</span>
                    <span className="text-sm font-medium text-gray-900">{fmt(contaVinculada.valor_original)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-200">
                    <span className="text-sm text-gray-600">Saldo em aberto</span>
                    <span className={`text-base font-bold ${corPrincipal}`}>{fmt(contaVinculada.valor_aberto)}</span>
                  </div>
                  {contaVinculada.data_vencimento && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-600">Vencimento</span>
                      <span className="text-sm text-gray-800">
                        {new Date(contaVinculada.data_vencimento + "T12:00:00").toLocaleDateString("pt-BR")}
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
                    <InputMoeda value={desconto} onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)} className="text-right text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-orange-700 flex items-center gap-1 mb-1">
                      <Plus className="w-3 h-3" /> Juros
                    </Label>
                    <InputMoeda value={juros} onChange={(e) => setJuros(parseFloat(e.target.value) || 0)} className="text-right text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-orange-700 flex items-center gap-1 mb-1">
                      <AlertTriangle className="w-3 h-3" /> Multa
                    </Label>
                    <InputMoeda value={multa} onChange={(e) => setMulta(parseFloat(e.target.value) || 0)} className="text-right text-sm" />
                  </div>
                </div>
              </div>

              {/* Card valor líquido */}
              <div className={`rounded-xl ${cardLiquido} text-white p-4`}>
                <p className="text-xs opacity-80 mb-1">Total {isReceita ? "a receber" : "a pagar"} (líquido)</p>
                <p className="text-3xl font-bold tracking-tight">{fmt(valorLiquido)}</p>
              </div>
            </div>

            {/* Coluna direita: Dados do pagamento */}
            <div className="p-6 space-y-5">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Dados do Pagamento</p>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                      <DollarSign className="w-4 h-4 text-gray-500" /> {isReceita ? "Valor Recebido (R$)" : "Valor Pago (R$)"} *
                    </Label>
                    <InputMoeda value={parseFloat(valor) || 0} onChange={(e) => setValor(e.target.value)} className="text-right text-base font-semibold h-11" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                      <Calendar className="w-4 h-4 text-gray-500" /> Data de Pagamento *
                    </Label>
                    <Input type="date" value={dataLiquidacao} onChange={(e) => setDataLiquidacao(e.target.value)} className="h-11 text-sm" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                      <CreditCard className="w-4 h-4 text-gray-500" /> Forma de Pagamento *
                    </Label>
                    <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                      <SelectTrigger className="h-11 text-sm"><SelectValue /></SelectTrigger>
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
                      <Building2 className="w-4 h-4 text-gray-500" /> {isDespesa ? "De onde saiu o dinheiro?" : "Onde vai entrar o dinheiro?"}
                    </Label>
                    <SeletorFonte fontes={fontes} fonteSelecionada={fonteSelecionada} onChange={setFonteSelecionada} label="" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SEM CONTA VINCULADA: fallback datas simples ── */}
        {!loading && semConta && (
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Conta vinculada não encontrada. Você pode registrar apenas as datas de vencimento e pagamento.
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-900">{item.descricao || "—"}</p>
              <p className={`text-lg font-bold ${corPrincipal}`}>{isDespesa ? "-" : "+"}{fmt(item.valor)}</p>
            </div>
            <div>
              <Label className="text-xs">Data de Vencimento <span className="text-gray-400">(opcional)</span></Label>
              <input type="date" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mt-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" value={dataVencimento} onChange={e => setDataVencimento(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Data de Pagamento <span className="text-gray-400">(preencha quando pago)</span></Label>
              <input type="date" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mt-1 bg-white focus:outline-none focus:ring-2 focus:ring-green-300" value={dataPagamento} onChange={e => setDataPagamento(e.target.value)} />
            </div>
          </div>
        )}

        {/* FOOTER */}
        {!loading && (
          <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between gap-3">
            <Button variant="outline" size="lg" onClick={onFechar} disabled={saving} className="min-w-[120px]">
              Cancelar
            </Button>
            {!semConta && contaVinculada && (
              <Button size="lg" onClick={handleSalvarLiquidacao} disabled={saving || !valor} className={`flex-1 max-w-xs ${btnConfirm} text-white font-semibold text-base`}>
                {saving ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Registrando...</> : <>✓ {isReceita ? "Confirmar Recebimento" : "Confirmar Pagamento"}</>}
              </Button>
            )}
            {semConta && (
              <Button size="lg" onClick={handleSalvarDatas} disabled={saving} className="flex-1 max-w-xs font-semibold text-base">
                {saving ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Salvando...</> : "Salvar Datas"}
              </Button>
            )}
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}