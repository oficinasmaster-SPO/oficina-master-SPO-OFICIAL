import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InputMoeda } from "@/components/ui/InputMoeda";
import { Loader2, AlertCircle, Building2 } from "lucide-react";
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

  return (
    <Dialog open={!!item} onOpenChange={onFechar}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{loading ? "Carregando..." : semConta ? "📅 Datas do Lançamento" : titulo}</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400 mr-2" />
            <span className="text-sm text-gray-500">Buscando conta vinculada...</span>
          </div>
        )}

        {/* ── COM CONTA VINCULADA: modal completo de liquidação ── */}
        {!loading && !semConta && contaVinculada && (
          <div className="space-y-4 py-2">
            <div>
              <Label>{labelNome}</Label>
              <p className="text-sm font-medium text-gray-900">{nomeConta || item.descricao || "—"}</p>
            </div>
            <div>
              <Label>Valor Aberto</Label>
              <p className={`text-lg font-bold ${corPrincipal}`}>{fmt(contaVinculada.valor_aberto)}</p>
            </div>
            <div>
              <Label>Data do Pagamento</Label>
              <Input
                type="date"
                value={dataLiquidacao}
                onChange={(e) => setDataLiquidacao(e.target.value)}
              />
            </div>
            <div>
              <Label>{isReceita ? "Valor Recebido (R$)" : "Valor Pago (R$)"}</Label>
              <InputMoeda value={parseFloat(valor) || 0} onChange={(e) => setValor(e.target.value)} className="text-right" />
            </div>
            <div>
              <Label>Forma de Pagamento</Label>
              <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Label className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                {isDespesa ? "De onde saiu o dinheiro?" : "Onde vai entrar o dinheiro?"}
              </Label>
              <SeletorFonte
                fontes={fontes}
                fonteSelecionada={fonteSelecionada}
                onChange={setFonteSelecionada}
                label=""
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Desconto</Label>
                <InputMoeda value={desconto} onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)} className="text-right" />
              </div>
              <div>
                <Label>Juros</Label>
                <InputMoeda value={juros} onChange={(e) => setJuros(parseFloat(e.target.value) || 0)} className="text-right" />
              </div>
              <div>
                <Label>Multa</Label>
                <InputMoeda value={multa} onChange={(e) => setMulta(parseFloat(e.target.value) || 0)} className="text-right" />
              </div>
            </div>
            <div className={`p-3 ${bgLiquido} rounded-lg`}>
              <p className={`text-sm ${labelLiquido}`}>Valor Líquido</p>
              <p className={`text-2xl font-bold ${textLiquido}`}>{fmt(valorLiquido)}</p>
            </div>
          </div>
        )}

        {/* ── SEM CONTA VINCULADA: fallback datas simples ── */}
        {!loading && semConta && (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Conta vinculada não encontrada. Você pode registrar apenas as datas de vencimento e pagamento.
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-900">{item.descricao || "—"}</p>
              <p className={`text-lg font-bold ${corPrincipal}`}>
                {isDespesa ? "-" : "+"}{fmt(item.valor)}
              </p>
            </div>
            <div>
              <Label className="text-xs">Data de Vencimento <span className="text-gray-400">(opcional)</span></Label>
              <input
                type="date"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mt-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={dataVencimento}
                onChange={e => setDataVencimento(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Data de Pagamento <span className="text-gray-400">(preencha quando pago)</span></Label>
              <input
                type="date"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mt-1 bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
                value={dataPagamento}
                onChange={e => setDataPagamento(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onFechar} disabled={saving}>Cancelar</Button>
          {!loading && !semConta && contaVinculada && (
            <Button size="sm" onClick={handleSalvarLiquidacao} disabled={saving || !valor}>
              {saving && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
              {isReceita ? "Confirmar Recebimento" : "Confirmar Pagamento"}
            </Button>
          )}
          {!loading && semConta && (
            <Button size="sm" onClick={handleSalvarDatas} disabled={saving}>
              {saving && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
              Salvar Datas
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}