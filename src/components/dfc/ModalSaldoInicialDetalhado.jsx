import React, { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, X, Building2, CreditCard, Banknote, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─────────────────────────────────────────────────────────────────────────────
// FIX: O estado local é a FONTE DE VERDADE enquanto o modal está aberto.
// O banco de dados é populado na abertura e persistido a cada operação.
// Isso elimina o race condition entre onChange (cache otimista) e onBlur (closure stale).
// ─────────────────────────────────────────────────────────────────────────────

export default function ModalSaldoInicialDetalhado({ aberto, onFechar, mes, workshopId }) {
  const queryClient = useQueryClient();

  // ── Estado local é a fonte de verdade no modal ─────────────────
  const [localDetalhes, setLocalDetalhes] = useState({ bancos: [], maquinas_cartao: [], caixa: 0 });
  const inicializadoRef = useRef(false);

  // ── Busca o registro persistido — apenas na abertura ──────────
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
    staleTime: 30 * 1000, // 30s — evita refetch durante a sessão do modal e a janela de race condition
  });

  // ── Popular estado local com dados do banco (uma vez por abertura) ──
  useEffect(() => {
    if (!aberto) {
      console.log('[DFC-Modal] ❌ Fechado — resetando refs');
      inicializadoRef.current = false;
      registroIdRef.current = null;
      setLocalDetalhes({ bancos: [], maquinas_cartao: [], caixa: 0 });
      return;
    }
    console.log('[DFC-Modal] 🔄 useEffect aberto=true | isLoading=', isLoading, '| inicializado=', inicializadoRef.current, '| saldoInicial=', saldoInicial);
    if (isLoading || inicializadoRef.current) return;
    inicializadoRef.current = true;

    const det = saldoInicial?.detalhes || {};
    console.log('[DFC-Modal] ✅ Inicializando com detalhes:', det);
    const bancos = Array.isArray(det.bancos) ? det.bancos
      : det.banco != null ? [{ id: "legado_banco", nome: "Banco", tipo_conta: "corrente", saldo: det.banco, data: "" }]
      : [];
    const maquinas = Array.isArray(det.maquinas_cartao) ? det.maquinas_cartao
      : det.maquina_cartao != null ? [{ id: "legado_maq", nome: "Máquina", gateway_pagamento: "", saldo: det.maquina_cartao, data: "" }]
      : [];
    console.log('[DFC-Modal] 🏦 bancos:', bancos, '| 💳 maquinas:', maquinas, '| 💵 caixa:', det.caixa);
    setLocalDetalhes({ bancos, maquinas_cartao: maquinas, caixa: det.caixa ?? 0 });
  }, [aberto, isLoading, saldoInicial]);

  // ── Guarda o ID do registro (necessário para updates após criação) ──
  const registroIdRef = useRef(null);
  useEffect(() => {
    if (saldoInicial?.id) registroIdRef.current = saldoInicial.id;
  }, [saldoInicial?.id]);

  const [lastSaved, setLastSaved] = useState(null);

  const persistirMutation = useMutation({
    mutationFn: async (detalhes) => {
      const total = calcTotal(detalhes);
      const idAtual = registroIdRef.current;
      console.log('[DFC-Modal] 💾 persistir chamado | inicializado=', inicializadoRef.current, '| idAtual=', idAtual, '| detalhes=', detalhes);
      if (idAtual) {
        return base44.entities.DFCLancamento.update(idAtual, {
          detalhes,
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
        detalhes,
        origem: "manual",
      });
    },
    onSuccess: (resultado) => {
      console.log('[DFC-Modal] ✅ persistir onSuccess | resultado=', resultado);
      setLastSaved(new Date());
      // Captura o ID do registro recém criado para próximos updates
      if (resultado?.id) registroIdRef.current = resultado.id;
      // Atualiza o cache da query sem disparar refetch (evita resetar estado local)
      if (resultado) {
        queryClient.setQueryData(["saldoInicial", workshopId, mes], resultado);
        queryClient.setQueryData(["saldo-inicial-fontes", workshopId, mes], {
          bancos: resultado.detalhes?.bancos || [],
          maquinas_cartao: resultado.detalhes?.maquinas_cartao || [],
          caixa: resultado.detalhes?.caixa || 0,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["dfc-saldo", workshopId, mes] });
    },
    onError: (err) => { console.error('[DFC-Modal] ❌ persistir onError:', err); toast.error("Erro ao salvar: " + err.message); },
  });

  const calcTotal = (d) => {
    const tb = (d.bancos || []).reduce((s, b) => s + (Number(b.saldo) || 0), 0);
    const tm = (d.maquinas_cartao || []).reduce((s, m) => s + (Number(m.saldo) || 0), 0);
    return tb + tm + (Number(d.caixa) || 0);
  };

  const persistir = useCallback((novoDetalhes) => {
    setLocalDetalhes(novoDetalhes);
    persistirMutation.mutate(novoDetalhes);
  }, [persistirMutation]);

  const total = calcTotal(localDetalhes);
  const isSaving = persistirMutation.isPending;

  // ── Banco: add / update / remove ──────────────────────────────
  const adicionarBanco = () => {
    if (!inicializadoRef.current) return;
    const novo = {
      id: Date.now().toString(),
      nome: "Novo Banco",
      tipo_conta: "corrente",
      saldo: 0,
      data: new Date().toISOString().split('T')[0],
    };
    persistir({ ...localDetalhes, bancos: [...localDetalhes.bancos, novo] });
  };

  const atualizarBanco = (id, field, value) => {
    if (!inicializadoRef.current) return;
    const bancos = localDetalhes.bancos.map(b => b.id === id ? { ...b, [field]: value } : b);
    persistir({ ...localDetalhes, bancos });
  };

  const removerBanco = (id) => {
    const bancos = localDetalhes.bancos.filter(b => b.id !== id);
    persistirMutation.mutate(
      { ...localDetalhes, bancos },
      { onSuccess: () => { setLocalDetalhes(prev => ({ ...prev, bancos })); toast.success("Banco removido."); } }
    );
    setLocalDetalhes(prev => ({ ...prev, bancos }));
  };

  // ── Máquina: add / update / remove ────────────────────────────
  const adicionarMaquina = () => {
    if (!inicializadoRef.current) return;
    const nova = {
      id: Date.now().toString(),
      nome: "Nova Máquina",
      gateway_pagamento: "",
      saldo: 0,
      data: new Date().toISOString().split('T')[0],
    };
    persistir({ ...localDetalhes, maquinas_cartao: [...localDetalhes.maquinas_cartao, nova] });
  };

  const atualizarMaquina = (id, field, value) => {
    if (!inicializadoRef.current) return;
    const maquinas_cartao = localDetalhes.maquinas_cartao.map(m => m.id === id ? { ...m, [field]: value } : m);
    persistir({ ...localDetalhes, maquinas_cartao });
  };

  const removerMaquina = (id) => {
    const maquinas_cartao = localDetalhes.maquinas_cartao.filter(m => m.id !== id);
    persistirMutation.mutate(
      { ...localDetalhes, maquinas_cartao },
      { onSuccess: () => { setLocalDetalhes(prev => ({ ...prev, maquinas_cartao })); toast.success("Máquina removida."); } }
    );
    setLocalDetalhes(prev => ({ ...prev, maquinas_cartao }));
  };

  // ── Caixa: atualiza local sem persistir — persiste no blur ────
  const setCaixa = (v) => setLocalDetalhes(prev => ({ ...prev, caixa: v }));
  // Só salva se o modal já foi inicializado com os dados do banco (evita sobrescrever bancos/máquinas com lista vazia)
  const salvarCaixa = () => {
    console.log('[DFC-Modal] 💵 salvarCaixa | inicializado=', inicializadoRef.current, '| localDetalhes=', localDetalhes);
    if (!inicializadoRef.current) { console.warn('[DFC-Modal] ⚠️ salvarCaixa bloqueado — modal ainda não inicializado'); return; }
    persistir({ ...localDetalhes, caixa: Number(localDetalhes.caixa) || 0 });
  };

  // ── Zerar tudo ────────────────────────────────────────────────
  const zerarTudo = () => {
    const vazio = { bancos: [], maquinas_cartao: [], caixa: 0 };
    setLocalDetalhes(vazio);
    persistirMutation.mutate(vazio, { onSuccess: () => toast.success("Saldo zerado.") });
  };

  // ── Fechar: invalida queries e notifica pai ────────────────────
  const handleFechar = async () => {
    await queryClient.invalidateQueries({ queryKey: ["dfc-saldo", workshopId, mes] });
    await queryClient.refetchQueries({ queryKey: ["dfc-saldo", workshopId, mes], type: "active" });
    onFechar();
  };

  return (
    <Dialog open={aberto} onOpenChange={handleFechar}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            💰 Saldo Inicial Detalhado — {mes}
            {isSaving
              ? <span className="flex items-center gap-1 text-xs text-amber-600 font-normal ml-2"><Loader2 className="w-3 h-3 animate-spin" /> Salvando...</span>
              : lastSaved
                ? <span className="flex items-center gap-1 text-xs text-emerald-600 font-normal ml-2"><CheckCircle2 className="w-3 h-3" /> Salvo</span>
                : null
            }
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
            <span className="text-gray-500">Carregando dados do banco...</span>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
              📌 <strong>Auto-save ativo:</strong> Qualquer adição, remoção ou edição (ao sair do campo) é salva automaticamente no banco de dados e refletida no card de Saldo Inicial.
            </div>

            {/* ══ BANCOS ══ */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-blue-800">
                  <Building2 className="w-4 h-4" /> 🏦 Contas Bancárias
                  <span className="text-xs font-normal text-blue-500">({localDetalhes.bancos.length})</span>
                </h3>
                <Button size="sm" variant="outline" onClick={adicionarBanco} disabled={isSaving}
                  className="gap-1 text-xs text-blue-700 border-blue-300 h-7">
                  <Plus className="w-3 h-3" /> Adicionar Banco
                </Button>
              </div>

              {localDetalhes.bancos.length === 0 ? (
                <div className="border-2 border-dashed border-blue-200 rounded-lg p-5 text-center text-gray-400 text-xs">
                  Nenhuma conta bancária. Clique em "+ Adicionar Banco".
                </div>
              ) : (
                <div className="space-y-2">
                  {localDetalhes.bancos.map((banco) => (
                    <BancoRow
                      key={banco.id}
                      banco={banco}
                      onUpdate={atualizarBanco}
                      onRemove={removerBanco}
                      disabled={isSaving}
                    />
                  ))}
                </div>
              )}
              <div className="text-right text-xs font-semibold text-blue-700">
                Subtotal Bancos: R$ {fmt(localDetalhes.bancos.reduce((s, b) => s + (Number(b.saldo) || 0), 0))}
              </div>
            </section>

            {/* ══ MÁQUINAS ══ */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-green-800">
                  <CreditCard className="w-4 h-4" /> 💳 Máquinas de Cartão
                  <span className="text-xs font-normal text-green-500">({localDetalhes.maquinas_cartao.length})</span>
                </h3>
                <Button size="sm" variant="outline" onClick={adicionarMaquina} disabled={isSaving}
                  className="gap-1 text-xs text-green-700 border-green-300 h-7">
                  <Plus className="w-3 h-3" /> Adicionar Máquina
                </Button>
              </div>

              {localDetalhes.maquinas_cartao.length === 0 ? (
                <div className="border-2 border-dashed border-green-200 rounded-lg p-5 text-center text-gray-400 text-xs">
                  Nenhuma máquina cadastrada. Clique em "+ Adicionar Máquina".
                </div>
              ) : (
                <div className="space-y-2">
                  {localDetalhes.maquinas_cartao.map((maquina) => (
                    <MaquinaRow
                      key={maquina.id}
                      maquina={maquina}
                      onUpdate={atualizarMaquina}
                      onRemove={removerMaquina}
                      disabled={isSaving}
                    />
                  ))}
                </div>
              )}
              <div className="text-right text-xs font-semibold text-green-700">
                Subtotal Máquinas: R$ {fmt(localDetalhes.maquinas_cartao.reduce((s, m) => s + (Number(m.saldo) || 0), 0))}
              </div>
            </section>

            {/* ══ CAIXA ══ */}
            <section className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-800 mb-3">
                <Banknote className="w-4 h-4" /> 💵 Dinheiro em Caixa (físico)
              </h3>
              <div className="flex items-center gap-3">
                <Label className="text-xs text-amber-700 whitespace-nowrap">Valor R$</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={localDetalhes.caixa}
                  onChange={(e) => setCaixa(e.target.value)}
                  onBlur={salvarCaixa}
                  className="w-44 bg-white font-semibold text-sm"
                />
                <span className="text-xs text-amber-600">salva ao sair do campo</span>
              </div>
            </section>

            {/* ══ TOTAL ══ */}
            <div className="bg-gray-900 text-white rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-300 font-medium">Total Saldo Inicial do Mês</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Bancos R${fmt(localDetalhes.bancos.reduce((s,b)=>s+(Number(b.saldo)||0),0))}
                  {' + '}Máquinas R${fmt(localDetalhes.maquinas_cartao.reduce((s,m)=>s+(Number(m.saldo)||0),0))}
                  {' + '}Caixa R${fmt(localDetalhes.caixa)}
                </p>
              </div>
              <p className="text-3xl font-bold tabular-nums">R$ {fmt(total)}</p>
            </div>

            {/* ══ NOTA SINCRONISMO ══ */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-500 space-y-1">
              <p className="font-semibold text-gray-700">ℹ️ Sincronismo com o DFC</p>
              <p>• O <strong>Total acima</strong> atualiza o card "Saldo Inicial do Mês" ao fechar este modal.</p>
              <p>• O <strong>Saldo Final do DFC</strong> = Saldo Inicial + Fluxo Operacional + Investimento + Financiamento.</p>
              <p>• Contas a Pagar/Receber liquidadas são lançadas como <strong>saídas/entradas do Operacional</strong>, reduzindo ou aumentando o saldo final — não o saldo inicial.</p>
            </div>

            {/* ══ AÇÕES ══ */}
            <div className="flex justify-between items-center pt-2 border-t">
              <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                disabled={isSaving} onClick={zerarTudo}>
                🗑️ Zerar tudo
              </Button>
              <Button onClick={handleFechar} className="bg-black hover:bg-gray-800 text-sm">
                Fechar e Atualizar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── BancoRow — estado local inicializado dos props; key={banco.id} garante remontagem quando necessário ──
function BancoRow({ banco, onUpdate, onRemove, disabled }) {
  const [nome, setNome] = useState(banco.nome);
  const [saldo, setSaldo] = useState(banco.saldo);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
      <div>
        <Label className="text-xs text-blue-700">Nome do Banco</Label>
        <Input
          placeholder="ex: Banco do Brasil"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onBlur={() => onUpdate(banco.id, "nome", nome)}
          className="mt-1 bg-white text-sm"
          disabled={disabled}
        />
      </div>
      <div>
        <Label className="text-xs text-blue-700">Tipo de Conta</Label>
        <select
          value={banco.tipo_conta}
          onChange={(e) => onUpdate(banco.id, "tipo_conta", e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
          disabled={disabled}
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
          value={saldo}
          onChange={(e) => setSaldo(e.target.value)}
          onBlur={() => onUpdate(banco.id, "saldo", parseFloat(saldo) || 0)}
          className="mt-1 bg-white font-semibold text-sm"
          disabled={disabled}
        />
      </div>
      <div className="flex items-center gap-2 justify-between">
        <span className="text-sm font-bold text-blue-800">R$ {fmt(saldo)}</span>
        <Button size="icon" variant="ghost" onClick={() => onRemove(banco.id)} disabled={disabled}
          className="text-red-500 hover:bg-red-50 hover:text-red-700 h-8 w-8">
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── MaquinaRow — estado local inicializado dos props; key={maquina.id} garante remontagem quando necessário ──
function MaquinaRow({ maquina, onUpdate, onRemove, disabled }) {
  const [nome, setNome] = useState(maquina.nome);
  const [saldo, setSaldo] = useState(maquina.saldo);

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-3 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
      <div>
        <Label className="text-xs text-green-700">Nome da Máquina</Label>
        <Input
          placeholder="ex: Stone Loja 1"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onBlur={() => onUpdate(maquina.id, "nome", nome)}
          className="mt-1 bg-white text-sm"
          disabled={disabled}
        />
      </div>
      <div>
        <Label className="text-xs text-green-700">Gateway</Label>
        <select
          value={maquina.gateway_pagamento}
          onChange={(e) => onUpdate(maquina.id, "gateway_pagamento", e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
          disabled={disabled}
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
          value={saldo}
          onChange={(e) => setSaldo(e.target.value)}
          onBlur={() => onUpdate(maquina.id, "saldo", parseFloat(saldo) || 0)}
          className="mt-1 bg-white font-semibold text-sm"
          disabled={disabled}
        />
      </div>
      <div className="flex items-center gap-2 justify-between">
        <span className="text-sm font-bold text-green-800">R$ {fmt(saldo)}</span>
        <Button size="icon" variant="ghost" onClick={() => onRemove(maquina.id)} disabled={disabled}
          className="text-red-500 hover:bg-red-50 hover:text-red-700 h-8 w-8">
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}