import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { RedTabsList, RedTabsTrigger } from "@/components/ui/RedTabs";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Building2, MapPin, DollarSign, Users, Phone, Mail, 
  Briefcase, Clock, Target, ExternalLink, Calendar,
  TrendingUp, Award, Package, FileText, Heart, Lightbulb
} from "lucide-react";
import CloseButton from "@/components/ui/CloseButton";
import ConsultoriaClienteTab from "./ConsultoriaClienteTab";
import ClientHistoricoTimeline from "./ClientHistoricoTimeline";

export default function ClientDetailPanel({ client, isOpen, onClose, atendimentos = [], processos = [], defaultTab = "geral" }) {
  const atendimentosCliente = client ? atendimentos.filter(a => a.workshop_id === client.id)
    .sort((a, b) => new Date(b.data_realizada || b.data_agendada) - new Date(a.data_realizada || a.data_agendada)) : [];

  const handleAcessarOficina = () => {
    if (client) {
      sessionStorage.setItem('admin_workshop_id', client.id);
      // Força a navegação para a home e recarrega os contextos
      window.location.href = `/Home?workshop_id=${client.id}`;
    }
  };

  return (
    <Dialog open={isOpen && !!client} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] overflow-hidden flex flex-col [&>button[class*='absolute']]:hidden">
        {client && (
          <>
            <DialogHeader>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-4 border-b">
                {/* Logo + Nome + Localização */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {client.logo_url ? (
                    <img src={client.logo_url} alt={client.name} className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <DialogTitle className="text-xl font-bold truncate">{client.name}</DialogTitle>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {client.city} - {client.state}
                      </span>
                      {client.cnpj && (
                        <span className="hidden sm:inline text-gray-400">CNPJ: {client.cnpj}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Badges + Ação */}
                <div className="flex items-center gap-2 shrink-0 ml-auto">
                  {client.status && client.status !== 'ativo' && (
                    <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50">
                      {client.status}
                    </Badge>
                  )}
                  <Badge className={`text-xs font-semibold px-3 py-1 ${
                    client.planoAtual === 'GOLD' ? 'bg-yellow-500 text-white' :
                    client.planoAtual === 'PRATA' ? 'bg-gray-400 text-white' :
                    client.planoAtual === 'BRONZE' ? 'bg-amber-700 text-white' :
                    client.planoAtual === 'IOM' ? 'bg-purple-600 text-white' :
                    client.planoAtual === 'MILLIONS' ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white' :
                    'bg-blue-600 text-white'
                  }`}>
                    {client.planoAtual || 'FREE'}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={handleAcessarOficina} className="gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" />
                    Acessar Oficina
                  </Button>
                  <CloseButton onClick={() => onClose(false)} className="ml-1" />
                </div>
              </div>
            </DialogHeader>

        <Tabs defaultValue={defaultTab} className="mt-4 flex flex-col flex-1 min-h-0">
          <div className="shrink-0">
            <RedTabsList className="gap-3">
              <RedTabsTrigger value="geral" className="flex-1 justify-center">Dados Gerais</RedTabsTrigger>
              <RedTabsTrigger value="operacional" className="flex-1 justify-center">Operacional</RedTabsTrigger>
              <RedTabsTrigger value="financeiro" className="flex-1 justify-center">Financeiro</RedTabsTrigger>
              <RedTabsTrigger value="processos" className="flex-1 justify-center">Processos</RedTabsTrigger>
              <RedTabsTrigger value="historico" className="flex-1 justify-center">Histórico</RedTabsTrigger>
              <RedTabsTrigger value="consultoria" className="flex-1 justify-center">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                Consultoria
              </RedTabsTrigger>
            </RedTabsList>
          </div>

          <div className="flex-1 overflow-y-auto mt-4">

          <TabsContent value="geral" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Informações Básicas */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Building2 className="w-4.5 h-4.5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-base text-gray-900">Informações Básicas</h3>
                </div>
                <div className="space-y-3.5">
                  {client.razao_social && (
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Razão Social</span>
                      <p className="text-sm font-medium text-gray-800 mt-0.5">{client.razao_social}</p>
                    </div>
                  )}
                  {client.cnpj && (
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wider text-gray-400">CNPJ</span>
                      <p className="text-sm font-medium text-gray-800 mt-0.5 font-mono">{client.cnpj}</p>
                    </div>
                  )}
                  {client.endereco_completo && (
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Endereço</span>
                      <p className="text-sm font-medium text-gray-800 mt-0.5">{client.endereco_completo}</p>
                    </div>
                  )}
                  {(client.telefone || client.email) && (
                    <div className="flex flex-wrap gap-4 pt-1">
                      {client.telefone && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          {client.telefone}
                        </div>
                      )}
                      {client.email && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          {client.email}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Segmentação */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                    <Briefcase className="w-4.5 h-4.5 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-base text-gray-900">Segmentação</h3>
                </div>
                <div className="space-y-3.5">
                  {client.segment && (
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Segmento</span>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{client.segment}</p>
                    </div>
                  )}
                  {client.vehicle_types && client.vehicle_types.length > 0 && (
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Veículos</span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {client.vehicle_types.map(v => (
                          <Badge key={v} variant="outline" className="text-xs bg-gray-50 border-gray-200 text-gray-700 capitalize">{v}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {client.services_offered && client.services_offered.length > 0 && (
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Serviços</span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {client.services_offered.slice(0, 5).map(s => (
                          <Badge key={s} variant="outline" className="text-xs bg-gray-50 border-gray-200 text-gray-700">{s.replace(/_/g, ' ')}</Badge>
                        ))}
                        {client.services_offered.length > 5 && (
                          <Badge variant="secondary" className="text-xs">+{client.services_offered.length - 5}</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Indicadores Chave */}
            <div className="grid grid-cols-3 gap-4">
              <div className="border border-blue-200 rounded-xl p-4 bg-gradient-to-br from-blue-50/80 to-blue-100/50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Award className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wider text-blue-500">Nível de Maturidade</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">Fase {client.maturity_level || 1}</p>
              </div>
              <div className="border border-green-200 rounded-xl p-4 bg-gradient-to-br from-green-50/80 to-green-100/50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                    <Users className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wider text-green-500">Colaboradores</span>
                </div>
                <p className="text-2xl font-bold text-green-700">{client.employees_count || 0}</p>
              </div>
              <div className="border border-purple-200 rounded-xl p-4 bg-gradient-to-br from-purple-50/80 to-purple-100/50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wider text-purple-500">Anos de Operação</span>
                </div>
                <p className="text-2xl font-bold text-purple-700">{client.years_in_business || 0}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="operacional" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Horários */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                    <Clock className="w-4.5 h-4.5 text-orange-600" />
                  </div>
                  <h3 className="font-semibold text-base text-gray-900">Horário de Funcionamento</h3>
                </div>
                {client.horario_funcionamento ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Abertura</span>
                      <span className="text-sm font-semibold text-gray-800">{client.horario_funcionamento.abertura || 'Não definido'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Fechamento</span>
                      <span className="text-sm font-semibold text-gray-800">{client.horario_funcionamento.fechamento || 'Não definido'}</span>
                    </div>
                    {client.horario_funcionamento.almoco_inicio && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Almoço</span>
                        <span className="text-sm font-semibold text-gray-800">
                          {client.horario_funcionamento.almoco_inicio} - {client.horario_funcionamento.almoco_fim}
                        </span>
                      </div>
                    )}
                    {client.horario_funcionamento.sabado_abertura && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Sábado</span>
                        <span className="text-sm font-semibold text-gray-800">
                          {client.horario_funcionamento.sabado_abertura} - {client.horario_funcionamento.sabado_fechamento}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Horários não configurados</p>
                )}
              </div>

              {/* Equipamentos */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Package className="w-4.5 h-4.5 text-indigo-600" />
                  </div>
                  <h3 className="font-semibold text-base text-gray-900">Equipamentos</h3>
                  {client.equipment_list && client.equipment_list.length > 0 && (
                    <Badge variant="secondary" className="text-xs ml-auto">{client.equipment_list.length} itens</Badge>
                  )}
                </div>
                {client.equipment_list && client.equipment_list.length > 0 ? (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {client.equipment_list.map((eq, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-gray-50/80 rounded-lg hover:bg-gray-100/80 transition-colors">
                        <span className="text-sm font-medium text-gray-700">{eq.name}</span>
                        <Badge variant="outline" className="text-xs font-semibold bg-white">{eq.quantity}x</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Nenhum equipamento cadastrado</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="financeiro" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Faturamento */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                    <DollarSign className="w-4.5 h-4.5 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-base text-gray-900">Faturamento</h3>
                </div>
                <div className="space-y-3.5">
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Faixa Mensal</span>
                    <p className="text-lg font-bold text-green-600 mt-0.5">
                      {client.monthly_revenue || 'Não informado'}
                    </p>
                  </div>
                  {client.tax_regime && (
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Regime Tributário</span>
                      <p className="text-sm font-medium text-gray-800 mt-0.5 capitalize">{client.tax_regime.replace(/_/g, ' ')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Metas */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Target className="w-4.5 h-4.5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-base text-gray-900">Metas Mensais</h3>
                </div>
                {client.monthly_goals ? (
                  <div className="space-y-3.5">
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Projeção</span>
                      <p className="text-lg font-bold text-gray-800 mt-0.5">
                        R$ {client.monthly_goals.projected_revenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Realizado</span>
                      <p className="text-lg font-bold text-green-600 mt-0.5">
                        R$ {client.monthly_goals.actual_revenue_achieved?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Metas não configuradas</p>
                )}
              </div>
            </div>

            {/* Melhor Mês Histórico */}
            {client.best_month_history && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <TrendingUp className="w-4.5 h-4.5 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-base text-gray-900">Melhor Mês Histórico</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="border border-green-200 rounded-xl p-4 bg-gradient-to-br from-green-50/80 to-green-100/50">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-green-600" />
                      </div>
                      <span className="text-xs font-medium uppercase tracking-wider text-green-500">Faturamento Total</span>
                    </div>
                    <p className="text-xl font-bold text-green-700">
                      R$ {client.best_month_history.revenue_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </p>
                  </div>
                  <div className="border border-blue-200 rounded-xl p-4 bg-gradient-to-br from-blue-50/80 to-blue-100/50">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-xs font-medium uppercase tracking-wider text-blue-500">Clientes Atendidos</span>
                    </div>
                    <p className="text-xl font-bold text-blue-700">
                      {client.best_month_history.customer_volume || 0}
                    </p>
                  </div>
                  <div className="border border-purple-200 rounded-xl p-4 bg-gradient-to-br from-purple-50/80 to-purple-100/50">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Target className="w-4 h-4 text-purple-600" />
                      </div>
                      <span className="text-xs font-medium uppercase tracking-wider text-purple-500">Ticket Médio</span>
                    </div>
                    <p className="text-xl font-bold text-purple-700">
                      R$ {client.best_month_history.average_ticket?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="processos" className="space-y-6 mt-6">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Processos do Cronograma ({processos.length})
            </h3>
            
            {processos.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>Nenhum processo cadastrado para este plano</p>
              </div>
            ) : (
              <div className="space-y-3">
                {processos.map((processo) => {
                  const progresso = client?.progressos?.find(p => p.modulo_codigo === processo.codigo);
                  const implementacao = client?.implementacoes?.find(i => 
                    i.item_id === processo.codigo || i.item_nome === processo.codigo
                  );
                  
                  let status = 'a_fazer';
                  let statusLabel = 'A Fazer';
                  let statusColor = 'bg-gray-100 text-gray-700';
                  
                  if (implementacao) {
                    if (implementacao.status === 'concluido') {
                      status = 'concluido';
                      statusLabel = 'Concluído';
                      statusColor = 'bg-green-100 text-green-700';
                    } else if (implementacao.status === 'em_andamento') {
                      const diasRestantes = new Date(implementacao.data_termino_previsto) - new Date();
                      if (diasRestantes < 0) {
                        status = 'atrasado';
                        statusLabel = 'Atrasado';
                        statusColor = 'bg-red-100 text-red-700';
                      } else {
                        status = 'em_andamento';
                        statusLabel = 'Em Andamento';
                        statusColor = 'bg-blue-100 text-blue-700';
                      }
                    }
                  } else if (progresso) {
                    if (progresso.situacao === 'concluido') {
                      status = 'concluido';
                      statusLabel = 'Concluído';
                      statusColor = 'bg-green-100 text-green-700';
                    } else if (progresso.situacao === 'atrasado') {
                      status = 'atrasado';
                      statusLabel = 'Atrasado';
                      statusColor = 'bg-red-100 text-red-700';
                    } else if (progresso.situacao === 'em_andamento') {
                      status = 'em_andamento';
                      statusLabel = 'Em Andamento';
                      statusColor = 'bg-blue-100 text-blue-700';
                    }
                  }
                  
                  return (
                    <div key={processo.codigo} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{processo.nome || processo.codigo}</h4>
                          {progresso?.percentual_conclusao > 0 && (
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${progresso.percentual_conclusao}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium">{progresso.percentual_conclusao}%</span>
                            </div>
                          )}
                        </div>
                        <Badge className={statusColor}>
                          {statusLabel}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="historico" className="mt-6">
            <ClientHistoricoTimeline client={client} atendimentos={atendimentos} />
          </TabsContent>

          <TabsContent value="consultoria" className="mt-6">
            <ConsultoriaClienteTab client={client} />
          </TabsContent>
          </div>
        </Tabs>
          </>
        )}
        <p className="text-[9px] text-white bg-black/70 inline-block px-1.5 py-0.5 rounded text-right mt-1 select-none ml-auto">ClientDetailPanel</p>
      </DialogContent>
    </Dialog>
  );
}