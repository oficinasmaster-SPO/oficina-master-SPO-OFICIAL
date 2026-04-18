import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar, Search, Download, AlertCircle, Check, Clock, ChevronRight } from "lucide-react";
import ClientDetailPanel from "@/components/aceleracao/ClientDetailPanel";
import AvaliacaoProcessoModal from "@/components/aceleracao/AvaliacaoProcessoModal";

export default function CronogramaGeral({ isTab = false }) {
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState("GOLD");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [showPanel, setShowPanel] = useState(false);
  const [avaliacaoModal, setAvaliacaoModal] = useState({ show: false, client: null, process: null });
  const [detailsModal, setDetailsModal] = useState({ show: false, type: null, data: [] });

  // Carregar usuário
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  // Sincronizar sprints com cronograma em tempo real
  useEffect(() => {
    const unsubscribeSprints = base44.entities.ConsultoriaSprint.subscribe((event) => {
      queryClient.refetchQueries(['cronograma-progressos']);
      queryClient.refetchQueries(['cronograma-implementacoes-all']);
    });

    const unsubscribeImplementacoes = base44.entities.CronogramaImplementacao.subscribe((event) => {
      queryClient.refetchQueries(['cronograma-progressos']);
      queryClient.refetchQueries(['cronograma-implementacoes-all']);
    });

    return () => {
      unsubscribeSprints();
      unsubscribeImplementacoes();
    };
  }, [queryClient]);

  // Carregar workshops com planos ativos
  const { data: workshops = [], isLoading } = useQuery({
    queryKey: ['workshops-cronograma'],
    queryFn: async () => {
      const all = await base44.entities.Workshop.list();
      // Se o plano selecionado for "TODOS" ou "FREE", mostra todos ou filtra por FREE
      if (selectedPlan === 'TODOS') return all;
      if (selectedPlan === 'FREE') return all.filter(w => w.planoAtual === 'FREE');
      return all.filter(w => w.planoAtual && w.planoAtual !== 'FREE');
    },
    enabled: !!selectedPlan
  });

  // Carregar progresso dos cronogramas
  const { data: progressos = [] } = useQuery({
    queryKey: ['cronograma-progressos'],
    queryFn: () => base44.entities.CronogramaProgresso.list(),
    refetchInterval: 5000 // Refetch a cada 5 segundos para capturar atualizações
  });

  // Carregar implementações para sincronizar com progressos
  const { data: implementacoes = [] } = useQuery({
    queryKey: ['cronograma-implementacoes-all'],
    queryFn: async () => {
      try {
        return await base44.entities.CronogramaImplementacao.list();
      } catch (error) {
        console.error('Erro ao carregar implementações:', error);
        return [];
      }
    },
    refetchInterval: 5000
  });

  // Carregar templates de cronograma
  const { data: templates = [] } = useQuery({
    queryKey: ['cronograma-templates'],
    queryFn: () => base44.entities.CronogramaTemplate.list()
  });

  // Carregar features dos planos
  const { data: planFeatures = [], isLoading: loadingFeatures } = useQuery({
    queryKey: ['plan-features'],
    queryFn: async () => {
      try {
        return await base44.entities.PlanFeature.list();
      } catch (error) {
        console.error("Erro ao carregar PlanFeature:", error);
        return [];
      }
    }
  });

  // Verificar acesso
  if (!user || (user.role !== 'admin' && user.job_role !== 'acelerador')) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Acesso Restrito</h2>
          <p className="text-gray-600">Esta área é restrita a consultores e aceleradores.</p>
        </div>
      </div>
    );
  }

  // Filtrar workshops pelo plano selecionado
  const workshopsPorPlano = selectedPlan === 'TODOS' 
    ? workshops 
    : workshops.filter(w => w.planoAtual === selectedPlan);

  // Obter dados do plano selecionado
  const planData = planFeatures.find(p => p.plan_id === selectedPlan);
  

  
  // Combinar funcionalidades e módulos do cronograma
  let processos = [];

  if (selectedPlan === 'TODOS') {
    // Quando "TODOS" está selecionado, agregar processos de todos os planos
    const processosMap = new Map();
    
    planFeatures.forEach(pf => {
      pf.cronograma_features?.forEach(featId => {
        if (!processosMap.has(featId)) {
          processosMap.set(featId, {
            codigo: featId,
            nome: featId.replace(/_/g, ' ').toUpperCase(),
            tipo: 'funcionalidade'
          });
        }
      });
      
      pf.cronograma_modules?.forEach(modId => {
        if (!processosMap.has(modId)) {
          processosMap.set(modId, {
            codigo: modId,
            nome: modId,
            tipo: 'modulo'
          });
        }
      });
    });
    
    processos = Array.from(processosMap.values());
    
    // Fallback para templates
    if (processos.length === 0 && templates.length > 0) {
      templates.forEach(t => {
        const codigo = t.modulo_codigo || t.id;
        if (!processosMap.has(codigo)) {
          processos.push({
            codigo,
            nome: t.nome || t.titulo || 'Processo',
            tipo: 'template'
          });
        }
      });
    }
  } else {
    // Lógica original para planos específicos
    processos = [
      ...(planData?.cronograma_features?.map(featId => ({
        codigo: featId,
        nome: featId.replace(/_/g, ' ').toUpperCase(),
        tipo: 'funcionalidade'
      })) || []),
      ...(planData?.cronograma_modules?.map(modId => ({
        codigo: modId,
        nome: modId,
        tipo: 'modulo'
      })) || [])
    ];

    // Fallback: Se não há PlanFeature configurado, busca templates do cronograma
    if (processos.length === 0 && templates.length > 0) {
      const templateProcessos = templates
        .filter(t => t.plan_id === selectedPlan || !t.plan_id)
        .map(t => ({
          codigo: t.modulo_codigo || t.id,
          nome: t.nome || t.titulo || 'Processo',
          tipo: 'template'
        }));
      processos.push(...templateProcessos);
    }
  }

  // Calcular contadores por processo
  const getContagemPorProcesso = (codigoProcesso) => {
    const clientesComProcesso = workshopsPorPlano.map(workshop => {
      // Primeiro verificar CronogramaProgresso
      const progresso = progressos.find(p => 
        p.workshop_id === workshop.id && p.modulo_codigo === codigoProcesso
      );

      // Depois verificar CronogramaImplementacao como fonte de verdade
      const implementacao = implementacoes.find(i => 
        i.workshop_id === workshop.id && (i.item_id === codigoProcesso || i.item_nome === codigoProcesso)
      );

      let status = 'a_fazer';

      // CronogramaImplementacao é fonte de verdade se existir
      if (implementacao) {
        if (implementacao.status === 'concluido') {
          status = 'concluido';
        } else if (implementacao.status === 'em_andamento') {
          const diasRestantes = new Date(implementacao.data_termino_previsto) - new Date();
          status = diasRestantes < 0 ? 'atrasado' : 'em_andamento';
        } else {
          status = 'a_fazer';
        }
      } else if (progresso) {
        // Fallback para CronogramaProgresso
        if (progresso.situacao === 'concluido') {
          status = 'concluido';
        } else if (progresso.situacao === 'atrasado') {
          status = 'atrasado';
        } else if (progresso.situacao === 'em_andamento') {
          status = 'em_andamento';
        }
      }

      return { workshop, status, progresso, implementacao };
    });

    return {
      a_fazer: clientesComProcesso.filter(c => c.status === 'a_fazer').length,
      atrasado: clientesComProcesso.filter(c => c.status === 'atrasado').length,
      concluido: clientesComProcesso.filter(c => c.status === 'concluido').length,
      em_andamento: clientesComProcesso.filter(c => c.status === 'em_andamento').length
    };
  };

  // Preparar lista de clientes com seus status
  const clientesComStatus = workshopsPorPlano.map(workshop => {
    const progressosWorkshop = progressos.filter(p => p.workshop_id === workshop.id);
    const implementacoesWorkshop = implementacoes.filter(i => i.workshop_id === workshop.id);
    
    const totalProcessos = processos.length;
    
    // Priorizar dados de CronogramaImplementacao
    const concluidos = implementacoesWorkshop.filter(i => i.status === 'concluido').length 
      || progressosWorkshop.filter(p => p.situacao === 'concluido').length;
    
    const atrasados = implementacoesWorkshop.filter(i => {
      if (i.status === 'concluido' || i.status === 'a_fazer') return false;
      return new Date(i.data_termino_previsto) < new Date();
    }).length 
      || progressosWorkshop.filter(p => p.situacao === 'atrasado').length;
    
    const emAndamento = implementacoesWorkshop.filter(i => i.status === 'em_andamento').length
      || progressosWorkshop.filter(p => p.situacao === 'em_andamento').length;

    const percentual = totalProcessos > 0 ? Math.round((concluidos / totalProcessos) * 100) : 0;

    let statusGeral = 'a_fazer';
    if (concluidos === totalProcessos) {
      statusGeral = 'concluido';
    } else if (atrasados > 0) {
      statusGeral = 'atrasado';
    } else if (concluidos > 0 || emAndamento > 0) {
      statusGeral = 'ativo';
    }

    return {
      ...workshop,
      percentualConclusao: percentual,
      statusGeral,
      atrasados,
      emAndamento,
      progressos: progressosWorkshop,
      implementacoes: implementacoesWorkshop
    };
  });

  // Aplicar filtros
  const clientesFiltrados = clientesComStatus.filter(cliente => {
    // Filtro por processo selecionado - mostra TODOS os clientes com esse processo
    if (selectedProcess) {
      // Simplesmente verifica se existe progresso do processo para este workshop
      const temProcesso = progressos.some(p => 
        p.workshop_id === cliente.id && p.modulo_codigo === selectedProcess.codigo
      );
      
      // Se não tem progresso registrado, ainda mostra (pois o cliente está no plano e deve fazer o processo)
      // Isso garante que todos os clientes apareçam, independente do status
    }

    const matchStatus = filterStatus === 'todos' || 
      (filterStatus === 'ativo' && cliente.statusGeral === 'ativo') ||
      (filterStatus === 'concluido' && cliente.statusGeral === 'concluido') ||
      (filterStatus === 'a_fazer' && cliente.statusGeral === 'a_fazer');

    const matchSearch = !searchTerm || 
      cliente.name.toLowerCase().includes(searchTerm.toLowerCase());

    return matchStatus && matchSearch;
  });

  const getClientesPorStatus = (tipo) => {
    if (tipo === 'a_fazer') {
      return clientesComStatus.filter(c => c.statusGeral === 'a_fazer' || c.statusGeral === 'ativo');
    } else if (tipo === 'atrasado') {
      return clientesComStatus.filter(c => c.atrasados > 0);
    } else if (tipo === 'concluido') {
      return clientesComStatus.filter(c => c.statusGeral === 'concluido');
    }
    return [];
  };

  const handleExport = () => {
    // Implementar export CSV/PDF
    console.log('Exportando relatório...');
  };

  return (
    <div className={`${isTab ? 'h-[calc(100vh-250px)] rounded-b-lg' : 'h-screen'} flex flex-col bg-gray-50`}>
      {/* Header */}
      <div className={`bg-white border-b border-gray-200 px-6 py-4 ${isTab ? 'hidden' : ''}`}>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">CRONOGRAMA GERAL</h1>
          <div className="flex gap-3">
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS" className="font-bold">TODOS OS CLIENTES</SelectItem>
                <SelectItem value="FREE" className="font-bold">FREE</SelectItem>
                <SelectItem value="START" className="font-bold">START</SelectItem>
                <SelectItem value="BRONZE" className="font-bold">BRONZE</SelectItem>
                <SelectItem value="PRATA" className="font-bold">PRATA</SelectItem>
                <SelectItem value="GOLD" className="font-bold">GOLD</SelectItem>
                <SelectItem value="IOM" className="font-bold">IOM</SelectItem>
                <SelectItem value="MILLIONS" className="font-bold">MILLIONS</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Cards de Totais */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="py-4">
              <div className="text-center">
                <p className="text-sm text-blue-600 font-medium mb-1">Total A Fazer</p>
                <p className="text-3xl font-bold text-blue-900">
                  {processos.reduce((acc, p) => {
                    const contagem = getContagemPorProcesso(p.codigo);
                    return acc + contagem.a_fazer + contagem.em_andamento;
                  }, 0)}
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2 text-blue-700 hover:text-blue-900 hover:bg-blue-200"
                  onClick={() => setDetailsModal({ 
                    show: true, 
                    type: 'a_fazer', 
                    data: getClientesPorStatus('a_fazer'),
                    title: 'Clientes com Processos A Fazer'
                  })}
                >
                  Ver Detalhes
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="py-4">
              <div className="text-center">
                <p className="text-sm text-red-600 font-medium mb-1">Total Atrasado</p>
                <p className="text-3xl font-bold text-red-900">
                  {processos.reduce((acc, p) => {
                    const contagem = getContagemPorProcesso(p.codigo);
                    return acc + contagem.atrasado;
                  }, 0)}
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2 text-red-700 hover:text-red-900 hover:bg-red-200"
                  onClick={() => setDetailsModal({ 
                    show: true, 
                    type: 'atrasado', 
                    data: getClientesPorStatus('atrasado'),
                    title: 'Clientes com Processos Atrasados'
                  })}
                >
                  Ver Detalhes
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="py-4">
              <div className="text-center">
                <p className="text-sm text-green-600 font-medium mb-1">Total Concluído</p>
                <p className="text-3xl font-bold text-green-900">
                  {processos.reduce((acc, p) => {
                    const contagem = getContagemPorProcesso(p.codigo);
                    return acc + contagem.concluido;
                  }, 0)}
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2 text-green-700 hover:text-green-900 hover:bg-green-200"
                  onClick={() => setDetailsModal({ 
                    show: true, 
                    type: 'concluido', 
                    data: getClientesPorStatus('concluido'),
                    title: 'Clientes com Processos Concluídos'
                  })}
                >
                  Ver Detalhes
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-0 shadow-sm">
            <CardContent className="py-4">
              <div className="text-center">
                <p className="text-sm text-purple-600 font-medium mb-1">Taxa Conclusão</p>
                <p className="text-3xl font-bold text-purple-900">
                  {processos.length > 0 ? Math.round(
                    (processos.reduce((acc, p) => {
                      const contagem = getContagemPorProcesso(p.codigo);
                      return acc + contagem.concluido;
                    }, 0) / (workshopsPorPlano.length * processos.length || 1)) * 100
                  ) : 0}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {isTab && (
        <div className="px-5 py-3 bg-white border-b border-gray-200 rounded-t-lg">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger className="w-[200px] h-9 text-sm font-medium bg-white border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">TODOS OS CLIENTES</SelectItem>
                  <SelectItem value="FREE">FREE</SelectItem>
                  <SelectItem value="START">START</SelectItem>
                  <SelectItem value="BRONZE">BRONZE</SelectItem>
                  <SelectItem value="PRATA">PRATA</SelectItem>
                  <SelectItem value="GOLD">GOLD</SelectItem>
                  <SelectItem value="IOM">IOM</SelectItem>
                  <SelectItem value="MILLIONS">MILLIONS</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleExport} className="h-9 text-sm">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Exportar
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <div className="text-center px-4 py-1 border-r border-gray-200">
                <p className="text-[11px] font-medium text-blue-600 leading-tight">A Fazer</p>
                <p className="text-lg font-bold text-blue-900 leading-tight">
                  {processos.reduce((acc, p) => { const c = getContagemPorProcesso(p.codigo); return acc + c.a_fazer + c.em_andamento; }, 0)}
                </p>
              </div>
              <div className="text-center px-4 py-1 border-r border-gray-200">
                <p className="text-[11px] font-medium text-red-600 leading-tight">Atrasado</p>
                <p className="text-lg font-bold text-red-900 leading-tight">
                  {processos.reduce((acc, p) => { const c = getContagemPorProcesso(p.codigo); return acc + c.atrasado; }, 0)}
                </p>
              </div>
              <div className="text-center px-4 py-1 border-r border-gray-200">
                <p className="text-[11px] font-medium text-green-600 leading-tight">Concluído</p>
                <p className="text-lg font-bold text-green-900 leading-tight">
                  {processos.reduce((acc, p) => { const c = getContagemPorProcesso(p.codigo); return acc + c.concluido; }, 0)}
                </p>
              </div>
              <div className="text-center px-4 py-1">
                <p className="text-[11px] font-medium text-purple-600 leading-tight">Taxa Conclusão</p>
                <p className="text-lg font-bold text-purple-900 leading-tight">
                  {processos.length > 0 ? Math.round((processos.reduce((acc, p) => { const c = getContagemPorProcesso(p.codigo); return acc + c.concluido; }, 0) / (workshopsPorPlano.length * processos.length || 1)) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
        {/* Coluna Esquerda - Tabela de Processos */}
        <div className="border-r border-gray-200 overflow-y-auto p-4 lg:p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Processos — {selectedPlan === 'TODOS' ? 'Todos os Planos' : `Plano ${selectedPlan}`}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {processos.length} itens no cronograma
              </p>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5">
              {workshopsPorPlano.length} clientes
            </Badge>
          </div>

          <Card className="shadow-sm border-gray-200">
            <CardContent className="p-0">
              {processos.length === 0 ? (
                <div className="text-center py-10 text-gray-500 px-4">
                  <AlertCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-medium mb-1">Nenhum processo registrado para o plano {selectedPlan}.</p>
                  <p className="text-xs text-gray-400">Configure os processos deste plano em PlanFeature ou CronogramaTemplate.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/60">
                        <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Processos</th>
                        <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">A Fazer</th>
                        <th className="text-center py-2.5 px-3 text-xs font-semibold text-red-500 uppercase tracking-wider w-20">Atrasado</th>
                        <th className="text-center py-2.5 px-3 text-xs font-semibold text-green-600 uppercase tracking-wider w-24">Concluído</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {processos.map((processo) => {
                        const contagem = getContagemPorProcesso(processo.codigo);
                        const isSelected = selectedProcess?.codigo === processo.codigo;
                        return (
                          <tr 
                            key={processo.codigo} 
                            onClick={() => setSelectedProcess(isSelected ? null : processo)}
                            className={`cursor-pointer transition-colors ${
                              isSelected 
                                ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' 
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <td className={`py-3 px-4 text-sm font-medium leading-tight ${isSelected ? 'text-blue-800' : 'text-gray-800'}`}>
                              {processo.nome || processo.codigo}
                            </td>
                            <td className="text-center py-3 px-3">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                {contagem.a_fazer + contagem.em_andamento}
                              </span>
                            </td>
                            <td className="text-center py-3 px-3">
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold border ${contagem.atrasado > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                                {contagem.atrasado}
                              </span>
                            </td>
                            <td className="text-center py-3 px-3">
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold border ${contagem.concluido > 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                                {contagem.concluido}
                              </span>
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
        </div>

        {/* Coluna Direita - Lista de Clientes */}
        <div className="flex flex-col p-4 lg:p-5 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Lista de Clientes</h2>
              {selectedProcess && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Filtrando: <span className="font-medium text-blue-600">{selectedProcess.nome}</span>
                </p>
              )}
            </div>
            {selectedProcess && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedProcess(null)}
                className="text-xs text-gray-500 hover:text-gray-700 h-7"
              >
                Limpar
              </Button>
            )}
          </div>
          <div className="flex gap-2 mb-3">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="a_fazer">A Fazer</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input
                placeholder="Buscar oficina..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {clientesFiltrados.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <AlertCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Nenhum cliente encontrado.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {clientesFiltrados.map((cliente) => (
                  <div
                    key={cliente.id}
                    onClick={() => {
                      setSelectedClient(cliente);
                      setShowPanel(true);
                    }}
                    className="group border border-gray-200 rounded-lg px-4 py-3 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer bg-white"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">{cliente.name}</h3>
                          {cliente.statusGeral === 'atrasado' && (
                            <Badge className="bg-red-50 text-red-600 border-red-200 text-[10px] px-1.5 py-0 shrink-0">
                              Atrasado
                            </Badge>
                          )}
                          {cliente.statusGeral === 'concluido' && (
                            <Badge className="bg-green-50 text-green-600 border-green-200 text-[10px] px-1.5 py-0 shrink-0">
                              Concluído
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>Plano: <span className="font-medium text-gray-700">{cliente.planoAtual}</span></span>
                          {cliente.city && <span>Cidade: {cliente.city}/{cliente.state}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full transition-all ${cliente.percentualConclusao === 100 ? 'bg-green-500' : cliente.percentualConclusao > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}
                              style={{ width: `${Math.max(cliente.percentualConclusao, 2)}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-gray-600 w-8 text-right">{cliente.percentualConclusao}%</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
                    </div>
                    {cliente.atrasados > 0 && (
                      <div className="mt-1.5 text-[11px] text-red-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {cliente.atrasados} processo(s) atrasado(s)
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Detalhes do Cliente */}
      <ClientDetailPanel
        client={selectedClient}
        isOpen={showPanel}
        onClose={() => setShowPanel(false)}
        atendimentos={[]}
        processos={processos}
      />

      {/* Modal de Avaliação */}
      {avaliacaoModal.show && (
        <AvaliacaoProcessoModal
          client={avaliacaoModal.client}
          process={avaliacaoModal.process}
          onClose={() => setAvaliacaoModal({ show: false, client: null, process: null })}
          onSave={() => {
            setAvaliacaoModal({ show: false, client: null, process: null });
          }}
        />
      )}

      {/* Modal de Detalhes dos Cards */}
      {detailsModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <CardHeader className="border-b flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle>{detailsModal.title}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDetailsModal({ show: false, type: null, data: [] })}
                >
                  ✕
                </Button>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Total: {detailsModal.data.length} cliente(s)
              </p>
            </CardHeader>
            <CardContent className="pt-6 overflow-y-auto flex-1">
              <div className="space-y-3">
                {detailsModal.data.map((cliente) => (
                  <div
                    key={cliente.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer bg-white"
                    onClick={() => {
                      setSelectedClient(cliente);
                      setShowPanel(true);
                      setDetailsModal({ show: false, type: null, data: [] });
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">{cliente.name}</h3>
                          {cliente.statusGeral === 'atrasado' && (
                            <Badge className="bg-red-100 text-red-700">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Atrasado
                            </Badge>
                          )}
                          {cliente.statusGeral === 'concluido' && (
                            <Badge className="bg-green-100 text-green-700">
                              <Check className="w-3 h-3 mr-1" />
                              Concluído
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>Plano: <span className="font-medium">{cliente.planoAtual}</span></p>
                          <p>Cidade: {cliente.city}/{cliente.state}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${cliente.percentualConclusao}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium">{cliente.percentualConclusao}%</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                    {cliente.atrasados > 0 && (
                      <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {cliente.atrasados} processo(s) atrasado(s)
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}