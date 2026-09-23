import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InputMoeda } from "@/components/ui/InputMoeda";
import { Loader2, DollarSign, CreditCard, CheckCircle, AlertCircle, Building2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import FiltroPeriodo from "../dre/FiltroPeriodo";
import ModalRegistrarRecebimentoShared from "@/components/financeiro/ModalRegistrarRecebimento";
import ModalRegistrarPagamentoContaShared from "@/components/financeiro/ModalRegistrarPagamentoConta";
import { Textarea } from "@/components/ui/textarea";

// ── Modal de Estorno (P1-2: acessível dentro do DRETCMP2) ─────────────────────
function ModalEstornoTab({ aberto, onFechar, conta, tipo, onSuccess }) {
  const [motivo, setMotivo] = useState("");
  const [estornando, setEstornando] = useState(false);
  const [liquidacoes, setLiquidacoes] = useState([]);
  const [liquidacaoSelecionada, setLiquidacaoSelecionada] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  useEffect(() => {
    if (!aberto || !conta?.id) return;
    setMotivo(""); setLiquidacaoSelecionada(null);
    setCarregando(true);
    const filtro = tipo === 'receber'
      ? { conta_receber_id: conta.id }
      : { conta_pagar_id: conta.id };
    base44.entities.LiquidacaoFinanceira
      .filter(filtro, '-data_liquidacao', 20)
      .then(r => setLiquidacoes(r || []))
      .catch(() => setLiquidacoes([]))
      .finally(() => setCarregando(false));
  }, [aberto, conta?.id, tipo]);

  const handleEstornar = async () => {
    if (!liquidacaoSelecionada) { toast.error('Selecione a baixa a estornar'); return; }
    if (!motivo.trim()) { toast.error('Informe o motivo do estorno'); return; }
    setEstornando(true);
    try {
      await base44.functions.invoke('desfazerLiquidacao', {
        liquidacao_id: liquidacaoSelecionada,
        motivo: motivo.trim(),
      });
      toast.success('\u2705 Estorno realizado com sucesso!');
      onSuccess?.();
      onFechar();
    } catch (e) {
      toast.error('Erro ao estornar: ' + (e.message || 'tente novamente'));
    } finally {
      setEstornando(false);
    }
  };

  const nomePessoa = tipo === 'receber' ? conta?.cliente_nome : conta?.fornecedor_nome;

  return (
    <Dialog open={aberto} onOpenChange={onFechar}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-700">
            <RotateCcw className="w-5 h-5" />
            Estornar {tipo === 'receber' ? 'Recebimento' : 'Pagamento'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
            <p className="font-semibold text-orange-800">{nomePessoa || '\u2014'}</p>
            <p className="text-orange-700 text-xs mt-0.5">Valor original: {fmt(conta?.valor_original)}</p>
          </div>
          {carregando ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Buscando baixas...
            </div>
          ) : liquidacoes.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Nenhuma baixa encontrada para esta conta.</p>
          ) : (
            <div>
              <Label className="text-xs">Selecione a baixa a estornar *</Label>
              <div className="space-y-2 mt-1">
                {liquidacoes.map(liq => (
                  <button key={liq.id} onClick={() => setLiquidacaoSelecionada(liq.id)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all text-sm ${
                      liquidacaoSelecionada === liq.id ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-orange-200'
                    }`}>
                    <div className="flex justify-between">
                      <span className="font-medium">{fmt(liq.valor_liquidacao)}</span>
                      <span className="text-gray-500">{liq.data_liquidacao ? new Date(liq.data_liquidacao).toLocaleDateString('pt-BR') : '\u2014'}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{liq.forma_pagamento?.replace('_', ' ')}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <Label className="text-xs">Motivo do estorno *</Label>
            <Textarea value={motivo} onChange={e => setMotivo(e.target.value)}
              placeholder="Ex: Data de pagamento informada incorretamente (09/09 em vez de 18/09)"
              className="mt-1 text-sm resize-none" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button onClick={handleEstornar}
            disabled={estornando || !liquidacaoSelecionada || !motivo.trim()}
            className="bg-orange-600 hover:bg-orange-700">
            {estornando && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Confirmar Estorno
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook para buscar as fontes de dinheiro do saldo inicial
// Busca o registro mais recente de saldo_inicial da oficina (independente do mês filtrado)
function useFontesDinheiro(workshopId, mes) {
  return useQuery({
    queryKey: ["saldo-inicial-fontes", workshopId, mes],
    queryFn: async () => {
      if (!workshopId) return { bancos: [], maquinas_cartao: [], caixa: 0 };

      // 1. Tenta o mês exato passado
      if (mes) {
        const records = await base44.entities.DFCLancamento.filter({
          workshop_id: workshopId,
          mes,
          grupo: "saldo_inicial",
        }, "-created_date", 1);
        if (records?.[0]?.detalhes) {
          const detalhes = records[0].detalhes;
          const temFontes = (detalhes.bancos?.length > 0) || (detalhes.maquinas_cartao?.length > 0) || (detalhes.caixa > 0);
          if (temFontes) {
            return {
              bancos: detalhes.bancos || [],
              maquinas_cartao: detalhes.maquinas_cartao || [],
              caixa: detalhes.caixa || 0,
            };
          }
        }
      }

      // 2. Fallback: busca o registro de saldo_inicial mais recente da oficina (qualquer mês)
      const allRecords = await base44.entities.DFCLancamento.filter({
        workshop_id: workshopId,
        grupo: "saldo_inicial",
      }, "-created_date", 5);

      // Procura o primeiro que tenha bancos ou máquinas cadastradas
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
    enabled: !!workshopId,
    staleTime: 0,
  });
}

// Componente seletor de fonte do dinheiro
function SeletorFonte({ fontes, fonteSelecionada, onChange, label = "De onde saiu o dinheiro?" }) {
  const bancos = fontes?.bancos || [];
  const maquinas = fontes?.maquinas_cartao || [];
  const temFontes = bancos.length > 0 || maquinas.length > 0 || (fontes?.caixa > 0);

  return (
    <div>
      <Label className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-blue-600" />
        {label}
      </Label>
      {!temFontes ? (
        <div className="mt-1 p-2 rounded-md border border-yellow-200 bg-yellow-50 text-xs text-yellow-700 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          Nenhum banco ou máquina cadastrado no Saldo Inicial deste mês. Cadastre em <strong>Saldo Inicial Detalhado</strong> para vincular a fonte.
        </div>
      ) : (
        <Select value={fonteSelecionada} onValueChange={onChange}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Selecione a fonte..." />
          </SelectTrigger>
          <SelectContent>
            {bancos.map((b) => (
              <SelectItem key={`banco-${b.id}`} value={`banco:${b.id}:${b.nome}`}>
                🏦 {b.nome} — R$ {(b.saldo || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </SelectItem>
            ))}
            {maquinas.map((m) => (
              <SelectItem key={`maq-${m.id}`} value={`maquina:${m.id}:${m.nome}`}>
                💳 {m.nome} — R$ {(m.saldo || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </SelectItem>
            ))}
            {(fontes?.caixa > 0) && (
              <SelectItem value="caixa:caixa:Caixa">
                💵 Caixa — R$ {(fontes.caixa || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

// ── Função auxiliar: atualiza saldo da fonte no saldo inicial ────
// (mantida aqui pois é usada pelos modais compartilhados via prop onSuccess + invalidate)

// ── Modal Registrar Recebimento ───────────────────────────
function ModalRegistrarRecebimento_LEGACY_UNUSED({ aberto, onFechar, conta, workshopId, mes, onSuccess }) {
  const queryClient = useQueryClient();
  const [valor, setValor] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [dataLiquidacao, setDataLiquidacao] = useState(new Date().toISOString().split("T")[0]);
  const [fonteDestino, setFonteDestino] = useState("");
  const [desconto, setDesconto] = useState(0);
  const [juros, setJuros] = useState(0);
  const [multa, setMulta] = useState(0);
  const [saving, setSaving] = useState(false);

  const { data: fontes } = useFontesDinheiro(workshopId, mes);

  useEffect(() => {
    if (aberto) {
      setValor(String(conta?.valor_aberto || 0));
      setDataLiquidacao(new Date().toISOString().split("T")[0]);
      setFonteDestino("");
      setDesconto(0);
      setJuros(0);
      setMulta(0);
    }
  }, [aberto, conta]);

  const handleSalvar = async () => {
    setSaving(true);
    try {
      const valorLiquidacao = parseFloat(valor) || 0;
      await base44.functions.invoke("registrarLiquidacao", {
        workshop_id: workshopId,
        conta_receber_id: conta.id,
        tipo: "recebimento",
        valor_liquidacao: valorLiquidacao,
        forma_pagamento: formaPagamento,
        data_liquidacao: dataLiquidacao,
        desconto_concedido: desconto,
        juros_recebido: juros,
        multa_recebida: multa,
      });

      // Atualizar saldo inicial: SOMA na fonte de destino
      if (fonteDestino && mes) {
        await atualizarSaldoFonte(workshopId, mes, fonteDestino, valorLiquidacao, "soma", queryClient);
      }

      toast.success("Recebimento registrado!");
      onSuccess();
      onFechar();
    } catch (error) {
      toast.error("Erro ao registrar recebimento: " + (error.message || "Erro desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  const valorLiquido = (parseFloat(valor) || 0) + juros + multa - desconto;

  return (
    <Dialog open={aberto} onOpenChange={onFechar}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">💰 Registrar Recebimento</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-0 overflow-y-auto flex-1">
          <div>
            <Label className="text-xs">Cliente</Label>
            <p className="text-sm font-medium text-gray-900">{conta?.cliente_nome || "—"}</p>
          </div>
          <div>
            <Label className="text-xs">Valor Aberto</Label>
            <p className="text-base font-bold text-green-600">{fmt(conta?.valor_aberto)}</p>
          </div>
          <div>
            <Label className="text-xs">Data de Recebimento</Label>
            <Input type="date" value={dataLiquidacao} onChange={(e) => setDataLiquidacao(e.target.value)} className="mt-0.5 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Valor Recebido (R$)</Label>
            <InputMoeda value={parseFloat(valor) || 0} onChange={(e) => setValor(e.target.value)} className="text-right text-sm" />
          </div>
          <div>
            <Label className="text-xs">Forma de Pagamento</Label>
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
          <SeletorFonte
            fontes={fontes}
            fonteSelecionada={fonteDestino}
            onChange={setFonteDestino}
            label="Onde vai entrar o dinheiro?"
          />
          <div className="grid grid-cols-3 gap-1">
            <div>
              <Label className="text-xs">Desconto</Label>
              <InputMoeda value={desconto} onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)} className="text-right text-xs" />
            </div>
            <div>
              <Label className="text-xs">Juros</Label>
              <InputMoeda value={juros} onChange={(e) => setJuros(parseFloat(e.target.value) || 0)} className="text-right text-xs" />
            </div>
            <div>
              <Label className="text-xs">Multa</Label>
              <InputMoeda value={multa} onChange={(e) => setMulta(parseFloat(e.target.value) || 0)} className="text-right text-xs" />
            </div>
          </div>
          <div className="p-2 bg-green-50 rounded border border-green-200">
            <p className="text-xs text-green-700">Valor Líquido</p>
            <p className="text-lg font-bold text-green-900">{fmt(valorLiquido)}</p>
          </div>
        </div>
        <DialogFooter className="gap-2 pt-2 mt-auto">
          <Button variant="outline" size="sm" onClick={onFechar}>Cancelar</Button>
          <Button size="sm" onClick={handleSalvar} disabled={saving || !valor}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Confirmar Recebimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Modal Registrar Pagamento ───────────────────────────
function ModalRegistrarPagamento_LEGACY_UNUSED({ aberto, onFechar, conta, workshopId, mes, onSuccess }) {
  const queryClient = useQueryClient();
  const [valor, setValor] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [dataLiquidacao, setDataLiquidacao] = useState(new Date().toISOString().split("T")[0]);
  const [fonteSaida, setFonteSaida] = useState(""); // de onde SAI o dinheiro
  const [desconto, setDesconto] = useState(0);
  const [juros, setJuros] = useState(0);
  const [multa, setMulta] = useState(0);
  const [saving, setSaving] = useState(false);

  const { data: fontes } = useFontesDinheiro(workshopId, mes);

  useEffect(() => {
    if (aberto) {
      setValor(String(conta?.valor_aberto || 0));
      setDataLiquidacao(new Date().toISOString().split("T")[0]);
      setFonteSaida("");
      setDesconto(0);
      setJuros(0);
      setMulta(0);
    }
  }, [aberto, conta]);

  const handleSalvar = async () => {
    setSaving(true);
    try {
      const valorLiquidacao = parseFloat(valor) || 0;
      await base44.functions.invoke("registrarLiquidacao", {
        workshop_id: workshopId,
        conta_pagar_id: conta.id,
        tipo: "pagamento",
        valor_liquidacao: valorLiquidacao,
        forma_pagamento: formaPagamento,
        data_liquidacao: dataLiquidacao,
        desconto_concedido: desconto,
        juros_recebido: juros,
        multa_recebida: multa,
      });

      // Atualizar saldo inicial: SUBTRAI da fonte selecionada
      if (fonteSaida && mes) {
        await atualizarSaldoFonte(workshopId, mes, fonteSaida, valorLiquidacao, "subtrai", queryClient);
      }

      toast.success("Pagamento registrado!");
      onSuccess();
      onFechar();
    } catch (error) {
      toast.error("Erro ao registrar pagamento: " + (error.message || "Erro desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  const valorLiquido = (parseFloat(valor) || 0) + juros + multa - desconto;

  return (
    <Dialog open={aberto} onOpenChange={onFechar}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">💳 Registrar Pagamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-0 overflow-y-auto flex-1">
          <div>
            <Label className="text-xs">Fornecedor</Label>
            <p className="text-sm font-medium text-gray-900">{conta?.fornecedor_nome || "—"}</p>
          </div>
          <div>
            <Label className="text-xs">Valor Aberto</Label>
            <p className="text-base font-bold text-red-600">{fmt(conta?.valor_aberto)}</p>
          </div>
          <div>
            <Label className="text-xs">Data de Pagamento</Label>
            <Input type="date" value={dataLiquidacao} onChange={(e) => setDataLiquidacao(e.target.value)} className="mt-0.5 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Valor Pago (R$)</Label>
            <InputMoeda value={parseFloat(valor) || 0} onChange={(e) => setValor(e.target.value)} className="text-right text-sm" />
          </div>
          <div>
            <Label className="text-xs">Forma de Pagamento</Label>
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
          <SeletorFonte
            fontes={fontes}
            fonteSelecionada={fonteSaida}
            onChange={setFonteSaida}
            label="De onde saiu o dinheiro?"
          />
          <div className="grid grid-cols-3 gap-1">
            <div>
              <Label className="text-xs">Desconto</Label>
              <InputMoeda value={desconto} onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)} className="text-right text-xs" />
            </div>
            <div>
              <Label className="text-xs">Juros</Label>
              <InputMoeda value={juros} onChange={(e) => setJuros(parseFloat(e.target.value) || 0)} className="text-right text-xs" />
            </div>
            <div>
              <Label className="text-xs">Multa</Label>
              <InputMoeda value={multa} onChange={(e) => setMulta(parseFloat(e.target.value) || 0)} className="text-right text-xs" />
            </div>
          </div>
          <div className="p-2 bg-red-50 rounded border border-red-200">
            <p className="text-xs text-red-700">Valor Líquido</p>
            <p className="text-lg font-bold text-red-900">{fmt(valorLiquido)}</p>
          </div>
        </div>
        <DialogFooter className="gap-2 pt-2 mt-auto">
          <Button variant="outline" size="sm" onClick={onFechar}>Cancelar</Button>
          <Button size="sm" onClick={handleSalvar} disabled={saving || !valor}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Confirmar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Função auxiliar: atualiza saldo da fonte no saldo inicial ────
async function atualizarSaldoFonte(workshopId, mes, fonteKey, valor, operacao, queryClient) {
  try {
    // BUG FIX: não filtra por tipo — registro pode ter sido criado sem tipo "entrada"
    const records = await base44.entities.DFCLancamento.filter({
      workshop_id: workshopId,
      mes,
      grupo: "saldo_inicial",
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

    // BUG FIX: atualiza TAMBÉM saldo_inicial para refletir no DFCTab
    await base44.entities.DFCLancamento.update(registro.id, {
      detalhes,
      valor: novoTotal,
      saldo_inicial: novoTotal,
    });

    // Invalida todas as queries relacionadas ao saldo inicial
    queryClient.invalidateQueries({ queryKey: ["saldoInicial", workshopId, mes] });
    queryClient.invalidateQueries({ queryKey: ["saldo-inicial-fontes", workshopId, mes] });
    queryClient.invalidateQueries({ queryKey: ["dfc-saldo", workshopId, mes] });
  } catch (e) {
    console.warn("Não foi possível atualizar saldo inicial:", e.message);
  }
}

// ── Lista de Contas ───────────────────────────────────────────────
function ListaContas({ contas, tipo, onRegistrar }) {
  if (!contas?.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Nenhuma conta a {tipo === "receber" ? "receber" : "pagar"} aberta</p>
      </div>
    );
  }

  const statusColors = {
    aberto: "bg-blue-100 text-blue-700",
    parcial: "bg-yellow-100 text-yellow-700",
    pago: "bg-green-100 text-green-700",
    vencido: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-2">
      {contas.map((conta) => (
        <div key={conta.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900">
                {tipo === "receber" ? conta.cliente_nome : conta.fornecedor_nome}
              </p>
              <Badge className={statusColors[conta.status] || statusColors.aberto}>
                {conta.status}
              </Badge>
            </div>
            <p className="text-xs text-gray-500">
              Vencimento: {new Date(conta.data_vencimento).toLocaleDateString("pt-BR")}
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold text-gray-900">{fmt(conta.valor_aberto)}</p>
            <Button size="sm" onClick={() => onRegistrar(conta)} className="mt-1">
              <CheckCircle className="w-3 h-3 mr-1" />
              {tipo === "receber" ? "Receber" : "Pagar"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Componente Principal ──────────────────────────────────────────
export default function ContasReceberPagarTab({ workshopId, mes }) {
  const queryClient = useQueryClient();
  const [contaReceberModal, setContaReceberModal] = useState(null);
  const [contaPagarModal, setContaPagarModal] = useState(null);
  const [contaEstornoModal, setContaEstornoModal] = useState(null); // P1-2: estorno no DRETCMP2
  const [tipoEstorno, setTipoEstorno] = useState(null); // 'receber' | 'pagar'
  const [periodo, setPeriodo] = useState("mensal"); // mensal | anual
  const [ano, setAno] = useState(mes ? parseInt(mes.split('-')[0]) : new Date().getFullYear());
  const [mesSelecionado, setMesSelecionado] = useState(mes ? mes.split('-')[1] : String(new Date().getMonth() + 1).padStart(2, '0'));
  
  // Calcular datas do filtro usando o estado reativo
  const mesPadded = String(mesSelecionado).padStart(2, '0');
  const dataInicio = periodo === "mensal" 
    ? `${ano}-${mesPadded}-01`
    : `${ano}-01-01`;
  const dataFim = periodo === "mensal"
    ? `${ano}-${mesPadded}-31`
    : `${ano}-12-31`;

  // Buscar Contas a Receber com filtro
  // status "$in" para mostrar aberto + parcial (parcial = pago parcialmente, ainda tem saldo)
  // LIMIT 500 para evitar truncamento silencioso
  const { data: contasReceber = [], isLoading: isReceberLoading, refetch: refetchReceber } = useQuery({
    queryKey: ["contas-receber", workshopId, periodo, ano, mesSelecionado],
    queryFn: () => base44.entities.ContaReceber.filter({ 
      workshop_id: workshopId, 
      status: { $in: ["aberto", "parcial"] },
      data_vencimento: { $gte: dataInicio, $lte: dataFim }
    }, "-data_vencimento", 500),
    enabled: !!workshopId,
    staleTime: 0,
  });

  // Buscar Contas a Pagar com filtro
  const { data: contasPagar = [], isLoading: isPagarLoading, refetch: refetchPagar } = useQuery({
    queryKey: ["contas-pagar", workshopId, periodo, ano, mesSelecionado],
    queryFn: () => base44.entities.ContaPagar.filter({ 
      workshop_id: workshopId, 
      status: { $in: ["aberto", "parcial"] },
      data_vencimento: { $gte: dataInicio, $lte: dataFim }
    }, "-data_vencimento", 500),
    enabled: !!workshopId,
    staleTime: 0,
  });

  const handleSuccess = () => {
    // Invalida TODAS as queries relacionadas (prefixo sem "tab" para alinhar com DFCTab)
    queryClient.invalidateQueries({ queryKey: ["contas-receber", workshopId] });
    queryClient.invalidateQueries({ queryKey: ["contas-pagar", workshopId] });
    queryClient.invalidateQueries({ queryKey: ["dre-lancamentos-dfc", workshopId] });
    queryClient.invalidateQueries({ queryKey: ["dre-lancamentos", workshopId] });
    queryClient.invalidateQueries({ queryKey: ["dfc-manuais", workshopId] });
    queryClient.invalidateQueries({ queryKey: ["dfc-saldo", workshopId] });
    queryClient.invalidateQueries({ queryKey: ["liquidacoes"] });
    queryClient.invalidateQueries({ queryKey: ["saldo-inicial-fontes", workshopId] });
    queryClient.invalidateQueries({ queryKey: ["budget-metas"] });
    queryClient.invalidateQueries({ queryKey: ["contas-receber-budget"] });
    queryClient.invalidateQueries({ queryKey: ["contas-pagar-budget"] });
  };

  const totalReceber = contasReceber.reduce((sum, c) => sum + (c.valor_aberto || 0), 0);
  const totalPagar = contasPagar.reduce((sum, c) => sum + (c.valor_aberto || 0), 0);

  if (isReceberLoading || isPagarLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
        <span className="text-gray-500 text-sm">Carregando contas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
        <strong>Contas a Receber/Pagar:</strong> Registre recebimentos e pagamentos que alimentam o DFC automaticamente.
        Os lançamentos são criados na aba DFC quando você confirma o pagamento.
      </div>

      {/* Filtro de Período */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <FiltroPeriodo
          mes={String(mesSelecionado).padStart(2, '0')}
          ano={ano}
          periodo={periodo}
          onMesChange={(novoMes) => setMesSelecionado(novoMes)}
          onAnoChange={(novoAno) => setAno(parseInt(novoAno))}
          onPeriodoChange={(novoPeriodo) => setPeriodo(novoPeriodo)}
        />
      </div>

      <Tabs defaultValue="receber" className="space-y-4">
        <TabsList className="bg-white shadow-md">
          <TabsTrigger value="receber">💰 Contas a Receber</TabsTrigger>
          <TabsTrigger value="pagar">💳 Contas a Pagar</TabsTrigger>
        </TabsList>

        {/* Contas a Receber */}
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
                  <p className="text-sm text-gray-500">Total a Receber</p>
                  <p className="text-2xl font-bold text-green-600">{fmt(totalReceber)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ListaContas 
                contas={contasReceber} 
                tipo="receber" 
                onRegistrar={(conta) => setContaReceberModal(conta)} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contas a Pagar */}
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
                  <p className="text-sm text-gray-500">Total a Pagar</p>
                  <p className="text-2xl font-bold text-red-600">{fmt(totalPagar)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ListaContas 
                contas={contasPagar} 
                tipo="pagar" 
                onRegistrar={(conta) => setContaPagarModal(conta)} 
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modais */}
      {contaReceberModal && (
        <ModalRegistrarRecebimentoShared
          aberto={!!contaReceberModal}
          onFechar={() => setContaReceberModal(null)}
          conta={contaReceberModal}
          workshopId={workshopId}
          mes={`${ano}-${mesPadded}`}
          onSuccess={handleSuccess}
        />
      )}

      {contaPagarModal && (
        <ModalRegistrarPagamentoContaShared
          aberto={!!contaPagarModal}
          onFechar={() => setContaPagarModal(null)}
          conta={contaPagarModal}
          workshopId={workshopId}
          mes={`${ano}-${mesPadded}`}
          onSuccess={handleSuccess}
        />
      )}

      {/* P1-2: Modal de Estorno acessível dentro do DRETCMP2 */}
      {contaEstornoModal && (
        <ModalEstornoTab
          aberto={!!contaEstornoModal}
          onFechar={() => { setContaEstornoModal(null); setTipoEstorno(null); }}
          conta={contaEstornoModal}
          tipo={tipoEstorno}
          onSuccess={() => { setContaEstornoModal(null); setTipoEstorno(null); handleSuccess(); }}
        />
      )}
    </div>
  );
}