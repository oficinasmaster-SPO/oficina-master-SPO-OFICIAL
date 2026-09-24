import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, Trash2, Loader2, DollarSign, History, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";
import ModalRegistrarPagamentoConta from "@/components/financeiro/ModalRegistrarPagamentoConta";
import HistoricoAlteracoes from "@/components/financeiro/HistoricoAlteracoes";
import ModalEstornoLiquidacao from "@/components/dfc/ModalEstornoLiquidacao";

export default function ContasPagar() {
    setCarregando(true);
    base44.entities.LiquidacaoFinanceira
      .filter({ conta_pagar_id: conta.id }, '-data_liquidacao', 20)
      .then(r => setLiquidacoes(r || []))
      .catch(() => setLiquidacoes([]))
      .finally(() => setCarregando(false));
  }, [aberto, conta?.id]);

  const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  const handleEstornar = async () => {
    if (!liquidacaoSelecionada) { toast.error('Selecione a baixa a estornar'); return; }
    if (!motivo.trim()) { toast.error('Informe o motivo do estorno'); return; }
    setEstornando(true);
    try {
      await base44.functions.invoke('desfazerLiquidacao', {
        liquidacao_id: liquidacaoSelecionada,
        motivo: motivo.trim(),
      });
      toast.success('✅ Estorno realizado! A baixa foi revertida.');
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
            <RotateCcw className="w-5 h-5" /> Estornar Baixa
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
            <p className="font-semibold text-orange-800">{conta?.fornecedor_nome || '—'}</p>
            <p className="text-orange-700 text-xs mt-0.5">Valor original: {fmt(conta?.valor_original)}</p>
          </div>

          {carregando ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Buscando baixas registradas...
            </div>
          ) : liquidacoes.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Nenhuma baixa encontrada para esta conta.</p>
          ) : (
            <div>
              <Label className="text-xs">Selecione a baixa a estornar *</Label>
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
              placeholder="Ex: Data de pagamento informada incorretamente (09/09 em vez de 18/09)"
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

export default function ContasPagar() {
  const { workshop } = useWorkshopContext();
  const queryClient = useQueryClient();
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [contaParaDeletar, setContaParaDeletar] = useState(null);
  const [contaParaPagar, setContaParaPagar] = useState(null);
  const [contaParaEstornar, setContaParaEstornar] = useState(null); // S1-T1.2
  const [deletando, setDeletando] = useState(false);
  const [loadingPagar, setLoadingPagar] = useState(false);
  const [contaHistoricoAberta, setContaHistoricoAberta] = useState(null);

  const mesAtual = new Date().toISOString().slice(0, 7);

  // Sempre busca o registro mais atualizado do BD antes de abrir o modal
  const handleAbrirModalPagar = async (conta) => {
    setLoadingPagar(true);
    try {
      const registroAtualizado = await base44.entities.ContaPagar.get(conta.id);
      setContaParaPagar(registroAtualizado || conta);
    } catch {
      setContaParaPagar(conta);
    } finally {
      setLoadingPagar(false);
    }
  };

  const { data: contas, isLoading, refetch } = useQuery({
    queryKey: ['contas-pagar', workshop?.id, filtroStatus],
    queryFn: async () => {
      if (!workshop?.id) return [];
      const query = { workshop_id: workshop.id };
      if (filtroStatus !== "todos") query.status = filtroStatus;
      return await base44.entities.ContaPagar.filter(query, '-data_vencimento', 100);
    },
    enabled: !!workshop?.id,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const handleDeleteConta = async () => {
    if (!contaParaDeletar) return;
    setDeletando(true);
    try {
      await base44.entities.ContaPagar.delete(contaParaDeletar.id);
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

  const totalAberto = contas?.filter(c => c.status === 'aberto').reduce((sum, c) => sum + (c.valor_aberto || 0), 0) || 0;
  const totalVencido = contas?.filter(c => c.status === 'vencido').reduce((sum, c) => sum + (c.valor_aberto || 0), 0) || 0;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Contas a Pagar</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Aberto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalAberto.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Vencido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">R$ {totalVencido.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Contas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contas?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 mb-6">
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="aberto">Aberto</SelectItem>
            <SelectItem value="parcial">Parcial</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Contas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Valor Original</TableHead>
                  <TableHead>Valor Aberto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contas?.map((conta) => (
                <React.Fragment key={conta.id}>
                <TableRow>
                  <TableCell>{conta.fornecedor_nome || '—'}</TableCell>
                  <TableCell>
                    {conta.data_vencimento
                      ? format(new Date(conta.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })
                      : '—'}
                  </TableCell>
                  <TableCell>{conta.categoria || '—'}</TableCell>
                  <TableCell>R$ {conta.valor_original?.toFixed(2)}</TableCell>
                  <TableCell>R$ {(conta.valor_aberto || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={
                      conta.status === 'pago' ? 'default' :
                      conta.status === 'vencido' ? 'destructive' : 'secondary'
                    }>
                      {conta.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      {conta.status !== 'pago' && conta.status !== 'cancelado' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-700 border-green-300 hover:bg-green-50"
                          onClick={() => handleAbrirModalPagar(conta)}
                          disabled={loadingPagar}
                        >
                          {loadingPagar ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <DollarSign className="w-3 h-3 mr-1" />}
                          Pagar
                        </Button>
                      )}
                      {/* S1-T1.2: botão Estornar visível para contas pagas ou parciais */}
                      {(conta.status === 'pago' || conta.status === 'parcial') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-orange-600 border-orange-300 hover:bg-orange-50"
                          onClick={() => setContaParaEstornar(conta)}
                          title="Estornar baixa"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Estornar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setContaParaDeletar(conta)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-400 hover:text-gray-700"
                      title="Histórico de alterações"
                      onClick={() => setContaHistoricoAberta(contaHistoricoAberta === conta.id ? null : conta.id)}
                    >
                      {contaHistoricoAberta === conta.id ? <ChevronUp className="w-4 h-4" /> : <History className="w-4 h-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
                {contaHistoricoAberta === conta.id && (
                  <TableRow>
                    <TableCell colSpan={8} className="bg-gray-50 p-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Histórico de Alterações</p>
                      <HistoricoAlteracoes historico={conta.historico_alteracoes || []} />
                    </TableCell>
                  </TableRow>
                )}
                </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal registrar pagamento */}
      {contaParaPagar && (
        <ModalRegistrarPagamentoConta
          aberto={!!contaParaPagar}
          onFechar={() => setContaParaPagar(null)}
          conta={contaParaPagar}
          workshopId={workshop?.id}
          mes={contaParaPagar?.data_vencimento ? contaParaPagar.data_vencimento.slice(0, 7) : mesAtual}
          onSuccess={() => {
            setContaParaPagar(null);
            refetch();
          }}
        />
      )}

      {/* S1-T1.2: Modal de estorno */}
      {contaParaEstornar && (
        <ModalEstornoLiquidacao
          aberto={!!contaParaEstornar}
          onFechar={() => setContaParaEstornar(null)}
          conta={contaParaEstornar}
          tipo="pagar"
          workshopId={workshop?.id}
          onSuccess={() => { setContaParaEstornar(null); refetch(); }}
        />
      )}

      <AlertDialog open={!!contaParaDeletar} onOpenChange={() => setContaParaDeletar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🗑️ Deletar Conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar a conta de <strong>{contaParaDeletar?.fornecedor_nome}</strong> no valor de <strong>R$ {contaParaDeletar?.valor_original?.toFixed(2)}</strong>?
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