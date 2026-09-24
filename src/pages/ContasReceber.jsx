import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, DollarSign, AlertCircle, Trash2, History, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import ModalRegistrarRecebimento from "@/components/financeiro/ModalRegistrarRecebimento";
import HistoricoAlteracoes from "@/components/financeiro/HistoricoAlteracoes";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";
import ModalEstornoLiquidacao from "@/components/dfc/ModalEstornoLiquidacao";

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

// ModalEstornoReceber removido — substituído por ModalEstornoLiquidacao (componente compartilhado)
// eslint-disable-next-line no-unused-vars
function _ModalEstornoReceber_REMOVIDO({ aberto, onFechar, conta, onSuccess }) {
  const [motivo, setMotivo] = useState("");
  const [estornando, setEstornando] = useState(false);
  const [liquidacoes, setLiquidacoes] = useState([]);
  const [liquidacaoSelecionada, setLiquidacaoSelecionada] = useState(null);
  const [carregando, setCarregando] = useState(false);

  React.useEffect(() => {
    if (!aberto || !conta?.id) return;
    setMotivo("");
    setLiquidacaoSelecionada(null);
    setCarregando(true);
    base44.entities.LiquidacaoFinanceira
      .filter({ conta_receber_id: conta.id }, '-data_liquidacao', 20)
      .then(r => setLiquidacoes(r || []))
      .catch(() => setLiquidacoes([]))
      .finally(() => setCarregando(false));
  }, [aberto, conta?.id]);

  const handleEstornar = async () => {
    if (!liquidacaoSelecionada) { toast.error('Selecione a baixa a estornar'); return; }
    if (!motivo.trim()) { toast.error('Informe o motivo do estorno'); return; }
    setEstornando(true);
    try {
      await base44.functions.invoke('desfazerLiquidacao', {
        liquidacao_id: liquidacaoSelecionada,
        motivo: motivo.trim(),
      });
      toast.success('✅ Estorno realizado! O recebimento foi revertido.');
      onSuccess?.();
      onFechar();
    } catch (e) {
      toast.error('Erro ao estornar: ' + (e.message || 'tente novamente'));
    } finally {
      setEstornando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={onFechar}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-700">
            <RotateCcw className="w-5 h-5" /> Estornar Recebimento
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
            <p className="font-semibold text-orange-800">{conta?.cliente_nome || '—'}</p>
            <p className="text-orange-700 text-xs mt-0.5">Valor original: {fmt(conta?.valor_original)}</p>
          </div>
          {carregando ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Buscando recebimentos registrados...
            </div>
          ) : liquidacoes.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Nenhum recebimento encontrado para esta conta.</p>
          ) : (
            <div>
              <Label className="text-xs">Selecione o recebimento a estornar *</Label>
              <div className="space-y-2 mt-1">
                {liquidacoes.map(liq => (
                  <button
                    key={liq.id}
                    onClick={() => setLiquidacaoSelecionada(liq.id)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all text-sm ${
                      liquidacaoSelecionada === liq.id
                        ? 'border-orange-400 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-200'
                    }`}
                  >
                    <div className="flex justify-between">
                      <span className="font-medium">{fmt(liq.valor_liquidacao)}</span>
                      <span className="text-gray-500">{liq.data_liquidacao ? new Date(liq.data_liquidacao).toLocaleDateString('pt-BR') : '—'}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{liq.forma_pagamento?.replace('_', ' ')}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <Label className="text-xs">Motivo do estorno *</Label>
            <Textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ex: Recebimento baixado na data errada (18/09 em vez de 09/09)"
              className="mt-1 text-sm resize-none"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button
            onClick={handleEstornar}
            disabled={estornando || !liquidacaoSelecionada || !motivo.trim()}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {estornando && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Confirmar Estorno
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ status }) {
  const map = {
    aberto: { label: 'Aberto', color: 'bg-blue-100 text-blue-800' },
    parcial: { label: 'Parcial', color: 'bg-yellow-100 text-yellow-800' },
    pago: { label: 'Pago', color: 'bg-green-100 text-green-800' },
    vencido: { label: 'Vencido', color: 'bg-red-100 text-red-800' },
    cancelado: { label: 'Cancelado', color: 'bg-gray-100 text-gray-800' },
  };
  const s = map[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
  return <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.color}`}>{s.label}</span>;
}

export default function ContasReceber() {
  const queryClient = useQueryClient();
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [contaSelecionada, setContaSelecionada] = useState(null);
  const [contaParaDeletar, setContaParaDeletar] = useState(null);
  const [contaHistoricoAberta, setContaHistoricoAberta] = useState(null);
  const [contaParaEstornar, setContaParaEstornar] = useState(null); // S1-T1.2
  const [deletando, setDeletando] = useState(false);
  const [loadingReceber, setLoadingReceber] = useState(false);

  // FIX QA-2.3: antes resolvia a oficina pelo campo legado user.data.workshop_id —
  // usuários cujo vínculo vem apenas de TenantMembership viam a lista vazia.
  // Agora usa a fonte canônica (mesmo padrão de ContasPagar).
  const { workshop } = useWorkshopContext();
  const workshopId = workshop?.id;
  const mesAtual = new Date().toISOString().slice(0, 7); // YYYY-MM

  const { data: contas = [], isLoading, refetch } = useQuery({
    queryKey: ['contas-receber', workshopId, filtroStatus],
    queryFn: async () => {
      if (!workshopId) return [];
      const query = { workshop_id: workshopId };
      if (filtroStatus !== 'todos') query.status = filtroStatus;
      return await base44.entities.ContaReceber.filter(query, '-data_vencimento', 100);
    },
    enabled: !!workshopId,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const totalAberto = contas.reduce((s, c) => s + (c.valor_aberto || 0), 0);
  const totalVencido = contas.filter(c => c.data_vencimento < new Date().toISOString().slice(0, 10) && c.status !== 'pago').reduce((s, c) => s + (c.valor_aberto || 0), 0);
  const hoje = new Date().toISOString().slice(0, 10);

  // Sempre busca o registro mais atualizado do BD antes de abrir o modal
  const handleAbrirModalReceber = async (conta) => {
    setLoadingReceber(true);
    try {
      const registros = await base44.entities.ContaReceber.filter({ id: conta.id }, '-created_date', 1);
      setContaSelecionada(registros?.[0] || conta);
    } catch {
      setContaSelecionada(conta);
    } finally {
      setLoadingReceber(false);
    }
  };

  const handleDeleteConta = async () => {
    if (!contaParaDeletar) return;
    setDeletando(true);
    try {
      await base44.entities.ContaReceber.delete(contaParaDeletar.id);
      toast.success('Conta deletada com sucesso!');
      refetch();
      setContaParaDeletar(null);
    } catch (error) {
      toast.error('Erro ao deletar conta');
      console.error(error);
    } finally {
      setDeletando(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">💰 Contas a Receber</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <p className="text-sm text-blue-600">Total em Aberto</p>
            <p className="text-2xl font-bold text-blue-900">{fmt(totalAberto)}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-4">
            <p className="text-sm text-red-600">Total Vencido</p>
            <p className="text-2xl font-bold text-red-900">{fmt(totalVencido)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="pt-4">
            <p className="text-sm text-gray-600">Total de Registros</p>
            <p className="text-2xl font-bold text-gray-900">{contas.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtro */}
      <div className="flex gap-2 flex-wrap">
        {['todos', 'aberto', 'parcial', 'vencido', 'pago'].map(s => (
          <button
            key={s}
            onClick={() => setFiltroStatus(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              filtroStatus === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {contas.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Nenhuma conta encontrada</div>
        ) : contas.map(conta => (
          <Card key={conta.id} className={`hover:shadow-md transition-shadow ${conta.data_vencimento < hoje && conta.status !== 'pago' ? 'border-red-200 bg-red-50/30' : ''}`}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold truncate">{conta.cliente_nome || 'Cliente não informado'}</p>
                    <StatusBadge status={conta.status} />
                    {conta.data_vencimento < hoje && conta.status !== 'pago' && (
                      <span className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Vencida
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>Vence: {fmtDate(conta.data_vencimento)}</span>
                    {conta.parcela_numero && <span>{conta.parcela_numero}/{conta.parcela_total}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-blue-700">{fmt(conta.valor_aberto)}</p>
                  {conta.valor_pago > 0 && (
                    <p className="text-xs text-green-600">Pago: {fmt(conta.valor_pago)}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {conta.status !== 'pago' && conta.status !== 'cancelado' && (
                    <Button size="sm" onClick={() => handleAbrirModalReceber(conta)} disabled={loadingReceber}>
                      {loadingReceber ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <DollarSign className="w-4 h-4 mr-1" />}
                      Registrar
                    </Button>
                  )}
                  {/* S1-T1.2: estorno para contas pagas ou parciais */}
                  {(conta.status === 'pago' || conta.status === 'parcial') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-orange-600 border-orange-300 hover:bg-orange-50"
                      onClick={() => setContaParaEstornar(conta)}
                      title="Estornar recebimento"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Estornar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-gray-500 hover:bg-gray-100"
                    title="Histórico de alterações"
                    onClick={() => setContaHistoricoAberta(contaHistoricoAberta === conta.id ? null : conta.id)}
                  >
                    {contaHistoricoAberta === conta.id ? <ChevronUp className="w-4 h-4" /> : <History className="w-4 h-4" />}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setContaParaDeletar(conta)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {contaHistoricoAberta === conta.id && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Histórico de Alterações</p>
                  <HistoricoAlteracoes historico={conta.historico_alteracoes || []} />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* S1-T1.2: Modal estorno recebimento */}
      {contaParaEstornar && (
        <ModalEstornoReceber
          aberto={!!contaParaEstornar}
          onFechar={() => setContaParaEstornar(null)}
          conta={contaParaEstornar}
          onSuccess={() => { setContaParaEstornar(null); refetch(); }}
        />
      )}

      {/* Modal correto com data + fonte de saída */}
      {contaSelecionada && (
        <ModalRegistrarRecebimento
          aberto={!!contaSelecionada}
          onFechar={() => setContaSelecionada(null)}
          conta={contaSelecionada}
          workshopId={workshopId}
          mes={contaSelecionada?.data_vencimento ? contaSelecionada.data_vencimento.slice(0, 7) : mesAtual}
          onSuccess={() => {
            setContaSelecionada(null);
            refetch();
          }}
        />
      )}

      <AlertDialog open={!!contaParaDeletar} onOpenChange={() => setContaParaDeletar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🗑️ Deletar Conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar a conta <strong>{contaParaDeletar?.cliente_nome}</strong> no valor de <strong>{fmt(contaParaDeletar?.valor_original)}</strong>?
              <br />
              <span className="text-red-600 text-sm mt-2 block">Essa ação não pode ser desfeita!</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConta} 
              disabled={deletando}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletando && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}