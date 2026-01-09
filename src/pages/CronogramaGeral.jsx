import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar, Search, Download, AlertCircle, CheckCircle2, Clock, ChevronRight } from "lucide-react";
import ClientDetailPanel from "@/components/aceleracao/ClientDetailPanel";
import AvaliacaoProcessoModal from "@/components/aceleracao/AvaliacaoProcessoModal";

export default function CronogramaGeral() {
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
    queryFn: () => base44.entities.CronogramaProgresso.list()
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
  
  console.log("🔍 DEBUG - Plan Data:", planData);
  console.log("🔍 DEBUG - Selected Plan:", selectedPlan);
  console.log("🔍 DEBUG - All Plan Features:", planFeatures);
  
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
      const progresso = progressos.find(p => 
        p.workshop_id === workshop.id && p.modulo_codigo === codigoProcesso
      );

      let status = 'a_fazer';
      if (progresso) {
        if (progresso.situacao === 'concluido') {
          status = 'concluido';
        } else if (progresso.situacao === 'atrasado') {
          status = 'atrasado';
        } else if (progresso.situacao === 'em_andamento') {
          status = 'em_andamento';
        }
      }

      return { workshop, status, progresso };
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
    const totalProcessos = processos.length;
    const concluidos = progressosWorkshop.filter(p => p.situacao === 'concluido').length;
    const atrasados = progressosWorkshop.filter(p => p.situacao === 'atrasado').length;
    const percentual = totalProcessos > 0 ? Math.round((concluidos / totalProcessos) * 100) : 0;

    let statusGeral = 'a_fazer';
    if (concluidos === totalProcessos) {
      statusGeral = 'concluido';
    } else if (atrasados > 0) {
      statusGeral = 'atrasado';
    } else if (concluidos > 0) {
      statusGeral = 'ativo';
    }

    return {
      ...workshop,
      percentualConclusao: percentual,
      statusGeral,
      atrasados,
      progressos: progressosWorkshop
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
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
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

      {/* Conteúdo Principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Coluna Esquerda - Tabela de Processos */}
        <div className="w-1/2 border-r border-gray-200 overflow-y-auto p-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Processos - Plano {selectedPlan}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {processos.length} itens no cronograma
                  </p>
                </div>
                {planData && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {workshopsPorPlano.length} clientes
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {processos.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="font-semibold mb-2">Nenhum processo registrado para o plano {selectedPlan}.</p>
                  <p className="text-sm mb-4">Configure os processos deste plano em PlanFeature ou CronogramaTemplate.</p>
                  {user.role === 'admin' && (
                    <div className="text-xs text-left bg-gray-50 p-3 rounded border mt-4 max-w-md mx-auto">
                      <p className="font-semibold mb-1">💡 Debug Info:</p>
                      <p>Plan Features carregados: {planFeatures.length}</p>
                      <p>Templates carregados: {templates.length}</p>
                      <p>Plan Data encontrado: {planData ? 'Sim' : 'Não'}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Processos</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">A Fazer</th>
                        <th className="text-center py-3 px-4 font-semibold text-red-600">Atrasado</th>
                        <th className="text-center py-3 px-4 font-semibold text-green-600">Concluído</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processos.map((processo) => {
                        const contagem = getContagemPorProcesso(processo.codigo);
                        const isSelected = selectedProcess?.codigo === processo.codigo;
                        return (
                          <tr 
                            key={processo.codigo} 
                            onClick={() => setSelectedProcess(isSelected ? null : processo)}
                            className={`border-b border-gray-100 cursor-pointer transition-colors ${
                              isSelected 
                                ? 'bg-blue-100 hover:bg-blue-100' 
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <td className={`py-3 px-4 font-medium ${isSelected ? 'text-blue-900' : ''}`}>
                              {processo.nome || processo.codigo}
                            </td>
                            <td className="text-center py-3 px-4">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                {contagem.a_fazer + contagem.em_andamento}
                              </Badge>
                            </td>
                            <td className="text-center py-3 px-4">
                              <Badge variant="outline" className="bg-red-50 text-red-700">
                                {contagem.atrasado}
                              </Badge>
                            </td>
                            <td className="text-center py-3 px-4">
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                {contagem.concluido}
                              </Badge>
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
        <div className="w-1/2 flex flex-col p-6">
          <Card className="flex flex-col h-full">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>LISTA DE CLIENTES</CardTitle>
                  {selectedProcess && (
                    <p className="text-sm text-gray-600 mt-1">
                      Filtrando por: <span className="font-semibold text-blue-600">{selectedProcess.nome}</span>
                    </p>
                  )}
                </div>
                {selectedProcess && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedProcess(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Limpar Filtro
                  </Button>
                )}
              </div>
              <div className="flex gap-3 mt-4">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-48">
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
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar oficina..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {clientesFiltrados.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>Nenhum cliente encontrado para este filtro.</p>
                  {user.role === 'admin' && (
                    <Button className="mt-4" variant="outline">
                      Associar Clientes ao Plano
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {clientesFiltrados.map((cliente) => (
                    <div
                      key={cliente.id}
                      onClick={() => {
                        setSelectedClient(cliente);
                        setShowPanel(true);
                      }}
                      className="border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer bg-white"
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
                                <CheckCircle2 className="w-3 h-3 mr-1" />
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
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Painel Lateral de Detalhes */}
      {showPanel && selectedClient && (
        <ClientDetailPanel
          client={selectedClient}
          processos={processos}
          onClose={() => setShowPanel(false)}
          onAvaliar={(client, process) => {
            setAvaliacaoModal({ show: true, client, process });
            setShowPanel(false);
          }}
        />
      )}

      {/* Modal de Avaliação */}
      {avaliacaoModal.show && (
        <AvaliacaoProcessoModal
          client={avaliacaoModal.client}
          process={avaliacaoModal.process}
          onClose={() => setAvaliacaoModal({ show: false, client: null, process: null })}
          onSave={() => {
            setAvaliacaoModal({ show: false, client: null, process: null });
            // Recarregar dados
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
                              <CheckCircle2 className="w-3 h-3 mr-1" />
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