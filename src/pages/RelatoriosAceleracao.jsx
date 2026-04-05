import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, TrendingUp, Users, ClipboardCheck, Loader2, BarChart3 } from "lucide-react";
import RelatoriosTab from "@/components/aceleracao/RelatoriosTab";
import GargalosConsultores from "@/components/aceleracao/GargalosConsultores";
import GargalosConsultoresRealtime from "@/components/aceleracao/GargalosConsultoresRealtime";
import ClientesRiscoPanel from "@/components/aceleracao/ClientesRiscoPanel";
import NPSPanel from "@/components/aceleracao/NPSPanel";
import DesempenhoConsultoresPanel from "@/components/aceleracao/DesempenhoConsultoresPanel";

export default function RelatoriosAceleracao() {
  const [periodo, setPeriodo] = useState("mes_atual");
  const [gerandoRelatorio, setGerandoRelatorio] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: workshops } = useQuery({
    queryKey: ['workshops-ativos'],
    queryFn: async () => {
      const all = await base44.entities.Workshop.list();
      return all.filter(w => w.planoAtual && w.planoAtual !== 'FREE');
    }
  });

  const { data: diagnosticos } = useQuery({
    queryKey: ['diagnosticos-realizados'],
    queryFn: async () => {
      const diagnostic = await base44.entities.Diagnostic.list();
      const maturity = await base44.entities.CollaboratorMaturityDiagnostic.list();
      const disc = await base44.entities.DISCDiagnostic.list();
      return {
        total: diagnostic.length + maturity.length + disc.length,
        por_tipo: {
          fase: diagnostic.length,
          maturidade: maturity.length,
          disc: disc.length
        }
      };
    }
  });

  const { data: aceleradores } = useQuery({
    queryKey: ['aceleradores-desempenho'],
    queryFn: async () => {
      const employees = await base44.entities.Employee.filter({ 
        workshop_id: '69540822472c4a70b54d47aa',
        status: 'ativo'
      });
      
      const atendimentos = await base44.entities.ConsultoriaAtendimento.list();
      
      return employees.map(acelerador => {
        const atendimentosAcelerador = atendimentos.filter(a => a.consultor_id === acelerador.user_id);
        const clientesAtendidos = new Set(atendimentosAcelerador.map(a => a.workshop_id)).size;
        
        const statusClientes = atendimentosAcelerador
          .filter(a => a.status_cliente)
          .reduce((acc, a) => {
            acc[a.status_cliente] = (acc[a.status_cliente] || 0) + 1;
            return acc;
          }, {});

        return {
          nome: acelerador.full_name,
          clientes_atendidos: clientesAtendidos,
          atendimentos_realizados: atendimentosAcelerador.filter(a => a.status === 'realizado').length,
          clientes_crescentes: statusClientes.crescente || 0,
          clientes_decrescentes: statusClientes.decrescente || 0,
          taxa_sucesso: clientesAtendidos > 0 
            ? Math.round(((statusClientes.crescente || 0) / clientesAtendidos) * 100) 
            : 0
        };
      });
    }
  });

  const { data: gargalos } = useQuery({
    queryKey: ['gargalos-consultores'],
    queryFn: async () => {
      const response = await base44.functions.invoke('calcularGargalosConsultores');
      return response.data;
    }
  });

  const { data: clientesRisco = [] } = useQuery({
    queryKey: ['clientes-risco'],
    queryFn: async () => {
      const atendimentos = await base44.entities.ConsultoriaAtendimento.list();
      const workshops = await base44.entities.Workshop.list();
      const workshopMap = Object.fromEntries(workshops.map(w => [w.id, w]));
      
      const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const atendimentosRecentes = atendimentos.filter(a => {
        if (!a.data_agendada) return false;
        return new Date(a.data_agendada) >= trintaDiasAtras;
      });

      const porWorkshop = {};
      for (const a of atendimentosRecentes) {
        if (!a.workshop_id) continue;
        if (!porWorkshop[a.workshop_id]) {
          porWorkshop[a.workshop_id] = {
            workshop: workshopMap[a.workshop_id],
            consultor: a.consultor_nome || 'N/A',
            atendimentos30d: [],
          };
        }
        porWorkshop[a.workshop_id].atendimentos30d.push(a);
      }

      const clientesRiscoList = [];
      for (const [wsId, dados] of Object.entries(porWorkshop)) {
        const ws = dados.workshop;
        if (!ws || ws.status === 'inativo') continue;

        const ats = dados.atendimentos30d;
        const faltas = ats.filter(a => a.status === 'faltou').length;
        const cancelados = ats.filter(a => ['cancelado', 'desmarcou'].includes(a.status)).length;
        const realizados = ats.filter(a => a.status === 'realizado').length;
        const statusCliente = ats[ats.length - 1]?.status_cliente;

        let nivel = null;
        if (statusCliente === 'nao_responde' || faltas + cancelados >= 2) {
          nivel = 'CRÍTICO';
        } else if (statusCliente === 'decrescente' || (faltas >= 1 && realizados === 0)) {
          nivel = 'ALTO';
        } else if (ats.length === 0) {
          nivel = 'MÉDIO';
        }

        if (nivel) {
          clientesRiscoList.push({
            nome: ws.name || wsId,
            consultor: dados.consultor,
            nivel,
            faltas30: faltas,
            cancelados30: cancelados,
            realizados30: realizados,
          });
        }
      }
      return clientesRiscoList;
    }
  });

  const { data: npsData = [] } = useQuery({
    queryKey: ['nps-responses'],
    queryFn: async () => {
      return await base44.entities.NPSResponse.list();
    }
  });

  const { data: consultoresDesempenho = [] } = useQuery({
    queryKey: ['consultores-desempenho'],
    queryFn: async () => {
      const atendimentos = await base44.entities.ConsultoriaAtendimento.list();
      const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const atendimentosRecentes = atendimentos.filter(a => {
        if (!a.data_agendada) return false;
        return new Date(a.data_agendada) >= trintaDiasAtras;
      });

      const porConsultor = {};
      for (const a of atendimentosRecentes) {
        const cId = a.consultor_id;
        if (!cId) continue;
        if (!porConsultor[cId]) {
          porConsultor[cId] = {
            nome: a.consultor_nome || 'Consultor',
            total: 0,
            realizados: 0,
            faltaram: 0,
            cancelados: 0,
            clientes: new Set(),
          };
        }
        porConsultor[cId].total++;
        if (a.status === 'realizado') porConsultor[cId].realizados++;
        if (a.status === 'faltou') porConsultor[cId].faltaram++;
        if (['cancelado', 'desmarcou'].includes(a.status)) porConsultor[cId].cancelados++;
        if (a.workshop_id) porConsultor[cId].clientes.add(a.workshop_id);
      }

      return Object.entries(porConsultor).map(([, c]) => ({
        nome: c.nome,
        total: c.total,
        realizados: c.realizados,
        faltaram: c.faltaram,
        cancelados: c.cancelados,
        clientes: c.clientes.size,
        taxa: c.total > 0 ? Math.round((c.realizados / c.total) * 100) : 0,
      }));
    }
  });

  const gerarRelatorio = async (tipo) => {
    setGerandoRelatorio(tipo);
    try {
      const response = await base44.functions.invoke('gerarRelatorioAceleracao', {
        tipo,
        periodo
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Relatorio_${tipo}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setGerandoRelatorio(null);
    }
  };

  if (!user || (user.role !== 'admin' && user.job_role !== 'acelerador')) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Acesso restrito</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatórios de Aceleração</h1>
          <p className="text-gray-600 mt-2">Análises e indicadores de desempenho</p>
        </div>
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mes_atual">Mês Atual</SelectItem>
            <SelectItem value="ultimo_trimestre">Último Trimestre</SelectItem>
            <SelectItem value="ano_atual">Ano Atual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="painel" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-white shadow-md">
          <TabsTrigger value="painel">
            <BarChart3 className="w-4 h-4 mr-2" />
            Painel de Relatórios
          </TabsTrigger>
          <TabsTrigger value="geral">
            <TrendingUp className="w-4 h-4 mr-2" />
            Análises Avançadas
          </TabsTrigger>
          <TabsTrigger value="atendimentos">
            <FileText className="w-4 h-4 mr-2" />
            Atendimentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="painel" className="space-y-6">
          <ClientesRiscoPanel clientes={clientesRisco} />
          <NPSPanel respostas={npsData} />
          <DesempenhoConsultoresPanel consultores={consultoresDesempenho} />
        </TabsContent>

        <TabsContent value="geral" className="space-y-6">

      {/* Análise de Gargalos */}
      <GargalosConsultores 
        consultores={gargalos || []} 
        onPeriodChange={(period) => {
          // Passando o período para refetch dos gargalos se necessário
        }}
      />

      {/* Saturação Real dos Consultores */}
      <GargalosConsultoresRealtime />

      {/* Cards de Métricas */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-600" />
              Diagnósticos Realizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{diagnosticos?.total || 0}</p>
            <div className="text-xs text-gray-600 mt-2 space-y-1">
              <p>Fase: {diagnosticos?.por_tipo?.fase || 0}</p>
              <p>Maturidade: {diagnosticos?.por_tipo?.maturidade || 0}</p>
              <p>DISC: {diagnosticos?.por_tipo?.disc || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              Clientes Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{workshops?.length || 0}</p>
            <p className="text-xs text-gray-600 mt-2">Com planos habilitados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Aceleradores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">{aceleradores?.length || 0}</p>
            <p className="text-xs text-gray-600 mt-2">Consultores ativos</p>
          </CardContent>
        </Card>
      </div>

      {/* Desempenho dos Aceleradores */}
      <Card>
        <CardHeader>
          <CardTitle>Desempenho dos Aceleradores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Acelerador</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Clientes</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Atendimentos</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-green-600">Crescentes</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-red-600">Decrescentes</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Taxa Sucesso</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {aceleradores?.map((acel, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{acel.nome}</td>
                    <td className="px-4 py-3 text-center">{acel.clientes_atendidos}</td>
                    <td className="px-4 py-3 text-center">{acel.atendimentos_realizados}</td>
                    <td className="px-4 py-3 text-center text-green-600 font-bold">{acel.clientes_crescentes}</td>
                    <td className="px-4 py-3 text-center text-red-600 font-bold">{acel.clientes_decrescentes}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${acel.taxa_sucesso >= 70 ? 'text-green-600' : acel.taxa_sucesso >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {acel.taxa_sucesso}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Relatórios Disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle>Gerar Relatórios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-start gap-2"
              onClick={() => gerarRelatorio('testes_realizados')}
              disabled={gerandoRelatorio === 'testes_realizados'}
            >
              {gerandoRelatorio === 'testes_realizados' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <FileText className="w-5 h-5 text-blue-600" />
              )}
              <div className="text-left">
                <p className="font-semibold">Testes Realizados</p>
                <p className="text-xs text-gray-600">Todos os testes aplicados no período</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-start gap-2"
              onClick={() => gerarRelatorio('diagnosticos_executados')}
              disabled={gerandoRelatorio === 'diagnosticos_executados'}
            >
              {gerandoRelatorio === 'diagnosticos_executados' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ClipboardCheck className="w-5 h-5 text-green-600" />
              )}
              <div className="text-left">
                <p className="font-semibold">Diagnósticos Executados</p>
                <p className="text-xs text-gray-600">Relatório completo de diagnósticos</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-start gap-2"
              onClick={() => gerarRelatorio('desempenho_aceleradores')}
              disabled={gerandoRelatorio === 'desempenho_aceleradores'}
            >
              {gerandoRelatorio === 'desempenho_aceleradores' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <TrendingUp className="w-5 h-5 text-purple-600" />
              )}
              <div className="text-left">
                <p className="font-semibold">Desempenho dos Aceleradores</p>
                <p className="text-xs text-gray-600">Análise de performance individual</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-start gap-2"
              onClick={() => gerarRelatorio('consolidado_geral')}
              disabled={gerandoRelatorio === 'consolidado_geral'}
            >
              {gerandoRelatorio === 'consolidado_geral' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5 text-orange-600" />
              )}
              <div className="text-left">
                <p className="font-semibold">Consolidado Geral</p>
                <p className="text-xs text-gray-600">Visão completa de todos os indicadores</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="atendimentos">
          <RelatoriosTab user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}