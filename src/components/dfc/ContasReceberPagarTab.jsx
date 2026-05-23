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
import { Loader2, DollarSign, CreditCard, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import FiltroPeriodo from "../dre/FiltroPeriodo";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

// ── Modal Registrar Recebimento ───────────────────────────
function ModalRegistrarRecebimento({ aberto, onFechar, conta, workshopId, onSuccess }) {
  const [valor, setValor] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [desconto, setDesconto] = useState(0);
  const [juros, setJuros] = useState(0);
  const [multa, setMulta] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (aberto) {
      setValor(String(conta?.valor_aberto || 0));
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
        desconto_concedido: desconto,
        juros_recebido: juros,
        multa_recebida: multa,
      });
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>💰 Registrar Recebimento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Cliente</Label>
            <p className="text-sm font-medium text-gray-900">{conta?.cliente_nome || "—"}</p>
          </div>
          <div>
            <Label>Valor Aberto</Label>
            <p className="text-lg font-bold text-green-600">{fmt(conta?.valor_aberto)}</p>
          </div>
          <div>
            <Label>Valor Recebido (R$)</Label>
            <InputMoeda value={parseFloat(valor) || 0} onChange={(e) => setValor(e.target.value)} className="text-right" />
          </div>
          <div>
            <Label>Forma de Pagamento</Label>
            <Select value={formaPagamento} onValueChange={setFormaPagamento}>
              <SelectTrigger>
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
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700">Valor Líquido</p>
            <p className="text-2xl font-bold text-green-900">{fmt(valorLiquido)}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={saving || !valor}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Confirmar Recebimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Modal Registrar Pagamento ───────────────────────────
function ModalRegistrarPagamento({ aberto, onFechar, conta, workshopId, onSuccess }) {
  const [valor, setValor] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [desconto, setDesconto] = useState(0);
  const [juros, setJuros] = useState(0);
  const [multa, setMulta] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (aberto) {
      setValor(String(conta?.valor_aberto || 0));
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
        desconto_concedido: desconto,
        juros_recebido: juros,
        multa_recebida: multa,
      });
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>💳 Registrar Pagamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Fornecedor</Label>
            <p className="text-sm font-medium text-gray-900">{conta?.fornecedor_nome || "—"}</p>
          </div>
          <div>
            <Label>Valor Aberto</Label>
            <p className="text-lg font-bold text-red-600">{fmt(conta?.valor_aberto)}</p>
          </div>
          <div>
            <Label>Valor Pago (R$)</Label>
            <InputMoeda value={parseFloat(valor) || 0} onChange={(e) => setValor(e.target.value)} className="text-right" />
          </div>
          <div>
            <Label>Forma de Pagamento</Label>
            <Select value={formaPagamento} onValueChange={setFormaPagamento}>
              <SelectTrigger>
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
          <div className="p-3 bg-red-50 rounded-lg">
            <p className="text-sm text-red-700">Valor Líquido</p>
            <p className="text-2xl font-bold text-red-900">{fmt(valorLiquido)}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={saving || !valor}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Confirmar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
  const [periodo, setPeriodo] = useState("mensal"); // mensal | anual
  const [ano, setAno] = useState(new Date().getFullYear());
  const [mesSelecionado, setMesSelecionado] = useState(mes ? mes.split('-')[1] : new Date().getMonth() + 1);
  
  // Calcular datas do filtro usando o estado reativo
  const mesPadded = String(mesSelecionado).padStart(2, '0');
  const dataInicio = periodo === "mensal" 
    ? `${ano}-${mesPadded}-01`
    : `${ano}-01-01`;
  const dataFim = periodo === "mensal"
    ? `${ano}-${mesPadded}-31`
    : `${ano}-12-31`;

  // Buscar Contas a Receber com filtro
  const { data: contasReceber = [], isLoading: isReceberLoading, refetch: refetchReceber } = useQuery({
    queryKey: ["contas-receber", workshopId, periodo, ano, mesSelecionado],
    queryFn: () => base44.entities.ContaReceber.filter({ 
      workshop_id: workshopId, 
      status: "aberto",
      data_vencimento: { $gte: dataInicio, $lte: dataFim }
    }),
    enabled: !!workshopId,
  });

  // Buscar Contas a Pagar com filtro
  const { data: contasPagar = [], isLoading: isPagarLoading, refetch: refetchPagar } = useQuery({
    queryKey: ["contas-pagar", workshopId, periodo, ano, mesSelecionado],
    queryFn: () => base44.entities.ContaPagar.filter({ 
      workshop_id: workshopId, 
      status: "aberto",
      data_vencimento: { $gte: dataInicio, $lte: dataFim }
    }),
    enabled: !!workshopId,
  });

  const handleSuccess = () => {
    refetchReceber();
    refetchPagar();
    queryClient.invalidateQueries({ queryKey: ["dfc-manuais", workshopId, mes] });
    queryClient.invalidateQueries({ queryKey: ["dre-lancamentos-dfc", workshopId, mes] });
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
        <ModalRegistrarRecebimento
          aberto={!!contaReceberModal}
          onFechar={() => setContaReceberModal(null)}
          conta={contaReceberModal}
          workshopId={workshopId}
          onSuccess={handleSuccess}
        />
      )}

      {contaPagarModal && (
        <ModalRegistrarPagamento
          aberto={!!contaPagarModal}
          onFechar={() => setContaPagarModal(null)}
          conta={contaPagarModal}
          workshopId={workshopId}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}