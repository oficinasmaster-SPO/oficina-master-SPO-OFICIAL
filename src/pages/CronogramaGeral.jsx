import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, CheckCircle, Clock, AlertTriangle, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ClienteDetalhesPanel from "@/components/aceleracao/ClienteDetalhesPanel";
import AvaliarProcessoModal from "@/components/aceleracao/AvaliarProcessoModal";

export default function CronogramaGeral() {
  const navigate = useNavigate();
  const [planoSelecionado, setPlanoSelecionado] = useState("BRONZE");
  const [filtroCliente, setFiltroCliente] = useState("ativo");
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [processoAvaliar, setProcessoAvaliar] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  // Verificar permissão
  if (user && user.role !== 'admin' && user.job_role !== 'acelerador') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Acesso restrito a consultores e aceleradores</p>
      </div>
    );
  }

  const { data: workshops, isLoading } = useQuery({
    queryKey: ['workshops-cronograma'],
    queryFn: async () => {
      const all = await base44.entities.Workshop.list();
      return all.filter(w => w.planoAtual === planoSelecionado);
    },
    enabled: !!planoSelecionado
  });

  const { data: progressos } = useQuery({
    queryKey: ['todos-progressos'],
    queryFn: () => base44.entities.CronogramaProgresso.list()
  });

  const { data: templates } = useQuery({
    queryKey: ['templates-plano', planoSelecionado],
    queryFn: async () => {
      const all = await base44.entities.CronogramaTemplate.list();
      return all.filter(t => t.ativo);
    }
  });

  // Processos do plano (baseado nos templates)
  const processosPlano = templates?.flatMap(t => 
    t.modulos?.map(m => m.codigo) || []
  ) || [];

  const processosUnicos = [...new Set(processosPlano)];

  // Calcular status dos processos
  const calcularStatusProcesso = (codigoProcesso) => {
    const progressosProcesso = progressos?.filter(p => 
      p.modulo_codigo === codigoProcesso && 
      workshops?.some(w => w.id === p.workshop_id)
    ) || [];

    const aFazer = progressosProcesso.filter(p => p.situacao === 'nao_iniciado').length;
    const atrasado = progressosProcesso.filter(p => p.situacao === 'atrasado').length;
    const concluido = progressosProcesso.filter(p => p.situacao === 'concluido').length;

    return { aFazer, atrasado, concluido };
  };

  // Filtrar clientes
  const clientesFiltrados = workshops?.filter(w => {
    if (filtroCliente === "ativo") {
      const prog = progressos?.filter(p => p.workshop_id === w.id) || [];
      const temEmAndamento = prog.some(p => p.situacao === 'em_andamento' || p.situacao === 'nao_iniciado');
      return temEmAndamento;
    }
    if (filtroCliente === "concluido") {
      const prog = progressos?.filter(p => p.workshop_id === w.id) || [];
      const todosConcluidos = prog.length > 0 && prog.every(p => p.situacao === 'concluido');
      return todosConcluidos;
    }
    if (filtroCliente === "afazer") {
      const prog = progressos?.filter(p => p.workshop_id === w.id) || [];
      return prog.length === 0 || prog.every(p => p.situacao === 'nao_iniciado');
    }
    return true;
  }) || [];

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
        <h1 className="text-3xl font-bold text-gray-900">CRONOGRAMA GERAL</h1>
        <Select value={planoSelecionado} onValueChange={setPlanoSelecionado}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Selecione o plano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="START">START</SelectItem>
            <SelectItem value="BRONZE">BRONZE</SelectItem>
            <SelectItem value="PRATA">PRATA</SelectItem>
            <SelectItem value="GOLD">GOLD</SelectItem>
            <SelectItem value="IOM">IOM</SelectItem>
            <SelectItem value="MILLIONS">MILLIONS</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Coluna Esquerda - Tabela de Processos */}
        <Card>
          <CardHeader>
            <CardTitle>Processos do Plano {planoSelecionado}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2">
                    <th className="text-left py-3 px-4 font-bold">Processos</th>
                    <th className="text-center py-3 px-4 font-bold text-gray-600">A Fazer</th>
                    <th className="text-center py-3 px-4 font-bold text-orange-600">Atrasado</th>
                    <th className="text-center py-3 px-4 font-bold text-green-600">Concluído</th>
                  </tr>
                </thead>
                <tbody>
                  {processosUnicos.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-8 text-gray-500">
                        Nenhum processo cadastrado para este plano
                      </td>
                    </tr>
                  ) : (
                    processosUnicos.map((codigo) => {
                      const status = calcularStatusProcesso(codigo);
                      const modulo = templates?.flatMap(t => t.modulos || []).find(m => m.codigo === codigo);
                      
                      return (
                        <tr key={codigo} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{modulo?.nome || codigo}</td>
                          <td className="text-center py-3 px-4">
                            <Badge variant="outline" className="bg-gray-100">
                              {status.aFazer}
                            </Badge>
                          </td>
                          <td className="text-center py-3 px-4">
                            <Badge className="bg-orange-100 text-orange-800">
                              {status.atrasado}
                            </Badge>
                          </td>
                          <td className="text-center py-3 px-4">
                            <Badge className="bg-green-100 text-green-800">
                              {status.concluido}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Coluna Direita - Lista de Clientes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>LISTA DE CLIENTES</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={filtroCliente === "ativo" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFiltroCliente("ativo")}
                >
                  Ativo
                </Button>
                <Button
                  variant={filtroCliente === "concluido" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFiltroCliente("concluido")}
                >
                  Concluído
                </Button>
                <Button
                  variant={filtroCliente === "afazer" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFiltroCliente("afazer")}
                >
                  A Fazer
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {clientesFiltrados.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>Nenhum cliente encontrado</p>
                </div>
              ) : (
                clientesFiltrados.map((workshop) => {
                  const prog = progressos?.filter(p => p.workshop_id === workshop.id) || [];
                  const total = prog.length;
                  const concluidos = prog.filter(p => p.situacao === 'concluido').length;
                  const percentual = total > 0 ? Math.round((concluidos / total) * 100) : 0;
                  const temAtrasado = prog.some(p => p.situacao === 'atrasado');

                  return (
                    <div
                      key={workshop.id}
                      onClick={() => setClienteSelecionado(workshop)}
                      className="p-4 border rounded-lg hover:shadow-md cursor-pointer transition-all hover:border-blue-300"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-bold text-gray-900">{workshop.name}</p>
                          <p className="text-sm text-gray-600">{workshop.city} - {workshop.state}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${percentual}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium">{percentual}%</span>
                          </div>
                        </div>
                        {temAtrasado && (
                          <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Painel Lateral de Detalhes */}
      {clienteSelecionado && (
        <ClienteDetalhesPanel
          cliente={clienteSelecionado}
          progressos={progressos?.filter(p => p.workshop_id === clienteSelecionado.id) || []}
          onClose={() => setClienteSelecionado(null)}
          onAvaliar={(processo) => {
            setProcessoAvaliar(processo);
            setClienteSelecionado(null);
          }}
        />
      )}

      {/* Modal de Avaliação */}
      {processoAvaliar && (
        <AvaliarProcessoModal
          processo={processoAvaliar}
          onClose={() => setProcessoAvaliar(null)}
          onSave={() => {
            setProcessoAvaliar(null);
          }}
        />
      )}
    </div>
  );
}