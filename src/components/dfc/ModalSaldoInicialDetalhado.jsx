import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, X, Building2, CreditCard, Banknote, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ModalSaldoInicialDetalhado({ aberto, onFechar, mes, workshopId }) {
  const queryClient = useQueryClient();

  // ── Busca o registro existente — sempre fresh ──────────────────
  const { data: saldoInicial, isLoading } = useQuery({
    queryKey: ["saldoInicial", workshopId, mes],
    queryFn: async () => {
      if (!workshopId || !mes) return null;
      const records = await base44.entities.DFCLancamento.filter(
        { workshop_id: workshopId, mes, grupo: "saldo_inicial" },
        "-created_date", 1
      );
      return records?.[0] || null;
    },
    enabled: !!workshopId && !!mes && aberto,
    staleTime: 0,
  });

  // ── Estado local apenas para edição em andamento ───────────────
  const detalhes = saldoInicial?.detalhes || { bancos: [], maquinas_cartao: [], caixa: 0 };
  const bancos = detalhes.bancos || [];
  const maquinas = detalhes.maquinas_cartao || [];
  const caixa = detalhes.caixa ?? 0;

  // Estado local do campo caixa (edição inline sem salvar imediatamente)
  const [caixaLocal, setCaixaLocal] = useState(caixa);
  useEffect(() => { setCaixaLocal(caixa); }, [caixa]);

  // ── Mutation central: persiste detalhes completos ──────────────
  const persistirMutation = useMutation({
    mutationFn: async (novosDetalhes) => {
      const total = calcularTotal(novosDetalhes);
      if (saldoInicial?.id) {
        return base44.entities.DFCLancamento.update(saldoInicial.id, {
          detalhes: novosDetalhes,
          valor: total,
          saldo_inicial: total,
        });
      }
      return base44.entities.DFCLancamento.create({
        workshop_id: workshopId,
        mes,
        grupo: "saldo_inicial",
        tipo: "entrada",
        descricao: "Saldo Inicial - Detalhado",
        valor: total,
        saldo_inicial: total,
        detalhes: novosDetalhes,
        origem: "manual",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saldoInicial", workshopId, mes] });
      queryClient.invalidateQueries({ queryKey: ["dfc-saldo", workshopId, mes] });
    },
    onError: (err) => toast.error("Erro ao salvar: " + err.message),
  });

  const calcularTotal = (d) => {
    const totalBancos = (d.bancos || []).reduce((s, b) => s + (Number(b.saldo) || 0), 0);
    const totalMaquinas = (d.maquinas_cartao || []).reduce((s, m) => s + (Number(m.saldo) || 0), 0);
    return totalBancos + totalMaquinas + (Number(d.caixa) || 0);
  };

  const total = calcularTotal({ bancos, maquinas_cartao: maquinas, caixa: caixaLocal });

  // ── Adicionar banco — persiste imediatamente ───────────────────
  const adicionarBanco = () => {
    const novoBanco = {
      id: Date.now().toString(),
      nome: "Novo Banco",
      tipo_conta: "corrente",
      saldo: 0,
      data: new Date().toISOString().split('T')[0],
    };
    const novosDetalhes = {
      bancos: [...bancos, novoBanco],
      maquinas_cartao: maquinas,
      caixa: caixaLocal,
    };
    persistirMutation.mutate(novosDetalhes);
  };

  // ── Adicionar máquina — persiste imediatamente ─────────────────
  const adicionarMaquina = () => {
    const novaMaquina = {
      id: Date.now().toString(),
      nome: "Nova Máquina",
      gateway_pagamento: "",
      saldo: 0,
      data: new Date().toISOString().split('T')[0],
    };
    const novosDetalhes = {
      bancos,
      maquinas_cartao: [...maquinas, novaMaquina],
      caixa: caixaLocal,
    };
    persistirMutation.mutate(novosDetalhes);
  };

  // ── Atualizar campo de banco ───────────────────────────────────
  const atualizarBanco = (id, field, value) => {
    const novosDetalhes = {
      bancos: bancos.map(b => b.id === id ? { ...b, [field]: value } : b),
      maquinas_cartao: maquinas,
      caixa: caixaLocal,
    };
    persistirMutation.mutate(novosDetalhes);
  };

  // ── Atualizar campo de máquina ─────────────────────────────────
  const atualizarMaquina = (id, field, value) => {
    const novosDetalhes = {
      bancos,
      maquinas_cartao: maquinas.map(m => m.id === id ? { ...m, [field]: value } : m),
      caixa: caixaLocal,
    };
    persistirMutation.mutate(novosDetalhes);
  };

  // ── Remover banco ──────────────────────────────────────────────
  const removerBanco = (id) => {
    const novosDetalhes = {
      bancos: bancos.filter(b => b.id !== id),
      maquinas_cartao: maquinas,
      caixa: caixaLocal,
    };
    persistirMutation.mutate(novosDetalhes, {
      onSuccess: () => toast.success("Banco removido."),
    });
  };

  // ── Remover máquina ────────────────────────────────────────────
  const removerMaquina = (id) => {
    const novosDetalhes = {
      bancos,
      maquinas_cartao: maquinas.filter(m => m.id !== id),
      caixa: caixaLocal,
    };
    persistirMutation.mutate(novosDetalhes, {
      onSuccess: () => toast.success("Máquina removida."),
    });
  };

  // ── Salvar caixa (ao blur do campo) ───────────────────────────
  const salvarCaixa = () => {
    persistirMutation.mutate({
      bancos,
      maquinas_cartao: maquinas,
      caixa: Number(caixaLocal) || 0,
    });
  };

  // ── Zerar tudo ────────────────────────────────────────────────
  const zerarTudo = () => {
    persistirMutation.mutate(
      { bancos: [], maquinas_cartao: [], caixa: 0 },
      { onSuccess: () => toast.success("Saldo zerado.") }
    );
  };

  const isSaving = persistirMutation.isPending;

  return (
    <Dialog open={aberto} onOpenChange={onFechar}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            💰 Detalhar Saldo Inicial — {mes}
            {isSaving && <Loader2 className="w-4 h-4 animate-spin text-gray-400 ml-2" />}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
            <span className="text-gray-500">Carregando...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
              📌 Cada banco e máquina adicionado é <strong>salvo automaticamente</strong>. Edite os valores diretamente nas linhas e eles são atualizados ao sair do campo.
            </div>

            {/* ── BANCOS ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold flex items-center gap-2 text-blue-800">
                  <Building2 className="w-4 h-4" /> 🏦 Bancos
                  <span className="text-sm font-normal text-blue-600 ml-1">
                    ({bancos.length} cadastrado{bancos.length !== 1 ? 's' : ''})
                  </span>
                </h3>
                <Button size="sm" variant="outline" onClick={adicionarBanco} disabled={isSaving} className="gap-1 text-blue-700 border-blue-300">
                  <Plus className="w-4 h-4" /> Adicionar Banco
                </Button>
              </div>

              {bancos.length === 0 ? (
                <div className="border-2 border-dashed border-blue-200 rounded-lg p-6 text-center text-gray-400 text-sm">
                  Nenhum banco cadastrado. Clique em "Adicionar Banco" para incluir.
                </div>
              ) : (
                <div className="space-y-2">
                  {bancos.map((banco) => (
                    <div key={banco.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                      <div>
                        <Label className="text-xs text-blue-700">Nome do Banco</Label>
                        <Input
                          placeholder="ex: Banco do Brasil"
                          value={banco.nome}
                          onChange={(e) => {
                            // Atualiza localmente via query cache para feedback imediato
                            queryClient.setQueryData(["saldoInicial", workshopId, mes], (old) => {
                              if (!old) return old;
                              return {
                                ...old,
                                detalhes: {
                                  ...old.detalhes,
                                  bancos: (old.detalhes?.bancos || []).map(b => b.id === banco.id ? { ...b, nome: e.target.value } : b),
                                }
                              };
                            });
                          }}
                          onBlur={(e) => atualizarBanco(banco.id, "nome", e.target.value)}
                          className="mt-1 bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-blue-700">Tipo de Conta</Label>
                        <select
                          value={banco.tipo_conta}
                          onChange={(e) => atualizarBanco(banco.id, "tipo_conta", e.target.value)}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                        >
                          <option value="corrente">Corrente</option>
                          <option value="poupanca">Poupança</option>
                          <option value="aplicacao">Aplicação</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs text-blue-700">Saldo (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={banco.saldo}
                          onChange={(e) => {
                            queryClient.setQueryData(["saldoInicial", workshopId, mes], (old) => {
                              if (!old) return old;
                              return {
                                ...old,
                                detalhes: {
                                  ...old.detalhes,
                                  bancos: (old.detalhes?.bancos || []).map(b => b.id === banco.id ? { ...b, saldo: parseFloat(e.target.value) || 0 } : b),
                                }
                              };
                            });
                          }}
                          onBlur={(e) => atualizarBanco(banco.id, "saldo", parseFloat(e.target.value) || 0)}
                          className="mt-1 bg-white font-semibold"
                        />
                      </div>
                      <div className="flex gap-2 items-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removerBanco(banco.id)}
                          disabled={isSaving}
                          className="text-red-500 hover:bg-red-50 hover:text-red-700"
                          title="Remover banco"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <span className="text-sm font-semibold text-blue-700 ml-1">
                          R$ {fmt(banco.saldo)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-right text-sm font-semibold text-blue-800">
                Subtotal Bancos: R$ {fmt(bancos.reduce((s, b) => s + (Number(b.saldo) || 0), 0))}
              </div>
            </div>

            {/* ── MÁQUINAS ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold flex items-center gap-2 text-green-800">
                  <CreditCard className="w-4 h-4" /> 💳 Máquinas de Cartão
                  <span className="text-sm font-normal text-green-600 ml-1">
                    ({maquinas.length} cadastrada{maquinas.length !== 1 ? 's' : ''})
                  </span>
                </h3>
                <Button size="sm" variant="outline" onClick={adicionarMaquina} disabled={isSaving} className="gap-1 text-green-700 border-green-300">
                  <Plus className="w-4 h-4" /> Adicionar Máquina
                </Button>
              </div>

              {maquinas.length === 0 ? (
                <div className="border-2 border-dashed border-green-200 rounded-lg p-6 text-center text-gray-400 text-sm">
                  Nenhuma máquina cadastrada. Clique em "Adicionar Máquina" para incluir.
                </div>
              ) : (
                <div className="space-y-2">
                  {maquinas.map((maquina) => (
                    <div key={maquina.id} className="bg-green-50 border border-green-200 rounded-lg p-3 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                      <div>
                        <Label className="text-xs text-green-700">Nome da Máquina</Label>
                        <Input
                          placeholder="ex: Stone Loja 1"
                          value={maquina.nome}
                          onChange={(e) => {
                            queryClient.setQueryData(["saldoInicial", workshopId, mes], (old) => {
                              if (!old) return old;
                              return {
                                ...old,
                                detalhes: {
                                  ...old.detalhes,
                                  maquinas_cartao: (old.detalhes?.maquinas_cartao || []).map(m => m.id === maquina.id ? { ...m, nome: e.target.value } : m),
                                }
                              };
                            });
                          }}
                          onBlur={(e) => atualizarMaquina(maquina.id, "nome", e.target.value)}
                          className="mt-1 bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-green-700">Gateway</Label>
                        <select
                          value={maquina.gateway_pagamento}
                          onChange={(e) => atualizarMaquina(maquina.id, "gateway_pagamento", e.target.value)}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                        >
                          <option value="">Selecione...</option>
                          <option value="rede">Rede</option>
                          <option value="stone">Stone</option>
                          <option value="sumup">SumUp</option>
                          <option value="pagseguro">PagSeguro</option>
                          <option value="mercadopago">Mercado Pago</option>
                          <option value="cielo">Cielo</option>
                          <option value="outro">Outro</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs text-green-700">Recebíveis (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={maquina.saldo}
                          onChange={(e) => {
                            queryClient.setQueryData(["saldoInicial", workshopId, mes], (old) => {
                              if (!old) return old;
                              return {
                                ...old,
                                detalhes: {
                                  ...old.detalhes,
                                  maquinas_cartao: (old.detalhes?.maquinas_cartao || []).map(m => m.id === maquina.id ? { ...m, saldo: parseFloat(e.target.value) || 0 } : m),
                                }
                              };
                            });
                          }}
                          onBlur={(e) => atualizarMaquina(maquina.id, "saldo", parseFloat(e.target.value) || 0)}
                          className="mt-1 bg-white font-semibold"
                        />
                      </div>
                      <div className="flex gap-2 items-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removerMaquina(maquina.id)}
                          disabled={isSaving}
                          className="text-red-500 hover:bg-red-50 hover:text-red-700"
                          title="Remover máquina"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <span className="text-sm font-semibold text-green-700 ml-1">
                          R$ {fmt(maquina.saldo)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-right text-sm font-semibold text-green-800">
                Subtotal Máquinas: R$ {fmt(maquinas.reduce((s, m) => s + (Number(m.saldo) || 0), 0))}
              </div>
            </div>

            {/* ── CAIXA ── */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="text-base font-semibold flex items-center gap-2 text-amber-800 mb-3">
                <Banknote className="w-4 h-4" /> 💵 Dinheiro em Caixa (físico)
              </h3>
              <div className="flex items-center gap-3">
                <Label className="text-sm text-amber-700 whitespace-nowrap">Valor R$</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={caixaLocal}
                  onChange={(e) => setCaixaLocal(e.target.value)}
                  onBlur={salvarCaixa}
                  className="w-48 bg-white font-semibold"
                />
                <span className="text-sm text-amber-700">{isSaving ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "✓ salvo ao sair do campo"}</span>
              </div>
            </div>

            {/* ── TOTAL ── */}
            <div className="bg-gray-900 text-white rounded-lg p-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-300">Total Saldo Inicial</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Bancos R$ {fmt(bancos.reduce((s, b) => s + (Number(b.saldo) || 0), 0))} +
                  Máquinas R$ {fmt(maquinas.reduce((s, m) => s + (Number(m.saldo) || 0), 0))} +
                  Caixa R$ {fmt(caixaLocal)}
                </p>
              </div>
              <p className="text-3xl font-bold">R$ {fmt(total)}</p>
            </div>

            {/* ── AÇÕES ── */}
            <div className="flex justify-between items-center pt-2 border-t">
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                disabled={isSaving}
                onClick={zerarTudo}
              >
                🗑️ Zerar tudo
              </Button>
              <Button onClick={onFechar} className="bg-black hover:bg-gray-800">
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}