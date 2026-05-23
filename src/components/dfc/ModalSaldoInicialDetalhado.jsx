import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, X, Building2, CreditCard, Banknote } from "lucide-react";
import { toast } from "sonner";

export default function ModalSaldoInicialDetalhado({ aberto, onFechar, mes, workshopId, saldoSimples = 0 }) {
  const queryClient = useQueryClient();
  const [detalhes, setDetalhes] = useState({ bancos: [], maquinas_cartao: [], caixa: 0 });
  
  // Buscar registro de saldo inicial
  const { data: saldoInicial } = useQuery({
    queryKey: ["saldoInicial", workshopId, mes],
    queryFn: async () => {
      if (!workshopId || !mes) return null;
      // Buscar o registro que pode ter sido criado tanto com tipo "entrada" quanto sem tipo
      const records = await base44.entities.DFCLancamento.filter({
        workshop_id: workshopId,
        mes,
        grupo: "saldo_inicial",
      }, "-created_date", 1);
      return records?.[0] || null;
    },
    enabled: !!workshopId && !!mes && aberto,
    refetchOnMount: true,
    staleTime: 0,
  });

  // Reset ao abrir: se já há detalhes salvos, usa eles. 
  // Senão, pré-popula o caixa com o valor digitado no campo simples (se houver).
  useEffect(() => {
    if (!aberto) return;
    if (saldoInicial?.detalhes && (
      (saldoInicial.detalhes.bancos?.length > 0) ||
      (saldoInicial.detalhes.maquinas_cartao?.length > 0) ||
      (saldoInicial.detalhes.caixa > 0)
    )) {
      setDetalhes({
        bancos: saldoInicial.detalhes.bancos || [],
        maquinas_cartao: saldoInicial.detalhes.maquinas_cartao || [],
        caixa: saldoInicial.detalhes.caixa || 0,
      });
    } else {
      // Pré-popula o caixa com o saldo simples já digitado (sincronismo bidirecional)
      setDetalhes({ bancos: [], maquinas_cartao: [], caixa: saldoSimples || 0 });
    }
  }, [aberto, saldoInicial, saldoSimples]);

  // Salvar detalhes
  const salvarMutation = useMutation({
    mutationFn: async (data) => {
      const total = calcularTotal(data);
      if (saldoInicial?.id) {
        await base44.entities.DFCLancamento.update(saldoInicial.id, {
          detalhes: data,
          valor: total,
          saldo_inicial: total, // BUG FIX: sincroniza com o campo lido pelo DFCTab
        });
      } else {
        await base44.entities.DFCLancamento.create({
          workshop_id: workshopId,
          mes,
          grupo: "saldo_inicial",
          tipo: "entrada",
          descricao: "Saldo Inicial - Detalhado",
          valor: total,
          saldo_inicial: total, // BUG FIX: sincroniza com o campo lido pelo DFCTab
          detalhes: data,
          origem: "manual"
        });
      }
    },
    onSuccess: () => {
      // BUG FIX: invalida AMBAS as queries (saldoInicial + dfc-saldo usado pelo DFCTab)
      queryClient.invalidateQueries({ queryKey: ["saldoInicial", workshopId, mes] });
      queryClient.invalidateQueries({ queryKey: ["dfc-saldo", workshopId, mes] });
      toast.success("Saldo detalhado salvo com sucesso!");
      onFechar();
    },
    onError: (err) => {
      toast.error("Erro ao salvar: " + err.message);
    },
  });

  const calcularTotal = (d) => {
    const bancos = d.bancos?.reduce((sum, b) => sum + (b.saldo || 0), 0) || 0;
    const maquinas = d.maquinas_cartao?.reduce((sum, m) => sum + (m.saldo || 0), 0) || 0;
    return bancos + maquinas + (d.caixa || 0);
  };

  const adicionarBanco = () => {
    setDetalhes({
      ...detalhes,
      bancos: [...detalhes.bancos, { id: Date.now().toString(), nome: "", tipo_conta: "corrente", saldo: 0, data: new Date().toISOString().split('T')[0] }]
    });
  };

  const removerBanco = (id) => {
    setDetalhes({
      ...detalhes,
      bancos: detalhes.bancos.filter(b => b.id !== id)
    });
  };

  const atualizarBanco = (id, field, value) => {
    setDetalhes({
      ...detalhes,
      bancos: detalhes.bancos.map(b => 
        b.id === id ? { ...b, [field]: value } : b
      )
    });
  };

  const adicionarMaquina = () => {
    setDetalhes({
      ...detalhes,
      maquinas_cartao: [...detalhes.maquinas_cartao, { 
        id: Date.now().toString(), 
        nome: "", 
        gateway_pagamento: "", 
        saldo: 0, 
        data: new Date().toISOString().split('T')[0] 
      }]
    });
  };

  const removerMaquina = (id) => {
    setDetalhes({
      ...detalhes,
      maquinas_cartao: detalhes.maquinas_cartao.filter(m => m.id !== id)
    });
  };

  const atualizarMaquina = (id, field, value) => {
    setDetalhes({
      ...detalhes,
      maquinas_cartao: detalhes.maquinas_cartao.map(m => 
        m.id === id ? { ...m, [field]: value } : m
      )
    });
  };

  const total = calcularTotal(detalhes);

  return (
    <Dialog open={aberto} onOpenChange={onFechar}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            👁️ Detalhar Saldo Inicial - {mes}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900">
              📌 Como funciona: Detalhe cada "gaveta" onde seu dinheiro está. O total será usado como saldo inicial.
            </p>
          </div>

          {/* BANCOS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                🏦 Bancos
              </h3>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={adicionarBanco}
                className="gap-1"
              >
                <Plus className="w-4 h-4" /> Adicionar Banco
              </Button>
            </div>

            {detalhes.bancos.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Nenhum banco cadastrado</p>
            ) : (
              <div className="space-y-2 bg-blue-50 p-4 rounded-lg">
                {detalhes.bancos.map((banco) => (
                  <div key={banco.id} className="bg-white p-3 rounded-lg border border-blue-200 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div>
                      <Label className="text-xs">Nome do Banco</Label>
                      <Input
                        placeholder="ex: Banco do Brasil"
                        value={banco.nome}
                        onChange={(e) => atualizarBanco(banco.id, "nome", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Tipo de Conta</Label>
                      <select
                        value={banco.tipo_conta}
                        onChange={(e) => atualizarBanco(banco.id, "tipo_conta", e.target.value)}
                        className="mt-1 w-full px-3 py-2 border rounded-md text-sm"
                      >
                        <option value="corrente">Corrente</option>
                        <option value="poupanca">Poupança</option>
                        <option value="aplicacao">Aplicação</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Saldo (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={banco.saldo}
                        onChange={(e) => atualizarBanco(banco.id, "saldo", parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label className="text-xs">Data</Label>
                        <Input
                          type="date"
                          value={banco.data}
                          onChange={(e) => atualizarBanco(banco.id, "data", e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => removerBanco(banco.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 mt-6"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <p className="text-sm font-medium text-blue-900">
              Total Bancos: <span className="text-xl text-blue-600">R$ {detalhes.bancos.reduce((sum, b) => sum + (b.saldo || 0), 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </p>
          </div>

          {/* MÁQUINAS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-green-600" />
                💳 Máquinas de Cartão
              </h3>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={adicionarMaquina}
                className="gap-1"
              >
                <Plus className="w-4 h-4" /> Adicionar Máquina
              </Button>
            </div>

            {detalhes.maquinas_cartao.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Nenhuma máquina cadastrada</p>
            ) : (
              <div className="space-y-2 bg-green-50 p-4 rounded-lg">
                {detalhes.maquinas_cartao.map((maquina) => (
                  <div key={maquina.id} className="bg-white p-3 rounded-lg border border-green-200 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div>
                      <Label className="text-xs">Nome da Máquina</Label>
                      <Input
                        placeholder="ex: Máquina Loja 1"
                        value={maquina.nome}
                        onChange={(e) => atualizarMaquina(maquina.id, "nome", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Gateway de Pagamento</Label>
                      <select
                        value={maquina.gateway_pagamento}
                        onChange={(e) => atualizarMaquina(maquina.id, "gateway_pagamento", e.target.value)}
                        className="mt-1 w-full px-3 py-2 border rounded-md text-sm"
                      >
                        <option value="">Selecione...</option>
                        <option value="rede">Rede Adquirente</option>
                        <option value="stone">Stone</option>
                        <option value="sumup">Sumup</option>
                        <option value="pagseguro">PagSeguro</option>
                        <option value="mercadopago">Mercado Pago</option>
                        <option value="outro">Outro</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Saldo/Recebíveis (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={maquina.saldo}
                        onChange={(e) => atualizarMaquina(maquina.id, "saldo", parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label className="text-xs">Data</Label>
                        <Input
                          type="date"
                          value={maquina.data}
                          onChange={(e) => atualizarMaquina(maquina.id, "data", e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => removerMaquina(maquina.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 mt-6"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-sm font-medium text-green-900">
              Total Máquinas: <span className="text-xl text-green-600">R$ {detalhes.maquinas_cartao.reduce((sum, m) => sum + (m.saldo || 0), 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </p>
          </div>

          {/* CAIXA */}
          <div className="space-y-3 bg-amber-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Banknote className="w-5 h-5 text-amber-600" />
              💵 Dinheiro em Caixa
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={detalhes.caixa}
                  onChange={(e) => setDetalhes({...detalhes, caixa: parseFloat(e.target.value) || 0})}
                  className="mt-2"
                />
              </div>
              <div className="flex items-end">
                <p className="text-lg font-medium">
                  Saldo: <span className="text-2xl text-amber-600">R$ {(detalhes.caixa || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </p>
              </div>
            </div>
          </div>

          {/* TOTAL GERAL */}
          <div className="bg-gray-100 p-4 rounded-lg border-2 border-gray-300">
            <div className="flex justify-between items-center">
              <p className="text-lg font-bold">Total Geral</p>
              <p className="text-3xl font-bold text-gray-900">
                R$ {total.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </p>
            </div>
          </div>

          {/* BUTTONS */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onFechar}>
              Cancelar
            </Button>
            <Button 
              onClick={() => salvarMutation.mutate(detalhes)}
              disabled={salvarMutation.isPending}
              className="bg-black hover:bg-gray-800"
            >
              {salvarMutation.isPending ? "Salvando..." : "Salvar Saldo Detalhado"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}