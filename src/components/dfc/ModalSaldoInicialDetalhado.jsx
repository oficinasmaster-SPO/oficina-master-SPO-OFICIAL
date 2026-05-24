import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, X, Building2, CreditCard, Banknote, Loader2, CheckCircle2, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import SimulacaoBanner from "./SimulacaoBanner";

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

  // ── MODO SIMULAÇÃO (opcional) ─────────────────────────────────
  const [modoSimulacao, setModoSimulacao] = useState(false);
  
  // ── Busca o registro persistido — apenas na abertura ──────────
  const { data: saldoInicial, isLoading, refetch } = useQuery({
    queryKey: ["saldoInicial", workshopId, mes],
    queryFn: async () => {
      if (!workshopId || !mes) return null;
      const records = await base44.entities.DFCLancamento.filter(
        { workshop_id: workshopId, mes, grupo: "saldo_inicial" },
        "-updated_date", 10
      );
      if (!records || records.length === 0) return null;
      // Prioriza o registro que tem detalhes no formato novo (bancos/maquinas_cartao como arrays)
      const comDetalhesNovos = records.find(r => 
        r.detalhes && (Array.isArray(r.detalhes.bancos) || Array.isArray(r.detalhes.maquinas_cartao))
      );
      return comDetalhesNovos || records[0];
    },
    enabled: !!workshopId && !!mes && aberto && !modoSimulacao,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  // Dados de simulação (usados apenas quando modoSimulacao=true)
  const saldoInicialSimulado = React.useMemo(() => ({
    id: "simulado",
    workshop_id: workshopId,
    mes,
    grupo: "saldo_inicial",
    tipo: "entrada",
    descricao: "Saldo Inicial Simulado",
    valor: 10000,
    saldo_inicial: 10000,
    detalhes: {
      bancos: [
        { id: "sim_1", nome: "Banco Simulação 1", tipo_conta: "corrente", saldo: 5000, data: "" },
        { id: "sim_2", nome: "Banco Simulação 2", tipo_conta: "poupanca", saldo: 3000, data: "" }
      ],
      maquinas_cartao: [
        { id: "sim_3", nome: "Stone Simulação", gateway_pagamento: "stone", saldo: 2000, data: "" }
      ],
      caixa: 0
    },
    created_date: new Date().toISOString()
  }), [workshopId, mes]);

  // Usa dados simulados ou reais dependendo do modo
  const saldoInicialEfetivo = modoSimulacao ? saldoInicialSimulado : saldoInicial;
  const isLoadingEfetivo = modoSimulacao ? false : isLoading;

  // ── Sanitização silenciosa na abertura: limpa legados do banco sem interferir na hidratação ──
  useEffect(() => {
    if (!aberto || !workshopId || !mes || modoSimulacao) return;
    // Fire-and-forget — não faz refetch para não sobrescrever estado já hidratado
    base44.functions.invoke('sanitizarSaldoInicial', { workshop_id: workshopId, mes }).catch(() => {});
  }, [aberto, workshopId, mes, modoSimulacao]);

  // ── Popular estado local com dados do banco (uma vez por abertura) ──
  useEffect(() => {
    if (!aberto) {
      console.log('[DFC-Modal] ❌ Fechado — resetando refs');
      inicializadoRef.current = false;
      registroIdRef.current = null;
      setLocalDetalhes({ bancos: [], maquinas_cartao: [], caixa: 0 });
      return;
    }
    console.log('[DFC-Modal] 🔄 useEffect aberto=true | isLoadingEfetivo=', isLoadingEfetivo, '| inicializado=', inicializadoRef.current, '| saldoInicialEfetivo=', saldoInicialEfetivo);
    if (isLoadingEfetivo || inicializadoRef.current) return;
    inicializadoRef.current = true;

    const det = saldoInicialEfetivo?.detalhes || {};
    console.log('[DFC-Modal] ✅ Inicializando com detalhes:', det);
    const bancos = Array.isArray(det.bancos) ? det.bancos
      : det.banco != null ? [{ id: "legado_banco", nome: "Banco", tipo_conta: "corrente", saldo: det.banco, data: "" }]
      : [];
    const maquinas = Array.isArray(det.maquinas_cartao) ? det.maquinas_cartao
      : det.maquina_cartao != null ? [{ id: "legado_maq", nome: "Máquina", gateway_pagamento: "", saldo: det.maquina_cartao, data: "" }]
      : [];
    const caixaValue = typeof det.caixa === 'number' ? det.caixa : (det.caixa != null ? Number(det.caixa) : 0);
    console.log('[DFC-Modal] 🏦 bancos:', bancos, '| 💳 maquinas:', maquinas, '| 💵 caixa:', caixaValue);
    setLocalDetalhes({ bancos: bancos || [], maquinas_cartao: maquinas || [], caixa: caixaValue });
  }, [aberto, isLoadingEfetivo, saldoInicialEfetivo]);

  // ── Guarda o ID do registro (necessário para updates após criação) ──
  const registroIdRef = useRef(null);
  useEffect(() => {
    if (saldoInicialEfetivo?.id && !modoSimulacao) registroIdRef.current = saldoInicialEfetivo.id;
  }, [saldoInicialEfetivo?.id, modoSimulacao]);

  // ── Verifica se há liquidações no mês (bloqueia edição) ─────────
  const { data: hasLiquidacoes = false } = useQuery({
    queryKey: ["has-liquidacoes", workshopId, mes],
    queryFn: async () => {
      if (!workshopId || !mes) return false;
      const liquidacoes = await base44.entities['LiquidaçãoFinanceira'].filter(
        { workshop_id: workshopId },
        '-data_liquidacao',
        1
      );
      if (!liquidacoes || liquidacoes.length === 0) return false;
      // Verifica se alguma liquidação é do mês
      const liquidacoesDoMes = liquidacoes.filter(liq => {
        const dataLiq = new Date(liq.data_liquidacao);
        const mesAno = `${dataLiq.getFullYear()}-${String(dataLiq.getMonth() + 1).padStart(2, '0')}`;
        return mesAno === mes;
      });
      return liquidacoesDoMes.length > 0;
    },
    enabled: !!workshopId && !!mes && aberto,
    staleTime: 5 * 60 * 1000,
  });

  const bloqueadoPorLiquidacao = hasLiquidacoes;

  const [lastSaved, setLastSaved] = useState(null);
  const [modalFormAberto, setModalFormAberto] = useState(false);
  const [tipoForm, setTipoForm] = useState(null); // 'banco' ou 'maquina'
  const [formData, setFormData] = useState({ nome: '', saldo: 0, tipo_conta: 'corrente', gateway: '' });

  const persistirMutation = useMutation({
    mutationFn: async ({ detalhes, tipo_alteracao = 'edicao', detalhes_anteriores = null, _detalhesParaCache }) => {
      // Em modo simulação, não persiste no banco - apenas atualiza o estado local
      if (modoSimulacao) {
        console.log('[DFC-Modal] 🧪 MODO SIMULAÇÃO - não persiste no banco');
        return { id: 'simulado', detalhes, valor: calcTotal(detalhes) };
      }
      
      const total = calcTotal(detalhes);
      // ✅ FIX: Busca o ID mais recente do banco em vez de confiar na ref que pode estar stale
      const registrosExistentes = await base44.entities.DFCLancamento.filter(
        { workshop_id: workshopId, mes, grupo: "saldo_inicial" },
        "-updated_date", 1
      );
      const idAtual = registrosExistentes?.[0]?.id || registroIdRef.current;
      console.log('[DFC-Modal] 💾 persistir chamado | inicializado=', inicializadoRef.current, '| idAtual=', idAtual, '| detalhes=', detalhes);
      
      let resultado;
      if (idAtual) {
        resultado = await base44.entities.DFCLancamento.update(idAtual, {
          detalhes,
          valor: total,
          saldo_inicial: total,
        });
      } else {
        resultado = await base44.entities.DFCLancamento.create({
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
      }
      // Garante que o objeto retornado SEMPRE tem os detalhes corretos no formato novo
      // O backend às vezes retorna sem o campo detalhes ou com o formato antigo
      resultado = { ...resultado, detalhes };

      // Sanitização silenciosa pós-save: remove registros legados/duplicados no backend
      // Não bloqueia o fluxo — erro é ignorado intencionalmente
      base44.functions.invoke('sanitizarSaldoInicial', { workshop_id: workshopId, mes }).catch(() => {});

      // Registrar histórico se houver mudança
      if (detalhes_anteriores && idAtual) {
        const valorAnterior = calcTotal(detalhes_anteriores);
        const valorDelta = total - valorAnterior;
        
        // Determinar qual campo mudou
        let campoAlterado = null;
        if (JSON.stringify(detalhes_anteriores.bancos) !== JSON.stringify(detalhes.bancos)) {
          campoAlterado = 'bancos';
        } else if (JSON.stringify(detalhes_anteriores.maquinas_cartao) !== JSON.stringify(detalhes.maquinas_cartao)) {
          campoAlterado = 'maquinas_cartao';
        } else if (detalhes_anteriores.caixa !== detalhes.caixa) {
          campoAlterado = 'caixa';
        }

        await base44.functions.invoke('registrarHistoricoSaldo', {
          workshop_id: workshopId,
          dfc_lancamento_id: idAtual,
          mes,
          tipo_alteracao,
          valor_anterior: valorAnterior,
          valor_novo: total,
          detalhes_anteriores,
          detalhes_novos: detalhes,
          campo_alterado: campoAlterado,
          valor_delta: valorDelta,
          origem_alteracao: 'modal_saldo_inicial',
        });
      }

      return resultado;
    },
    onSuccess: (resultado) => {
      console.log('[DFC-Modal] ✅ persistir onSuccess | resultado=', resultado);
      setLastSaved(new Date());
      if (!modoSimulacao && resultado?.id) {
        registroIdRef.current = resultado.id;
        // Atualiza o cache da query com os dados reais salvos para que ao reabrir o modal os detalhes sejam carregados corretamente
        queryClient.setQueryData(["saldoInicial", workshopId, mes], resultado);
        queryClient.invalidateQueries({ queryKey: ["dfc-saldo", workshopId, mes] });
      }
    },
    onError: (err) => { 
      if (!modoSimulacao) {
        console.error('[DFC-Modal] ❌ persistir onError:', err); 
        toast.error("Erro ao salvar: " + err.message);
      }
    },
  });

  const calcTotal = (d) => {
    const tb = (d.bancos || []).reduce((s, b) => s + (Number(b.saldo) || 0), 0);
    const tm = (d.maquinas_cartao || []).reduce((s, m) => s + (Number(m.saldo) || 0), 0);
    return tb + tm + (Number(d.caixa) || 0);
  };

  const persistir = useCallback((novoDetalhes, tipo_alteracao = 'edicao', detalhes_anteriores = null) => {
    console.log('[DFC-Modal] 📝 persistir | novoDetalhes=', novoDetalhes);
    setLocalDetalhes(novoDetalhes);
    persistirMutation.mutate({ detalhes: novoDetalhes, tipo_alteracao, detalhes_anteriores });
  }, [persistirMutation]);



  const total = calcTotal(localDetalhes);
  const isSaving = persistirMutation.isPending;

  // ── Banco: add / update / remove ──────────────────────────────
  const adicionarBanco = () => {
    setTipoForm('banco');
    setFormData({ nome: '', saldo: 0, tipo_conta: 'corrente', gateway: '' });
    setModalFormAberto(true);
  };

  const confirmarAdicionarBanco = () => {
    if (!formData.nome.trim()) {
      toast.error("Digite o nome do banco");
      return;
    }
    if (!inicializadoRef.current) return;
    const novo = {
      id: Date.now().toString(),
      nome: formData.nome.trim(),
      tipo_conta: formData.tipo_conta,
      saldo: Number(formData.saldo) || 0,
      data: new Date().toISOString().split('T')[0],
    };
    const bancosAtuais = Array.isArray(localDetalhes?.bancos) ? localDetalhes.bancos : [];
    const detalhesAntes = { ...localDetalhes, bancos: [...bancosAtuais] };
    const novosDetalhes = { ...localDetalhes, bancos: [...bancosAtuais, novo] };
    persistir(novosDetalhes, 'edicao', detalhesAntes);
    setFormData({ nome: '', saldo: 0, tipo_conta: 'corrente', gateway: '' });
    setModalFormAberto(false);
    toast.success("✅ Banco adicionado e salvo!");
  };

  const atualizarBanco = (id, field, value) => {
    if (!inicializadoRef.current) return;
    const bancos = (localDetalhes?.bancos || []).map(b => b.id === id ? { ...b, [field]: value } : b);
    const detalhesAntes = { ...localDetalhes, bancos: [...(localDetalhes?.bancos || [])] };
    persistir({ ...localDetalhes, bancos }, 'edicao', detalhesAntes);
  };

  const removerBanco = (id) => {
    const bancos = (localDetalhes?.bancos || []).filter(b => b.id !== id);
    const detalhesAntes = { ...localDetalhes, bancos: [...(localDetalhes?.bancos || [])] };
    persistirMutation.mutate(
      { detalhes: { ...localDetalhes, bancos }, tipo_alteracao: 'edicao', detalhes_anteriores: detalhesAntes },
      { onSuccess: () => { setLocalDetalhes(prev => ({ ...prev, bancos })); toast.success("Banco removido."); } }
    );
    setLocalDetalhes(prev => ({ ...prev, bancos }));
  };

  // ── Máquina: add / update / remove ────────────────────────────
  const adicionarMaquina = () => {
    setTipoForm('maquina');
    setFormData({ nome: '', saldo: 0, tipo_conta: '', gateway: '' });
    setModalFormAberto(true);
  };

  const confirmarAdicionarMaquina = () => {
    if (!formData.nome.trim()) {
      toast.error("Digite o nome da máquina");
      return;
    }
    if (!inicializadoRef.current) return;
    const nova = {
      id: Date.now().toString(),
      nome: formData.nome.trim(),
      gateway_pagamento: formData.gateway,
      saldo: Number(formData.saldo) || 0,
      data: new Date().toISOString().split('T')[0],
    };
    const maquinasAtuais = Array.isArray(localDetalhes?.maquinas_cartao) ? localDetalhes.maquinas_cartao : [];
    const detalhesAntes = { ...localDetalhes, maquinas_cartao: [...maquinasAtuais] };
    const novosDetalhes = { ...localDetalhes, maquinas_cartao: [...maquinasAtuais, nova] };
    persistir(novosDetalhes, 'edicao', detalhesAntes);
    setFormData({ nome: '', saldo: 0, tipo_conta: '', gateway: '' });
    setModalFormAberto(false);
    toast.success("✅ Máquina adicionada e salva!");
  };

  const atualizarMaquina = (id, field, value) => {
    if (!inicializadoRef.current) return;
    const maquinas_cartao = (localDetalhes?.maquinas_cartao || []).map(m => m.id === id ? { ...m, [field]: value } : m);
    const detalhesAntes = { ...localDetalhes, maquinas_cartao: [...(localDetalhes?.maquinas_cartao || [])] };
    persistir({ ...localDetalhes, maquinas_cartao }, 'edicao', detalhesAntes);
  };

  const removerMaquina = (id) => {
    const maquinas_cartao = (localDetalhes?.maquinas_cartao || []).filter(m => m.id !== id);
    const detalhesAntes = { ...localDetalhes, maquinas_cartao: [...(localDetalhes?.maquinas_cartao || [])] };
    persistirMutation.mutate(
      { detalhes: { ...localDetalhes, maquinas_cartao }, tipo_alteracao: 'edicao', detalhes_anteriores: detalhesAntes },
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
    const detalhesAntes = { ...localDetalhes };
    persistir({ ...localDetalhes, caixa: Number(localDetalhes.caixa) || 0 }, 'edicao', detalhesAntes);
  };

  // ── Zerar tudo ────────────────────────────────────────────────
  const zerarTudo = () => {
    const vazio = { bancos: [], maquinas_cartao: [], caixa: 0 };
    setLocalDetalhes(vazio);
    persistirMutation.mutate({ detalhes: vazio }, { onSuccess: () => toast.success("Saldo zerado.") });
  };

  // ── Fechar: invalida queries e notifica pai ────────────────────
  const handleFechar = async () => {
    // ✅ FIX: Invalida a query do saldo inicial para forçar reload na próxima abertura
    await queryClient.invalidateQueries({ queryKey: ["saldoInicial", workshopId, mes] });
    await queryClient.invalidateQueries({ queryKey: ["dfc-saldo", workshopId, mes] });
    onFechar();
  };

  return (
    <>
      {/* Modal de Registro - Banco/Máquina */}
      <Dialog open={modalFormAberto} onOpenChange={setModalFormAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {tipoForm === 'banco' ? '🏦 Adicionar Banco' : '💳 Adicionar Máquina de Cartão'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">{tipoForm === 'banco' ? 'Nome do Banco' : 'Nome da Máquina'}</Label>
              <Input
                placeholder={tipoForm === 'banco' ? 'ex: Banco do Brasil' : 'ex: Stone Loja 1'}
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="mt-1 text-sm"
                autoFocus
              />
            </div>
            
            {tipoForm === 'banco' ? (
              <div>
                <Label className="text-xs">Tipo de Conta</Label>
                <select
                  value={formData.tipo_conta}
                  onChange={(e) => setFormData({ ...formData, tipo_conta: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                >
                  <option value="corrente">Corrente</option>
                  <option value="poupanca">Poupança</option>
                  <option value="aplicacao">Aplicação</option>
                </select>
              </div>
            ) : (
              <div>
                <Label className="text-xs">Gateway de Pagamento</Label>
                <select
                  value={formData.gateway}
                  onChange={(e) => setFormData({ ...formData, gateway: e.target.value })}
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
            )}
            
            <div>
              <Label className="text-xs">Saldo Inicial (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="999999999.99"
                value={formData.saldo || ''}
                onChange={(e) => setFormData({ ...formData, saldo: parseFloat(e.target.value) || 0 })}
                placeholder="0,00"
                className="mt-1 text-sm font-semibold"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" size="sm" onClick={() => setModalFormAberto(false)}>
              Cancelar
            </Button>
            <Button 
              size="sm"
              onClick={tipoForm === 'banco' ? confirmarAdicionarBanco : confirmarAdicionarMaquina}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Adicionar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Principal */}
      <Dialog open={aberto} onOpenChange={handleFechar}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base">
              💰 Saldo Inicial do Mês — {mes}
              {bloqueadoPorLiquidacao && (
                <span className="flex items-center gap-1 text-xs text-red-600 font-semibold ml-2 bg-red-50 px-2 py-1 rounded border border-red-200">
                  🔒 Bloqueado
                </span>
              )}
              {isSaving
                ? <span className="flex items-center gap-1 text-xs text-amber-600 font-normal ml-2"><Loader2 className="w-3 h-3 animate-spin" /> Salvando...</span>
                : lastSaved
                  ? <span className="flex items-center gap-1 text-xs text-emerald-600 font-normal ml-2"><CheckCircle2 className="w-3 h-3" /> Salvo</span>
                  : null
              }
            </DialogTitle>
            <Button
              size="sm"
              variant={modoSimulacao ? "default" : "outline"}
              onClick={() => {
                setModoSimulacao(!modoSimulacao);
                inicializadoRef.current = false;
                setLocalDetalhes({ bancos: [], maquinas_cartao: [], caixa: 0 });
              }}
              className={`text-xs h-7 ${modoSimulacao ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
            >
              {modoSimulacao ? '🧪 Simulação ATIVA' : '🧪 Modo Simulação'}
            </Button>
          </div>
        </DialogHeader>

        {isLoadingEfetivo ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
            <span className="text-gray-500">Carregando dados do banco...</span>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Info */}
            <SimulacaoBanner ativo={modoSimulacao} onToggle={() => setModoSimulacao(!modoSimulacao)} />
            {bloqueadoPorLiquidacao ? (
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 text-xs text-red-800 font-semibold">
                🔒 <strong>Edição bloqueada:</strong> Este mês já possui liquidações registradas. Para evitar inconsistências entre o saldo inicial e as liquidações processadas, a edição do saldo inicial está bloqueada.
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                📌 <strong>Auto-save ativo:</strong> Qualquer adição, remoção ou edição (ao sair do campo) é salva automaticamente no banco de dados e refletida no card de Saldo Inicial.
              </div>
            )}

            {/* ══ BANCOS ══ */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-blue-800">
                  <Building2 className="w-4 h-4" /> 🏦 Contas Bancárias
                  <span className="text-xs font-normal text-blue-500">({(localDetalhes?.bancos || []).length})</span>
                </h3>
                <Button size="sm" variant="outline" onClick={adicionarBanco} disabled={isSaving || bloqueadoPorLiquidacao}
                  className="gap-1 text-xs text-blue-700 border-blue-300 h-7">
                  <Plus className="w-3 h-3" /> Adicionar Banco
                </Button>
              </div>

              {(!localDetalhes?.bancos || localDetalhes.bancos.length === 0) ? (
                <div className="border-2 border-dashed border-blue-200 rounded-lg p-5 text-center text-gray-400 text-xs">
                  Nenhuma conta bancária. Clique em "+ Adicionar Banco".
                </div>
              ) : (
                <div className="space-y-2">
                  {(localDetalhes.bancos || []).map((banco) => (
                    <BancoRow
                      key={banco.id}
                      banco={banco}
                      onUpdate={atualizarBanco}
                      onRemove={removerBanco}
                      disabled={isSaving || bloqueadoPorLiquidacao}
                    />
                  ))}
                </div>
              )}
              <div className="text-right text-xs font-semibold text-blue-700">
                Subtotal Bancos: R$ {fmt((localDetalhes.bancos || []).reduce((s, b) => s + (Number(b.saldo) || 0), 0))}
              </div>
            </section>

            {/* ══ MÁQUINAS ══ */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-green-800">
                  <CreditCard className="w-4 h-4" /> 💳 Máquinas de Cartão
                  <span className="text-xs font-normal text-green-500">({(localDetalhes?.maquinas_cartao || []).length})</span>
                </h3>
                <Button size="sm" variant="outline" onClick={adicionarMaquina} disabled={isSaving || bloqueadoPorLiquidacao}
                  className="gap-1 text-xs text-green-700 border-green-300 h-7">
                  <Plus className="w-3 h-3" /> Adicionar Máquina
                </Button>
              </div>

              {(!localDetalhes?.maquinas_cartao || localDetalhes.maquinas_cartao?.length === 0) ? (
                <div className="border-2 border-dashed border-green-200 rounded-lg p-5 text-center text-gray-400 text-xs">
                  Nenhuma máquina cadastrada. Clique em "+ Adicionar Máquina".
                </div>
              ) : (
                <div className="space-y-2">
                  {(localDetalhes.maquinas_cartao || []).map((maquina) => (
                    <MaquinaRow
                      key={maquina.id}
                      maquina={maquina}
                      onUpdate={atualizarMaquina}
                      onRemove={removerMaquina}
                      disabled={isSaving || bloqueadoPorLiquidacao}
                    />
                  ))}
                </div>
              )}
              <div className="text-right text-xs font-semibold text-green-700">
                Subtotal Máquinas: R$ {fmt((localDetalhes.maquinas_cartao || []).reduce((s, m) => s + (Number(m.saldo) || 0), 0))}
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
                  disabled={bloqueadoPorLiquidacao}
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
                  Bancos R${fmt((localDetalhes.bancos || []).reduce((s,b)=>s+(Number(b.saldo)||0),0))}
                  {' + '}Máquinas R${fmt((localDetalhes.maquinas_cartao || []).reduce((s,m)=>s+(Number(m.saldo)||0),0))}
                  {' + '}Caixa R${fmt(localDetalhes.caixa || 0)}
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

            {/* ══ AUDITORIA ══ */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-700 space-y-1">
              <p className="font-semibold text-emerald-800">🔒 Log de Auditoria Ativo</p>
              <p>• Todas as alterações são registradas na entidade <strong>SaldoInicialHistorico</strong>.</p>
              <p>• Rastreia: valor anterior, valor novo, campo alterado, usuário, data/hora e origem (manual ou liquidação).</p>
              <p>• Consultoria pode auditar mudanças no saldo inicial por mês.</p>
            </div>

            {/* ══ AÇÕES ══ */}
            <div className="flex justify-between items-center pt-2 border-t">
              <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                disabled={isSaving || bloqueadoPorLiquidacao} onClick={zerarTudo}>
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
    </>
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