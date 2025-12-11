import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Star,
  FileText,
  Download,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function CronogramaDetalhado() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedModulo, setSelectedModulo] = useState(null);
  const [showAvaliacaoModal, setShowAvaliacaoModal] = useState(false);
  const [editMode, setEditMode] = useState({});
  const [editData, setEditData] = useState({});

  // Carregar usuário e workshop
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: workshop } = useQuery({
    queryKey: ['workshop', user?.workshop_id],
    queryFn: async () => {
      const w = await base44.entities.Workshop.get(user.workshop_id);
      // Se não tem maturity_level, buscar último diagnóstico
      if (!w.maturity_level) {
        const diags = await base44.entities.Diagnostic.filter({ workshop_id: user.workshop_id }, '-created_date', 1);
        if (diags[0]) {
          w.maturity_level = diags[0].phase;
        }
      }
      return w;
    },
    enabled: !!user?.workshop_id
  });

  // Carregar progresso do cronograma
  const { data: progressos, isLoading } = useQuery({
    queryKey: ['cronograma-progresso', workshop?.id, workshop?.maturity_level],
    queryFn: () => base44.entities.CronogramaProgresso.filter({ 
      workshop_id: workshop.id,
      fase_oficina: workshop.maturity_level || 1
    }, 'ordem'),
    enabled: !!workshop?.id
  });

  // Mutation para atualizar progresso
  const updateProgressoMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.CronogramaProgresso.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cronograma-progresso']);
      toast.success('Progresso atualizado!');
    }
  });

  // Mutation para gerar cronograma automático
  const gerarCronogramaMutation = useMutation({
    mutationFn: async () => {
      return await base44.functions.invoke('gerarCronogramaAutomatico', {
        workshop_id: workshop.id,
        fase_oficina: workshop.maturity_level || 1,
        data_inicio: new Date().toISOString().split('T')[0]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cronograma-progresso']);
      toast.success('Cronograma gerado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao gerar cronograma: ' + error.message);
    }
  });

  const getSituacaoColor = (situacao) => {
    const colors = {
      nao_iniciado: "bg-gray-100 text-gray-800",
      em_andamento: "bg-blue-100 text-blue-800",
      concluido: "bg-green-100 text-green-800",
      cancelado: "bg-red-100 text-red-800",
      atrasado: "bg-orange-100 text-orange-800"
    };
    return colors[situacao] || colors.nao_iniciado;
  };

  const getSituacaoIcon = (situacao) => {
    switch (situacao) {
      case 'concluido':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'em_andamento':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'atrasado':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const calcularProgressoGeral = () => {
    if (!progressos || progressos.length === 0) return 0;
    const concluidos = progressos.filter(p => p.situacao === 'concluido').length;
    return Math.round((concluidos / progressos.length) * 100);
  };

  const handleStartEdit = (progresso, field) => {
    setEditMode({ ...editMode, [`${progresso.id}_${field}`]: true });
    setEditData({ 
      ...editData, 
      [`${progresso.id}_${field}`]: progresso[field] || (field.includes('data') ? '' : 0)
    });
  };

  const handleSaveEdit = async (progresso, field) => {
    const value = editData[`${progresso.id}_${field}`];
    
    await updateProgressoMutation.mutateAsync({
      id: progresso.id,
      data: { [field]: value }
    });
    
    setEditMode({ ...editMode, [`${progresso.id}_${field}`]: false });
  };

  const handleCancelEdit = (progresso, field) => {
    setEditMode({ ...editMode, [`${progresso.id}_${field}`]: false });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            CheckPoint / Cronograma do Plano
          </h1>
          <p className="text-gray-600 mt-2">
            Acompanhe o progresso das atividades de consultoria
          </p>
        </div>

        {user?.role === 'admin' && (
          <Button
            onClick={() => gerarCronogramaMutation.mutate()}
            disabled={gerarCronogramaMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {gerarCronogramaMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              'Gerar Cronograma'
            )}
          </Button>
        )}
      </div>

      {/* Card de Resumo */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-blue-600 font-medium">Oficina</p>
              <p className="text-xl font-bold text-blue-900">{workshop?.name}</p>
              <p className="text-sm text-blue-700">{workshop?.city}/{workshop?.state}</p>
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">Fase Atual</p>
              <p className="text-2xl font-bold text-blue-900">Fase {workshop?.maturity_level || 1}</p>
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">Progresso Geral</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-blue-900">{calcularProgressoGeral()}%</p>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">Plano</p>
              <p className="text-xl font-bold text-blue-900">{workshop?.planoAtual || 'FREE'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Barra de Progresso */}
      <div className="bg-white rounded-lg p-4 border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progresso do Cronograma</span>
          <span className="text-sm font-bold text-blue-600">{calcularProgressoGeral()}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${calcularProgressoGeral()}%` }}
          />
        </div>
      </div>

      {/* Tabela de Cronograma */}
      <Card>
        <CardHeader>
          <CardTitle>Módulos e Conteúdos</CardTitle>
        </CardHeader>
        <CardContent>
          {!progressos || progressos.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">Nenhum cronograma gerado ainda</p>
              {user?.role === 'admin' && (
                <Button onClick={() => gerarCronogramaMutation.mutate()}>
                  Gerar Cronograma Automático
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Programa</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Início</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Conclusão</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Atividades</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Tarefas</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Avaliação Cliente</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Avaliação Programa</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {progressos.map((prog) => {
                    const isEditing = editMode[`${prog.id}_situacao`];
                    
                    return (
                      <tr 
                        key={prog.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getSituacaoIcon(prog.situacao)}
                            <div>
                              <p className="font-medium text-gray-900">{prog.modulo_codigo}</p>
                              <p className="text-sm text-gray-600">{prog.modulo_nome}</p>
                            </div>
                          </div>
                        </td>
                        
                        {/* Início - Editável por admin */}
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="text-sm">
                            <p className="text-gray-600">
                              {prog.data_inicio_previsto ? format(new Date(prog.data_inicio_previsto), 'dd/MM/yyyy') : '-'}
                            </p>
                            {user?.role === 'admin' ? (
                              editMode[`${prog.id}_data_inicio_realizado`] ? (
                                <div className="flex items-center gap-1 justify-center">
                                  <Input
                                    type="date"
                                    className="h-7 w-32 text-xs"
                                    value={editData[`${prog.id}_data_inicio_realizado`] || ''}
                                    onChange={(e) => setEditData({
                                      ...editData,
                                      [`${prog.id}_data_inicio_realizado`]: e.target.value
                                    })}
                                  />
                                  <Button size="sm" className="h-7 px-2" onClick={() => handleSaveEdit(prog, 'data_inicio_realizado')}>✓</Button>
                                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleCancelEdit(prog, 'data_inicio_realizado')}>✕</Button>
                                </div>
                              ) : (
                                <p 
                                  className="text-green-600 font-medium cursor-pointer hover:underline"
                                  onClick={() => handleStartEdit(prog, 'data_inicio_realizado')}
                                >
                                  {prog.data_inicio_realizado ? format(new Date(prog.data_inicio_realizado), 'dd/MM/yyyy') : '+ Registrar'}
                                </p>
                              )
                            ) : (
                              prog.data_inicio_realizado && (
                                <p className="text-green-600 font-medium">
                                  {format(new Date(prog.data_inicio_realizado), 'dd/MM/yyyy')}
                                </p>
                              )
                            )}
                          </div>
                        </td>
                        
                        {/* Conclusão - Editável por admin */}
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="text-sm">
                            <p className="text-gray-600">
                              {prog.data_conclusao_previsto ? format(new Date(prog.data_conclusao_previsto), 'dd/MM/yyyy') : '-'}
                            </p>
                            {user?.role === 'admin' ? (
                              editMode[`${prog.id}_data_conclusao_realizado`] ? (
                                <div className="flex items-center gap-1 justify-center">
                                  <Input
                                    type="date"
                                    className="h-7 w-32 text-xs"
                                    value={editData[`${prog.id}_data_conclusao_realizado`] || ''}
                                    onChange={(e) => setEditData({
                                      ...editData,
                                      [`${prog.id}_data_conclusao_realizado`]: e.target.value
                                    })}
                                  />
                                  <Button size="sm" className="h-7 px-2" onClick={() => handleSaveEdit(prog, 'data_conclusao_realizado')}>✓</Button>
                                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleCancelEdit(prog, 'data_conclusao_realizado')}>✕</Button>
                                </div>
                              ) : (
                                <p 
                                  className="text-green-600 font-medium cursor-pointer hover:underline"
                                  onClick={() => handleStartEdit(prog, 'data_conclusao_realizado')}
                                >
                                  {prog.data_conclusao_realizado ? format(new Date(prog.data_conclusao_realizado), 'dd/MM/yyyy') : '+ Registrar'}
                                </p>
                              )
                            ) : (
                              prog.data_conclusao_realizado && (
                                <p className="text-green-600 font-medium">
                                  {format(new Date(prog.data_conclusao_realizado), 'dd/MM/yyyy')}
                                </p>
                              )
                            )}
                          </div>
                        </td>
                        
                        {/* Atividades - Editável */}
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          {user?.role === 'admin' && editMode[`${prog.id}_atividades`] ? (
                            <div className="flex items-center gap-1 justify-center">
                              <Input
                                type="number"
                                className="h-7 w-12 text-xs"
                                value={editData[`${prog.id}_atividades_realizadas`] || 0}
                                onChange={(e) => setEditData({
                                  ...editData,
                                  [`${prog.id}_atividades_realizadas`]: parseInt(e.target.value)
                                })}
                              />
                              <span className="text-sm">/</span>
                              <Input
                                type="number"
                                className="h-7 w-12 text-xs"
                                value={editData[`${prog.id}_atividades_previstas`] || 0}
                                onChange={(e) => setEditData({
                                  ...editData,
                                  [`${prog.id}_atividades_previstas`]: parseInt(e.target.value)
                                })}
                              />
                              <Button size="sm" className="h-7 px-2" onClick={async () => {
                                await updateProgressoMutation.mutateAsync({
                                  id: prog.id,
                                  data: {
                                    atividades_realizadas: editData[`${prog.id}_atividades_realizadas`],
                                    atividades_previstas: editData[`${prog.id}_atividades_previstas`]
                                  }
                                });
                                setEditMode({ ...editMode, [`${prog.id}_atividades`]: false });
                              }}>✓</Button>
                            </div>
                          ) : (
                            <span 
                              className={`text-sm font-medium ${user?.role === 'admin' ? 'cursor-pointer hover:text-blue-600' : ''}`}
                              onClick={() => user?.role === 'admin' && handleStartEdit(prog, 'atividades')}
                            >
                              {prog.atividades_realizadas || 0}/{prog.atividades_previstas || 0}
                            </span>
                          )}
                        </td>
                        
                        {/* Tarefas - Editável */}
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          {user?.role === 'admin' && editMode[`${prog.id}_tarefas`] ? (
                            <div className="flex items-center gap-1 justify-center">
                              <Input
                                type="number"
                                className="h-7 w-12 text-xs"
                                value={editData[`${prog.id}_tarefas_entregues`] || 0}
                                onChange={(e) => setEditData({
                                  ...editData,
                                  [`${prog.id}_tarefas_entregues`]: parseInt(e.target.value)
                                })}
                              />
                              <span className="text-sm">/</span>
                              <Input
                                type="number"
                                className="h-7 w-12 text-xs"
                                value={editData[`${prog.id}_tarefas_solicitadas`] || 0}
                                onChange={(e) => setEditData({
                                  ...editData,
                                  [`${prog.id}_tarefas_solicitadas`]: parseInt(e.target.value)
                                })}
                              />
                              <Button size="sm" className="h-7 px-2" onClick={async () => {
                                await updateProgressoMutation.mutateAsync({
                                  id: prog.id,
                                  data: {
                                    tarefas_entregues: editData[`${prog.id}_tarefas_entregues`],
                                    tarefas_solicitadas: editData[`${prog.id}_tarefas_solicitadas`]
                                  }
                                });
                                setEditMode({ ...editMode, [`${prog.id}_tarefas`]: false });
                              }}>✓</Button>
                            </div>
                          ) : (
                            <span 
                              className={`text-sm font-medium ${user?.role === 'admin' ? 'cursor-pointer hover:text-blue-600' : ''}`}
                              onClick={() => user?.role === 'admin' && handleStartEdit(prog, 'tarefas')}
                            >
                              {prog.tarefas_entregues || 0}/{prog.tarefas_solicitadas || 0}
                            </span>
                          )}
                        </td>
                        
                        <td className="px-4 py-3 text-center">
                          {prog.avaliacao_participante?.nota ? (
                            <div className="flex items-center justify-center gap-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              <span className="font-medium">{prog.avaliacao_participante.nota}/10</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {prog.avaliacao_programa?.resultado ? (
                            <Badge className="bg-green-100 text-green-800">
                              {prog.avaliacao_programa.resultado}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        
                        {/* Situação - Editável por admin */}
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          {user?.role === 'admin' && editMode[`${prog.id}_situacao`] ? (
                            <div className="flex items-center gap-1 justify-center">
                              <Select
                                value={editData[`${prog.id}_situacao`] || prog.situacao}
                                onValueChange={(value) => setEditData({
                                  ...editData,
                                  [`${prog.id}_situacao`]: value
                                })}
                              >
                                <SelectTrigger className="h-7 w-36 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="nao_iniciado">Não Iniciado</SelectItem>
                                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                                  <SelectItem value="concluido">Concluído</SelectItem>
                                  <SelectItem value="atrasado">Atrasado</SelectItem>
                                  <SelectItem value="cancelado">Cancelado</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button size="sm" className="h-7 px-2" onClick={() => handleSaveEdit(prog, 'situacao')}>✓</Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleCancelEdit(prog, 'situacao')}>✕</Button>
                            </div>
                          ) : (
                            <Badge 
                              className={`${getSituacaoColor(prog.situacao)} ${user?.role === 'admin' ? 'cursor-pointer hover:ring-2 hover:ring-blue-300' : ''}`}
                              onClick={() => user?.role === 'admin' && handleStartEdit(prog, 'situacao')}
                            >
                              {prog.situacao.replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes do Módulo */}
      {selectedModulo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle>{selectedModulo.modulo_nome}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedModulo(null)}
                >
                  ✕
                </Button>
              </div>
              <Badge className={getSituacaoColor(selectedModulo.situacao)}>
                {selectedModulo.situacao.replace(/_/g, ' ')}
              </Badge>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Início Previsto</p>
                  <p className="font-medium">
                    {selectedModulo.data_inicio_previsto ? 
                      format(new Date(selectedModulo.data_inicio_previsto), "dd 'de' MMMM", { locale: ptBR }) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Conclusão Prevista</p>
                  <p className="font-medium">
                    {selectedModulo.data_conclusao_previsto ? 
                      format(new Date(selectedModulo.data_conclusao_previsto), "dd 'de' MMMM", { locale: ptBR }) : '-'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Atividades</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {selectedModulo.atividades_realizadas}/{selectedModulo.atividades_previstas}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tarefas</p>
                  <p className="text-2xl font-bold text-green-600">
                    {selectedModulo.tarefas_entregues}/{selectedModulo.tarefas_solicitadas}
                  </p>
                </div>
              </div>

              {selectedModulo.anotacoes_consultor && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Anotações do Consultor</p>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                    {selectedModulo.anotacoes_consultor}
                  </div>
                </div>
              )}

              {user?.role !== 'admin' && !selectedModulo.avaliacao_participante?.nota && selectedModulo.situacao === 'concluido' && (
                <Button
                  onClick={() => setShowAvaliacaoModal(true)}
                  className="w-full"
                >
                  <Star className="w-4 h-4 mr-2" />
                  Avaliar Módulo
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}