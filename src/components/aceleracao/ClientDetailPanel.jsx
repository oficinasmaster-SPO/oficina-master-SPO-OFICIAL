import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Building2, MapPin, DollarSign, Users, Phone, Mail, 
  Briefcase, Clock, Target, ExternalLink, Calendar,
  TrendingUp, Award, Package, FileText, Heart
} from "lucide-react";

export default function ClientDetailPanel({ client, isOpen, onClose, atendimentos = [] }) {
  const atendimentosCliente = client ? atendimentos.filter(a => a.workshop_id === client.id)
    .sort((a, b) => new Date(b.data_realizada || b.data_agendada) - new Date(a.data_realizada || a.data_agendada)) : [];

  const handleAcessarOficina = () => {
    if (client) window.open(`/?workshop_id=${client.id}`, '_blank');
  };

  return (
    <Sheet open={isOpen && !!client} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-5xl overflow-auto">
        <SheetHeader>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-blue-600" />
              <div>
                <SheetTitle className="text-2xl">{client.name}</SheetTitle>
                <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                  <MapPin className="w-4 h-4" />
                  {client.city} - {client.state}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-600 text-white text-sm px-3 py-1">
                {client.planoAtual || 'FREE'}
              </Badge>
              <Button size="sm" onClick={handleAcessarOficina}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Acessar Oficina
              </Button>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="geral" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="geral">Dados Gerais</TabsTrigger>
            <TabsTrigger value="operacional">Operacional</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-6 mt-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Informações Básicas */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Informações Básicas
                </h3>
                <div className="space-y-3 text-sm">
                  {client.razao_social && (
                    <div>
                      <span className="text-gray-600">Razão Social:</span>
                      <p className="font-medium">{client.razao_social}</p>
                    </div>
                  )}
                  {client.cnpj && (
                    <div>
                      <span className="text-gray-600">CNPJ:</span>
                      <p className="font-medium">{client.cnpj}</p>
                    </div>
                  )}
                  {client.endereco_completo && (
                    <div>
                      <span className="text-gray-600">Endereço:</span>
                      <p className="font-medium">{client.endereco_completo}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Segmentação */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-purple-600" />
                  Segmentação
                </h3>
                <div className="space-y-3 text-sm">
                  {client.segment && (
                    <div>
                      <span className="text-gray-600">Segmento:</span>
                      <p className="font-medium">{client.segment}</p>
                    </div>
                  )}
                  {client.vehicle_types && client.vehicle_types.length > 0 && (
                    <div>
                      <span className="text-gray-600">Veículos:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {client.vehicle_types.map(v => (
                          <Badge key={v} variant="outline" className="text-xs">{v}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {client.services_offered && client.services_offered.length > 0 && (
                    <div>
                      <span className="text-gray-600">Serviços:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {client.services_offered.slice(0, 5).map(s => (
                          <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                        ))}
                        {client.services_offered.length > 5 && (
                          <Badge variant="outline" className="text-xs">+{client.services_offered.length - 5}</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Maturidade e Fase */}
            <div className="grid grid-cols-3 gap-4">
              <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-blue-100">
                <Award className="w-6 h-6 text-blue-600 mb-2" />
                <p className="text-sm text-gray-600">Nível de Maturidade</p>
                <p className="text-2xl font-bold text-blue-600">Fase {client.maturity_level || 1}</p>
              </div>
              <div className="border rounded-lg p-4 bg-gradient-to-br from-green-50 to-green-100">
                <Users className="w-6 h-6 text-green-600 mb-2" />
                <p className="text-sm text-gray-600">Colaboradores</p>
                <p className="text-2xl font-bold text-green-600">{client.employees_count || 0}</p>
              </div>
              <div className="border rounded-lg p-4 bg-gradient-to-br from-purple-50 to-purple-100">
                <Clock className="w-6 h-6 text-purple-600 mb-2" />
                <p className="text-sm text-gray-600">Anos de Operação</p>
                <p className="text-2xl font-bold text-purple-600">{client.years_in_business || 0}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="operacional" className="space-y-6 mt-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Horários */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  Horário de Funcionamento
                </h3>
                {client.horario_funcionamento ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Abertura:</span>
                      <span className="font-medium">{client.horario_funcionamento.abertura || 'Não definido'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fechamento:</span>
                      <span className="font-medium">{client.horario_funcionamento.fechamento || 'Não definido'}</span>
                    </div>
                    {client.horario_funcionamento.almoco_inicio && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Almoço:</span>
                        <span className="font-medium">
                          {client.horario_funcionamento.almoco_inicio} - {client.horario_funcionamento.almoco_fim}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Horários não configurados</p>
                )}
              </div>

              {/* Equipamentos */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-600" />
                  Equipamentos
                </h3>
                {client.equipment_list && client.equipment_list.length > 0 ? (
                  <div className="space-y-2 text-sm max-h-48 overflow-y-auto">
                    {client.equipment_list.map((eq, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="font-medium">{eq.name}</span>
                        <Badge variant="outline" className="text-xs">{eq.quantity}x</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Nenhum equipamento cadastrado</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="financeiro" className="space-y-6 mt-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Faturamento */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Faturamento
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-600">Faixa Mensal:</span>
                    <p className="font-medium text-lg text-green-600">
                      {client.monthly_revenue || 'Não informado'}
                    </p>
                  </div>
                  {client.tax_regime && (
                    <div>
                      <span className="text-gray-600">Regime Tributário:</span>
                      <p className="font-medium">{client.tax_regime}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Metas */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  Metas Mensais
                </h3>
                {client.monthly_goals ? (
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-gray-600">Projeção:</span>
                      <p className="font-medium text-lg">
                        R$ {client.monthly_goals.projected_revenue?.toFixed(2) || '0,00'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Realizado:</span>
                      <p className="font-medium text-lg text-green-600">
                        R$ {client.monthly_goals.actual_revenue_achieved?.toFixed(2) || '0,00'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Metas não configuradas</p>
                )}
              </div>
            </div>

            {/* Melhor Mês Histórico */}
            {client.best_month_history && (
              <div className="border-t pt-6">
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Melhor Mês Histórico
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Faturamento Total</p>
                    <p className="text-xl font-bold text-green-600">
                      R$ {client.best_month_history.revenue_total?.toFixed(2) || '0,00'}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Clientes Atendidos</p>
                    <p className="text-xl font-bold text-blue-600">
                      {client.best_month_history.customer_volume || 0}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Ticket Médio</p>
                    <p className="text-xl font-bold text-purple-600">
                      R$ {client.best_month_history.average_ticket?.toFixed(2) || '0,00'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="historico" className="space-y-6 mt-6">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Histórico de Atendimentos ({atendimentosCliente.length})
            </h3>
            
            {atendimentosCliente.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>Nenhum atendimento registrado</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {atendimentosCliente.map((atendimento) => (
                  <div key={atendimento.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{atendimento.tipo_atendimento}</h4>
                        <p className="text-sm text-gray-600">
                          {format(
                            new Date(atendimento.data_realizada || atendimento.data_agendada), 
                            "dd/MM/yyyy 'às' HH:mm", 
                            { locale: ptBR }
                          )}
                        </p>
                      </div>
                      <Badge 
                        className={
                          atendimento.status === 'realizado' ? 'bg-green-100 text-green-700' :
                          atendimento.status === 'cancelado' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }
                      >
                        {atendimento.status}
                      </Badge>
                    </div>
                    {atendimento.objetivo && (
                      <p className="text-sm text-gray-600 mt-2">{atendimento.objetivo}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}