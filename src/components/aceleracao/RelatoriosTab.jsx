import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Loader2, BarChart3, TrendingUp, Users, Calendar as CalendarIcon, Play, Edit, CalendarClock, CheckCircle, Trash2 } from "lucide-react";
import { ATENDIMENTO_STATUS, ATENDIMENTO_STATUS_LABELS } from "@/components/lib/ataConstants";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ReagendarAtendimentoModal from "./ReagendarAtendimentoModal";
import VisualizarAtaModal from "./VisualizarAtaModal";
import FinalizarAtendimentoModal from "./FinalizarAtendimentoModal";

export default function RelatoriosTab({ user }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showReagendar, setShowReagendar] = useState(false);
  const [showVisualizarAta, setShowVisualizarAta] = useState(false);
  const [showFinalizar, setShowFinalizar] = useState(false);
  const [atendimentoReagendar, setAtendimentoReagendar] = useState(null);
  const [atendimentoFinalizar, setAtendimentoFinalizar] = useState(null);
  const [selectedAta, setSelectedAta] = useState(null);
  const [filtros, setFiltros] = useState({
    dataInicio: format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd'),
    dataFim: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    cliente: "",
    consultor: "",
    tipo: "",
    status: ""
  });
  const [gerando, setGerando] = useState(false);

  const { data: workshops } = useQuery({
    queryKey: ['workshops-relatorios'],
    queryFn: async () => {
      const all = await base44.entities.Workshop.list();
      return all.filter(w => w.planoAtual && w.planoAtual !== 'FREE');
    }
  });

  const { data: atendimentos = [] } = useQuery({
    queryKey: ['atendimentos-relatorios'],
    queryFn: () => base44.entities.ConsultoriaAtendimento.list('-data_agendada')
  });

  const { data: planos = [] } = useQuery({
    queryKey: ['planos-relatorios'],
    queryFn: () => base44.entities.MonthlyAccelerationPlan.list('-created_date')
  });

  const { data: atas } = useQuery({
    queryKey: ['atas-relatorios'],
    queryFn: () => base44.entities.MeetingMinutes.list('-created_date')
  });

  const { data: cronogramas = [] } = useQuery({
    queryKey: ['cronogramas-relatorios'],
    queryFn: () => base44.entities.CronogramaImplementacao.list('-created_date')
  });

  const { data: consultores = [] } = useQuery({
    queryKey: ['consultores-relatorios'],
    queryFn: async () => {
      const employees = await base44.entities.Employee.list();
      return employees.filter(e => e.tipo_vinculo === 'interno' && e.status === 'ativo');
    }
  });

  // Filtrar dados
  const dadosFiltrados = useMemo(() => {
    return atendimentos.filter(a => {
      const dataAtendimento = new Date(a.data_agendada);
      const dataInicio = filtros.dataInicio ? new Date(filtros.dataInicio) : null;
      const dataFim = filtros.dataFim ? new Date(filtros.dataFim) : null;

      if (dataInicio && dataAtendimento < dataInicio) return false;
      if (dataFim && dataAtendimento > dataFim) return false;
      if (filtros.cliente && a.workshop_id !== filtros.cliente) return false;
      if (filtros.consultor && a.consultor_id !== filtros.consultor) return false;
      if (filtros.tipo && a.tipo_atendimento !== filtros.tipo) return false;
      if (filtros.status && a.status !== filtros.status) return false;

      return true;
    });
  }, [atendimentos, filtros]);

  // Dados para gráficos
  const dadosGraficos = useMemo(() => {
    const meses = eachMonthOfInterval({
      start: new Date(filtros.dataInicio),
      end: new Date(filtros.dataFim)
    });

    const atendimentosPorMes = meses.map(mes => {
      const mesStr = format(mes, 'yyyy-MM');
      const count = dadosFiltrados.filter(a => 
        format(new Date(a.data_agendada), 'yyyy-MM') === mesStr
      ).length;
      
      return {
        mes: format(mes, 'MMM/yy', { locale: ptBR }),
        atendimentos: count
      };
    });

    const statusDistribution = [
      { name: ATENDIMENTO_STATUS_LABELS[ATENDIMENTO_STATUS.AGENDADO], value: dadosFiltrados.filter(a => a.status === ATENDIMENTO_STATUS.AGENDADO).length, color: '#EF4444' },
      { name: ATENDIMENTO_STATUS_LABELS[ATENDIMENTO_STATUS.CONFIRMADO], value: dadosFiltrados.filter(a => a.status === ATENDIMENTO_STATUS.CONFIRMADO).length, color: '#F59E0B' },
      { name: ATENDIMENTO_STATUS_LABELS[ATENDIMENTO_STATUS.PARTICIPANDO], value: dadosFiltrados.filter(a => a.status === ATENDIMENTO_STATUS.PARTICIPANDO).length, color: '#3B82F6' },
      { name: ATENDIMENTO_STATUS_LABELS[ATENDIMENTO_STATUS.REALIZADO], value: dadosFiltrados.filter(a => a.status === ATENDIMENTO_STATUS.REALIZADO).length, color: '#10B981' },
      { name: ATENDIMENTO_STATUS_LABELS[ATENDIMENTO_STATUS.ATRASADO], value: dadosFiltrados.filter(a => a.status === ATENDIMENTO_STATUS.ATRASADO).length, color: '#DC2626' },
      { name: ATENDIMENTO_STATUS_LABELS[ATENDIMENTO_STATUS.REAGENDADO], value: dadosFiltrados.filter(a => a.status === ATENDIMENTO_STATUS.REAGENDADO).length, color: '#8B5CF6' }
    ].filter(item => item.value > 0);

    const tipoDistribution = [
      { name: 'Diagnóstico Inicial', value: dadosFiltrados.filter(a => a.tipo_atendimento === 'diagnostico_inicial').length },
      { name: 'Acompanhamento Mensal', value: dadosFiltrados.filter(a => a.tipo_atendimento === 'acompanhamento_mensal').length },
      { name: 'Reunião Estratégica', value: dadosFiltrados.filter(a => a.tipo_atendimento === 'reuniao_estrategica').length },
      { name: 'Emergencial', value: dadosFiltrados.filter(a => a.tipo_atendimento === 'emergencial').length }
    ].filter(item => item.value > 0);

    const clientesAtivos = [...new Set(dadosFiltrados.map(a => a.workshop_id))].length;
    const taxaConclusao = dadosFiltrados.length > 0 
      ? Math.round((dadosFiltrados.filter(a => a.status === ATENDIMENTO_STATUS.REALIZADO).length / dadosFiltrados.length) * 100)
      : 0;

    return {
      atendimentosPorMes,
      statusDistribution,
      tipoDistribution,
      clientesAtivos,
      taxaConclusao,
      totalAtendimentos: dadosFiltrados.length
    };
  }, [dadosFiltrados, filtros]);

  const exportarCSV = () => {
    const headers = ['ID ATA', 'Data', 'Cliente', 'Tipo', 'Status', 'Consultor', 'Duração'];
    const rows = dadosFiltrados.map(a => {
      const workshop = workshops?.find(w => w.id === a.workshop_id);
      const ataVinculada = atas?.find(ata => ata.id === a.ata_id);
      return [
        ataVinculada?.code ? ataVinculada.code.replace('IT.', 'AT.') : '-',
        format(new Date(a.data_agendada), 'dd/MM/yyyy HH:mm'),
        workshop?.name || '-',
        a.tipo_atendimento,
        a.status,
        a.consultor_nome || '-',
        `${a.duracao_minutos || 0} min`
      ];
    });

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Relatorio_Atendimentos_${format(new Date(), 'ddMMyyyy')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('CSV exportado com sucesso!');
  };

  const exportarPDF = () => {
    window.print();
    toast.success('Preparando impressão...');
  };

  const iniciarMutation = useMutation({
    mutationFn: (id) => base44.entities.ConsultoriaAtendimento.update(id, { 
      status: 'participando',
      hora_inicio_real: new Date().toISOString()
    }),
    onSuccess: () => {
      toast.success('Reunião iniciada!');
      queryClient.invalidateQueries(['atendimentos-relatorios']);
    }
  });

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Filtros Avançados */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Filtros Avançados</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={exportarCSV}>
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
              <Button size="sm" onClick={exportarPDF}>
                <FileText className="w-4 h-4 mr-2" />
                Exportar PDF
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <Label>Data Início</Label>
              <Input
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => setFiltros({...filtros, dataInicio: e.target.value})}
              />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={filtros.dataFim}
                onChange={(e) => setFiltros({...filtros, dataFim: e.target.value})}
              />
            </div>
            <div>
              <Label>Cliente</Label>
              <Select value={filtros.cliente} onValueChange={(v) => setFiltros({...filtros, cliente: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Todos</SelectItem>
                  {workshops?.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Consultor</Label>
              <Select value={filtros.consultor} onValueChange={(v) => setFiltros({...filtros, consultor: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Todos</SelectItem>
                  {consultores?.map(c => (
                    <SelectItem key={c.user_id} value={c.user_id}>{c.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={filtros.tipo} onValueChange={(v) => setFiltros({...filtros, tipo: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Todos</SelectItem>
                  <SelectItem value="diagnostico_inicial">Diagnóstico</SelectItem>
                  <SelectItem value="acompanhamento_mensal">Acompanhamento</SelectItem>
                  <SelectItem value="reuniao_estrategica">Estratégica</SelectItem>
                  <SelectItem value="emergencial">Emergencial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={filtros.status} onValueChange={(v) => setFiltros({...filtros, status: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={null}>Todos</SelectItem>
                    <SelectItem value={ATENDIMENTO_STATUS.AGENDADO}>{ATENDIMENTO_STATUS_LABELS[ATENDIMENTO_STATUS.AGENDADO]}</SelectItem>
                    <SelectItem value={ATENDIMENTO_STATUS.CONFIRMADO}>{ATENDIMENTO_STATUS_LABELS[ATENDIMENTO_STATUS.CONFIRMADO]}</SelectItem>
                    <SelectItem value={ATENDIMENTO_STATUS.PARTICIPANDO}>{ATENDIMENTO_STATUS_LABELS[ATENDIMENTO_STATUS.PARTICIPANDO]}</SelectItem>
                    <SelectItem value={ATENDIMENTO_STATUS.REALIZADO}>{ATENDIMENTO_STATUS_LABELS[ATENDIMENTO_STATUS.REALIZADO]}</SelectItem>
                    <SelectItem value={ATENDIMENTO_STATUS.ATRASADO}>{ATENDIMENTO_STATUS_LABELS[ATENDIMENTO_STATUS.ATRASADO]}</SelectItem>
                    <SelectItem value={ATENDIMENTO_STATUS.REAGENDADO}>{ATENDIMENTO_STATUS_LABELS[ATENDIMENTO_STATUS.REAGENDADO]}</SelectItem>
                  </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Atendimentos</p>
                <p className="text-3xl font-bold text-gray-900">{dadosGraficos.totalAtendimentos}</p>
              </div>
              <CalendarIcon className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Clientes Ativos</p>
                <p className="text-3xl font-bold text-gray-900">{dadosGraficos.clientesAtivos}</p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Taxa de Conclusão</p>
                <p className="text-3xl font-bold text-gray-900">{dadosGraficos.taxaConclusao}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Planos Ativos</p>
                <p className="text-3xl font-bold text-gray-900">{planos.filter(p => p.status === 'ativo').length}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Atendimentos por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dadosGraficos.atendimentosPorMes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="atendimentos" stroke="#3B82F6" strokeWidth={2} name="Atendimentos" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={dadosGraficos.statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dadosGraficos.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atendimentos por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dadosGraficos.tipoDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8B5CF6" name="Quantidade" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const clienteCount = {};
              dadosFiltrados.forEach(a => {
                clienteCount[a.workshop_id] = (clienteCount[a.workshop_id] || 0) + 1;
              });
              
              const topClientes = Object.entries(clienteCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([id, count]) => {
                  const w = workshops?.find(w => w.id === id);
                  return { name: w?.name || 'Desconhecido', count };
                });

              return (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={topClientes} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10B981" name="Atendimentos" />
                  </BarChart>
                </ResponsiveContainer>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Tabela Detalhada */}
      <Card className="print:break-before-page">
        <CardHeader>
          <CardTitle>Detalhamento de Atendimentos ({dadosFiltrados.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4">ID ATA</th>
                  <th className="text-left py-3 px-4">Data</th>
                  <th className="text-left py-3 px-4">Cliente</th>
                  <th className="text-left py-3 px-4">Tipo</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Consultor</th>
                  <th className="text-right py-3 px-4">Duração</th>
                  <th className="text-right py-3 px-4 print:hidden">Ações</th>
                </tr>
              </thead>
              <tbody>
                {dadosFiltrados.slice(0, 50).map((a) => {
                  const workshop = workshops?.find(w => w.id === a.workshop_id);
                  const ataVinculada = atas?.find(ata => ata.id === a.ata_id);
                  return (
                    <tr key={a.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {ataVinculada?.code ? (
                          <span className="font-mono text-xs bg-blue-50 px-2 py-1 rounded border border-blue-200">
                            {ataVinculada.code.replace('IT.', 'AT.')}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {format(new Date(a.data_agendada), 'dd/MM/yyyy HH:mm')}
                      </td>
                      <td className="py-3 px-4 font-medium">{workshop?.name || '-'}</td>
                      <td className="py-3 px-4">{a.tipo_atendimento}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          a.status === ATENDIMENTO_STATUS.REALIZADO ? 'bg-green-100 text-green-700' :
                          a.status === ATENDIMENTO_STATUS.PARTICIPANDO ? 'bg-blue-100 text-blue-700' :
                          a.status === ATENDIMENTO_STATUS.ATRASADO ? 'bg-red-100 text-red-700' :
                          a.status === ATENDIMENTO_STATUS.REAGENDADO ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {ATENDIMENTO_STATUS_LABELS[a.status] || a.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">{a.consultor_nome || '-'}</td>
                      <td className="py-3 px-4 text-right">{a.duracao_minutos || 0} min</td>
                      <td className="py-3 px-4 text-right print:hidden">
                        <div className="flex items-center justify-end gap-1">
                          {(a.status === ATENDIMENTO_STATUS.AGENDADO || a.status === ATENDIMENTO_STATUS.CONFIRMADO || a.status === ATENDIMENTO_STATUS.REAGENDADO || a.status === ATENDIMENTO_STATUS.ATRASADO) && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => iniciarMutation.mutate(a.id)}
                                title="Iniciar"
                              >
                                <Play className="w-4 h-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setAtendimentoReagendar(a);
                                  setShowReagendar(true);
                                }}
                                title="Reagendar"
                              >
                                <CalendarClock className="w-4 h-4 text-purple-600" />
                              </Button>
                            </>
                          )}
                          
                          {(a.status === ATENDIMENTO_STATUS.PARTICIPANDO || a.status === ATENDIMENTO_STATUS.AGENDADO || a.status === ATENDIMENTO_STATUS.CONFIRMADO || a.status === ATENDIMENTO_STATUS.REAGENDADO || a.status === ATENDIMENTO_STATUS.ATRASADO) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setAtendimentoFinalizar(a);
                                setShowFinalizar(true);
                              }}
                              title="Finalizar Atendimento"
                            >
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(createPageUrl('RegistrarAtendimento') + `?atendimento_id=${a.id}`)}
                            title="Editar"
                          >
                            <Edit className="w-4 h-4 text-gray-600" />
                          </Button>
                          
                          {a.ata_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const ata = await base44.entities.MeetingMinutes.get(a.ata_id);
                                  if (ata) {
                                    setSelectedAta(ata);
                                    setShowVisualizarAta(true);
                                  }
                                } catch (error) {
                                  toast.error("Erro ao carregar ATA");
                                }
                              }}
                              title="Ver ATA em PDF"
                            >
                              <FileText className="w-4 h-4 text-green-600" />
                            </Button>
                          )}

                          {a.ata_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                if (window.confirm("Tem certeza que deseja excluir esta ATA?")) {
                                  try {
                                    await base44.functions.invoke('deleteAta', { ata_id: a.ata_id });
                                    toast.success("ATA excluída com sucesso!");
                                    queryClient.invalidateQueries(['atendimentos-relatorios']);
                                    queryClient.invalidateQueries(['atas-relatorios']);
                                  } catch (error) {
                                    toast.error("Erro ao excluir ATA: " + error.message);
                                  }
                                }
                              }}
                              title="Excluir ATA"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {dadosFiltrados.length > 50 && (
              <p className="text-center text-sm text-gray-500 mt-4">
                Exibindo 50 de {dadosFiltrados.length} registros. Exporte para ver todos.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {showReagendar && atendimentoReagendar && (
        <ReagendarAtendimentoModal
          atendimento={atendimentoReagendar}
          workshop={workshops?.find(w => w.id === atendimentoReagendar.workshop_id)}
          onClose={() => {
            setShowReagendar(false);
            setAtendimentoReagendar(null);
          }}
          onSaved={() => {
            queryClient.invalidateQueries(['atendimentos-relatorios']);
            setShowReagendar(false);
            setAtendimentoReagendar(null);
          }}
        />
      )}

      {showFinalizar && atendimentoFinalizar && (
        <FinalizarAtendimentoModal
          atendimento={atendimentoFinalizar}
          onClose={() => {
            setShowFinalizar(false);
            setAtendimentoFinalizar(null);
            queryClient.invalidateQueries(['atendimentos-relatorios']);
          }}
        />
      )}

      {showVisualizarAta && selectedAta && (
        <VisualizarAtaModal
          ata={selectedAta}
          onClose={() => {
            setShowVisualizarAta(false);
            setSelectedAta(null);
          }}
        />
      )}

      <style jsx>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:break-before-page { page-break-before: always; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}