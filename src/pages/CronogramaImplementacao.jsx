import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, CheckCircle, Clock, Edit2, History, Loader2, TrendingUp, Link as LinkIcon, AlertCircle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ExportCronogramaModal from "@/components/cronograma/ExportCronogramaModal";
import { generateCronogramaPDF } from "@/components/cronograma/CronogramaPDFGenerator";
import { FileDown } from "lucide-react";
import DependencySelector from "@/components/cronograma/DependencySelector";
import GanttTimeline from "@/components/cronograma/GanttTimeline";
import { Alert, AlertDescription } from "@/components/ui/alert";
import NavigableItemName from "@/components/cronograma/NavigableItemName";
import QuickActionButtons from "@/components/cronograma/QuickActionButtons";

export default function CronogramaImplementacao() {
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState(null);
  const [showHistory, setShowHistory] = useState(null);
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterTipo, setFilterTipo] = useState("todos");
  const [showExportModal, setShowExportModal] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: workshop } = useQuery({
    queryKey: ['workshop', user?.workshop_id],
    queryFn: async () => {
      if (user?.workshop_id) {
        return await base44.entities.Workshop.get(user.workshop_id);
      }
      const workshops = await base44.entities.Workshop.filter({ owner_id: user.id });
      return workshops[0];
    },
    enabled: !!user
  });

  const { data: planFeatures = [] } = useQuery({
    queryKey: ['plan-features'],
    queryFn: () => base44.entities.PlanFeature.list(),
    enabled: !!workshop
  });

  const { data: cronograma = [], isLoading } = useQuery({
    queryKey: ['cronograma-implementacao', workshop?.id],
    queryFn: async () => {
      return await base44.entities.CronogramaImplementacao.filter(
        { workshop_id: workshop.id },
        '-data_inicio_real'
      );
    },
    enabled: !!workshop?.id
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const item = cronograma.find(c => c.id === id);
      const historicoAtualizado = [...(item.historico_alteracoes || [])];
      
      // Registrar alterações no histórico
      Object.keys(data).forEach(campo => {
        if (campo !== 'historico_alteracoes' && item[campo] !== data[campo]) {
          historicoAtualizado.push({
            data_alteracao: new Date().toISOString(),
            campo_alterado: campo,
            valor_anterior: String(item[campo] || ''),
            valor_novo: String(data[campo] || ''),
            usuario_id: user.id,
            usuario_nome: user.full_name
          });
        }
      });

      const updated = await base44.entities.CronogramaImplementacao.update(id, {
        ...data,
        historico_alteracoes: historicoAtualizado
      });

      // Sincronizar com CronogramaProgresso
      try {
        await base44.functions.invoke('syncCronogramaProgress', {
          workshop_id: workshop.id,
          item_id: item.item_id,
          item_nome: item.item_nome,
          status: data.status,
          data_termino_real: data.data_termino_real,
          data_termino_previsto: data.data_termino_previsto,
          progresso_percentual: data.progresso_percentual
        });
      } catch (syncError) {
        console.error('Erro ao sincronizar com CronogramaProgresso:', syncError);
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cronograma-implementacao'] });
      queryClient.invalidateQueries({ queryKey: ['cronograma-progressos'] });
      queryClient.invalidateQueries({ queryKey: ['cronograma-implementacao', workshop?.id] });
      toast.success('Item atualizado com sucesso!');
      setEditingItem(null);
    }
  });

  const getStatusColor = (status) => {
    const colors = {
      a_fazer: "bg-gray-100 text-gray-700",
      em_andamento: "bg-blue-100 text-blue-700",
      concluido: "bg-green-100 text-green-700"
    };
    return colors[status] || colors.a_fazer;
  };

  const getStatusLabel = (status) => {
    const labels = {
      a_fazer: "A Fazer",
      em_andamento: "Em Andamento",
      concluido: "Concluído"
    };
    return labels[status] || status;
  };

  const getDiasRestantes = (dataTerminoPrevisto) => {
    const dias = differenceInDays(new Date(dataTerminoPrevisto), new Date());
    if (dias < 0) return { dias: Math.abs(dias), atrasado: true };
    return { dias, atrasado: false };
  };

  const checkDependenciesBlocked = (item) => {
    if (!item.dependencias || item.dependencias.length === 0) return { blocked: false, pendingDeps: [] };
    
    const pendingDeps = item.dependencias.filter(depId => {
      const depItem = cronograma.find(c => c.id === depId);
      return depItem && depItem.status !== 'concluido';
    });

    return {
      blocked: pendingDeps.length > 0,
      pendingDeps: pendingDeps.map(depId => {
        const depItem = cronograma.find(c => c.id === depId);
        return depItem?.item_nome || depId;
      })
    };
  };

  // Buscar configuração do plano atual
  const currentPlanData = planFeatures.find(p => p.plan_id === workshop?.planoAtual);

  // Combinar itens do cronograma com itens configurados no plano
  const allPlanItems = [
    ...(currentPlanData?.cronograma_features || []).map(f => ({
      codigo: f,
      nome: f.replace(/_/g, ' ').toUpperCase(),
      tipo: 'funcionalidade'
    })),
    ...(currentPlanData?.cronograma_modules || []).map(m => ({
      codigo: m,
      nome: m,
      tipo: 'modulo'
    }))
  ];

  // Mesclar itens do plano com itens já rastreados no cronograma
  const allItemsForTable = allPlanItems.map(planItem => {
    const cronogramaItem = cronograma.find(c => c.item_id === planItem.codigo || c.item_nome === planItem.nome);
    
    // Se já existe no cronograma, garantir que tem os campos necessários
    if (cronogramaItem) {
      return {
        ...cronogramaItem,
        item_id: cronogramaItem.item_id || planItem.codigo,
        item_nome: cronogramaItem.item_nome || planItem.nome,
        item_tipo: cronogramaItem.item_tipo || planItem.tipo
      };
    }
    
    // Item não iniciado - criar com todos os campos necessários para navegação
    return {
      id: planItem.codigo,
      item_nome: planItem.nome,
      item_tipo: planItem.tipo,
      item_id: planItem.codigo,
      status: 'a_fazer',
      workshop_id: workshop?.id,
      data_inicio_real: new Date().toISOString(),
      data_termino_previsto: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias a partir de hoje
      progresso_percentual: 0,
      not_started: true // Flag para identificar itens não iniciados
    };
  });

  const filteredItems = allItemsForTable.filter(item => {
    if (filterStatus !== "todos" && item.status !== filterStatus) return false;
    if (filterTipo !== "todos" && item.item_tipo !== filterTipo) return false;
    return true;
  });

  const stats = {
    total: allItemsForTable.length,
    concluidos: allItemsForTable.filter(i => i.status === 'concluido').length,
    em_andamento: allItemsForTable.filter(i => i.status === 'em_andamento').length,
    atrasados: allItemsForTable.filter(i => {
      if (i.status === 'concluido' || i.not_started) return false;
      return differenceInDays(new Date(i.data_termino_previsto), new Date()) < 0;
    }).length
  };

  const handleGeneratePDF = (mode, dataOverride, options) => {
    const cronogramaData = dataOverride || {
      stats,
      items: allItemsForTable,
      planName: workshop?.planoAtual || 'N/A'
    };

    return generateCronogramaPDF(cronogramaData, workshop, mode, options);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cronograma de Implementação</h1>
          <p className="text-gray-600 mt-2">
            Acompanhe o progresso da implementação das ferramentas e processos
          </p>
        </div>
        <Button 
          onClick={() => setShowExportModal(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <FileDown className="w-4 h-4 mr-2" />
          Exportar Relatório
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Total de Itens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" />
              Em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.em_andamento}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Concluídos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.concluidos}</div>
            <p className="text-xs text-gray-600 mt-1">
              {stats.total > 0 ? Math.round((stats.concluidos / stats.total) * 100) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-red-600" />
              Atrasados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.atrasados}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="a_fazer">A Fazer</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Tipos</SelectItem>
                  <SelectItem value="processo">Processos</SelectItem>
                  <SelectItem value="diagnostico">Diagnósticos</SelectItem>
                  <SelectItem value="ferramenta">Ferramentas</SelectItem>
                  <SelectItem value="teste">Testes</SelectItem>
                  <SelectItem value="modulo">Módulos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Gantt */}
      <GanttTimeline items={allItemsForTable} />



      {/* Tabela de Itens */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <CardTitle className="text-lg">CheckPoint / Cronograma do Plano {workshop?.planoAtual}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 overflow-x-auto">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Nenhum item disponível no plano selecionado.</p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Programa / Conteúdo</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700 min-w-[110px]">Início Previsto</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700 min-w-[110px]">Início Real</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700 min-w-[110px]">Término Previsto</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700 min-w-[110px]">Término Real</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Dependências</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Atraso</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, index) => {
                  const diasRestantes = item.not_started ? null : getDiasRestantes(item.data_termino_previsto);
                  const depCheck = checkDependenciesBlocked(item);
                  
                  return (
                    <tr key={item.id || index} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <NavigableItemName
                          item={item}
                          workshop={workshop}
                          showDependencyWarning={depCheck.blocked}
                        />
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-gray-500">
                        {item.not_started ? '-' : format(new Date(new Date(item.data_inicio_real).setDate(new Date(item.data_inicio_real).getDate() - 1)), "dd/MM/yyyy", { locale: ptBR })}
                      </td>
                      <td className="py-3 px-4 text-center text-sm font-medium">
                        {item.not_started ? '-' : format(new Date(item.data_inicio_real), "dd/MM/yyyy", { locale: ptBR })}
                      </td>
                      <td className="py-3 px-4 text-center text-sm">
                        {item.not_started ? '-' : format(new Date(item.data_termino_previsto), "dd/MM/yyyy", { locale: ptBR })}
                      </td>
                      <td className="py-3 px-4 text-center text-sm font-medium">
                        {item.not_started || !item.data_termino_real ? '-' : format(new Date(item.data_termino_real), "dd/MM/yyyy", { locale: ptBR })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={getStatusColor(item.status)}>
                          {getStatusLabel(item.status)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.dependencias && item.dependencias.length > 0 ? (
                          <div className="flex items-center justify-center gap-1">
                            <LinkIcon className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-700">{item.dependencias.length}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {!item.not_started && item.status !== 'concluido' && diasRestantes?.atrasado ? (
                          <span className="text-red-600 font-semibold text-sm">
                            {diasRestantes.dias}d
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex gap-1 justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingItem(item)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          {!item.not_started && item.historico_alteracoes?.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowHistory(item)}
                              className="h-8 w-8 p-0"
                            >
                              <History className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Modal de Edição */}
      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Item: {editingItem.item_nome}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {(() => {
                const depCheck = checkDependenciesBlocked(editingItem);
                return depCheck.blocked && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Esta tarefa depende de: <strong>{depCheck.pendingDeps.join(', ')}</strong>. 
                      Complete-as antes de iniciar esta tarefa.
                    </AlertDescription>
                  </Alert>
                );
              })()}

              <QuickActionButtons 
                item={editingItem} 
                workshop={workshop}
              />

              <DependencySelector
                selectedDependencies={editingItem.dependencias || []}
                availableItems={allItemsForTable}
                currentItemId={editingItem.id}
                onChange={(deps) => setEditingItem({ ...editingItem, dependencias: deps })}
              />

              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <Select
                  value={editingItem.status}
                  onValueChange={(value) => setEditingItem({ ...editingItem, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a_fazer">A Fazer</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Data Término Previsto</label>
                <Input
                  type="date"
                  value={editingItem.data_termino_previsto?.split('T')[0]}
                  onChange={(e) => setEditingItem({ 
                    ...editingItem, 
                    data_termino_previsto: new Date(e.target.value).toISOString() 
                  })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Data Término Real</label>
                <Input
                  type="date"
                  value={editingItem.data_termino_real?.split('T')[0] || ''}
                  onChange={(e) => setEditingItem({ 
                    ...editingItem, 
                    data_termino_real: e.target.value ? new Date(e.target.value).toISOString() : null
                  })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Progresso (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={editingItem.progresso_percentual || 0}
                  onChange={(e) => setEditingItem({ 
                    ...editingItem, 
                    progresso_percentual: parseInt(e.target.value) 
                  })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Observações</label>
                <Textarea
                  value={editingItem.observacoes || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, observacoes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setEditingItem(null)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={() => updateMutation.mutate({ 
                    id: editingItem.id, 
                    data: {
                      status: editingItem.status,
                      data_termino_previsto: editingItem.data_termino_previsto,
                      data_termino_real: editingItem.data_termino_real,
                      progresso_percentual: editingItem.progresso_percentual,
                      observacoes: editingItem.observacoes,
                      dependencias: editingItem.dependencias || []
                    }
                  })}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Histórico */}
      {showHistory && (
        <Dialog open={!!showHistory} onOpenChange={() => setShowHistory(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Histórico de Alterações</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-3">
              {showHistory.historico_alteracoes?.map((hist, idx) => (
                <div key={idx} className="border-l-2 border-blue-500 pl-3 py-2">
                  <p className="text-sm font-medium">{hist.campo_alterado}</p>
                  <p className="text-xs text-gray-600">
                    {hist.valor_anterior} → {hist.valor_novo}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {format(new Date(hist.data_alteracao), "dd/MM/yyyy HH:mm", { locale: ptBR })} - {hist.usuario_nome}
                  </p>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Exportação */}
      <ExportCronogramaModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        cronogramaData={{ stats, items: allItemsForTable, planName: workshop?.planoAtual }}
        workshop={workshop}
        onGeneratePDF={handleGeneratePDF}
      />
    </div>
  );
}