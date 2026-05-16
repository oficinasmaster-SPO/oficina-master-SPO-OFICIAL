import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCw,
  Plus,
} from 'lucide-react';
import { format, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import RegistrarAtendimento from './RegistrarAtendimento';

export default function ProximosAtendimentosTabs({ workshopId }) {
  const [showRegistrarAtendimento, setShowRegistrarAtendimento] = useState(false);
  const [activeTab, setActiveTab] = useState('proximos');

  // Próximos Atendimentos (agendados e futuros)
  const { data: proximosAtendimentos = [] } = useQuery({
    queryKey: ['proximosAtendimentos', workshopId],
    queryFn: async () => {
      const atendimentos = await base44.entities.ConsultoriaAtendimento.filter(
        { workshop_id: workshopId, status: 'agendado' },
        '-data_agendada',
        100
      );
      return atendimentos.filter(a => isFuture(new Date(a.data_agendada)));
    },
    enabled: !!workshopId,
  });

  // Todos os Atendimentos (Bucket + Agendados)
  const { data: todosAtendimentos = [] } = useQuery({
    queryKey: ['todosAtendimentos', workshopId],
    queryFn: async () => {
      const agendados = await base44.entities.ConsultoriaAtendimento.filter(
        { workshop_id: workshopId },
        '-data_agendada',
        100
      );
      return agendados;
    },
    enabled: !!workshopId,
  });

  // Atas de Reunião
  const { data: atas = [] } = useQuery({
    queryKey: ['atasReuniao', workshopId],
    queryFn: async () => {
      const minutas = await base44.entities.MeetingMinutes.filter(
        { workshop_id: workshopId },
        '-meeting_date',
        50
      );
      return minutas;
    },
    enabled: !!workshopId,
  });

  // FollowUps
  const { data: followups = [] } = useQuery({
    queryKey: ['followups', workshopId],
    queryFn: async () => {
      const reminders = await base44.entities.FollowUpReminder.filter(
        { workshop_id: workshopId, is_completed: false },
        '-reminder_date',
        50
      );
      return reminders;
    },
    enabled: !!workshopId,
  });

  const contarBucket = todosAtendimentos.filter(a => 
    a.status === 'pendente' || a.status === 'aguardando_vaga'
  ).length;

  const contarAgendados = todosAtendimentos.filter(a => 
    a.status === 'agendado'
  ).length;

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 gap-2">
          <TabsTrigger value="proximos" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Próximos</span>
            {proximosAtendimentos.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {proximosAtendimentos.length}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger value="todos" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Todos</span>
            {(contarBucket + contarAgendados) > 0 && (
              <Badge variant="secondary" className="ml-1">
                {contarBucket + contarAgendados}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger value="atas" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Atas</span>
            {atas.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {atas.length}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger value="followups" className="flex items-center gap-2">
            <RotateCw className="w-4 h-4" />
            <span className="hidden sm:inline">FollowUps</span>
            {followups.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {followups.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: PRÓXIMOS ATENDIMENTOS */}
        <TabsContent value="proximos" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Reuniões Futuras Agendadas</h3>
          </div>

          {proximosAtendimentos.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="pt-12 pb-12 text-center">
                <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">Nenhuma reunião agendada</p>
                <p className="text-sm text-gray-400">Novos agendamentos aparecerão aqui</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {proximosAtendimentos.map((att) => (
                <Card key={att.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span className="font-semibold">
                            {format(new Date(att.data_agendada), 'dd MMM • HH:mm', {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{att.tipo_atendimento}</p>
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{att.consultor_nome}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        {att.status === 'confirmado' ? (
                          <Badge className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Confirmado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-200 text-amber-700">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Pendente
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ABA 2: TODOS OS ATENDIMENTOS */}
        <TabsContent value="todos" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Todos os Atendimentos</h3>
            <Button
              size="sm"
              onClick={() => setShowRegistrarAtendimento(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Registrar
            </Button>
          </div>

          {todosAtendimentos.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="pt-12 pb-12 text-center">
                <Clock className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">Nenhum atendimento agendado</p>
                <p className="text-sm text-gray-400">Novos agendamentos aparecerão aqui</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Bucket (Pendentes) */}
              {contarBucket > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    ⏳ BUCKET - Aguardando Vagas
                  </h4>
                  <div className="space-y-2">
                    {todosAtendimentos
                      .filter(a => a.status === 'pendente' || a.status === 'aguardando_vaga')
                      .map((att) => (
                        <Card key={att.id} className="border-amber-100 bg-amber-50">
                          <CardContent className="pt-3 pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{att.tipo_atendimento}</p>
                                <p className="text-xs text-gray-600 mt-1">
                                  {att.consultor_nome || 'Consultor não atribuído'}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                Pendente
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              )}

              {/* Agendados */}
              {contarAgendados > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    ✅ AGENDADOS
                  </h4>
                  <div className="space-y-2">
                    {todosAtendimentos
                      .filter(a => a.status === 'agendado')
                      .map((att) => (
                        <Card key={att.id} className="border-green-100 bg-green-50">
                          <CardContent className="pt-3 pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm">
                                  📅 {format(new Date(att.data_agendada), 'dd/MM HH:mm', {
                                    locale: ptBR,
                                  })}
                                </p>
                                <p className="text-xs text-gray-600 mt-1">{att.tipo_atendimento}</p>
                              </div>
                              <Badge variant="outline" className="text-xs border-green-300">
                                Agendado
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ABA 3: ATAS DE REUNIÃO */}
        <TabsContent value="atas" className="space-y-4">
          <h3 className="text-lg font-semibold">Atas de Reunião</h3>

          {atas.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="pt-12 pb-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">Nenhuma ata registrada</p>
                <p className="text-sm text-gray-400">Atas de reunião aparecerão aqui</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {atas.map((ata) => (
                <Card key={ata.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-sm bg-gray-100 px-2 py-1 rounded">
                            {ata.code}
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(ata.meeting_date), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-sm font-medium mb-1">{ata.tipo_aceleracao}</p>
                        <p className="text-xs text-gray-600">{ata.consultor_name}</p>
                      </div>
                      <Button variant="ghost" size="sm">
                        Visualizar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ABA 4: FOLLOWUPS */}
        <TabsContent value="followups" className="space-y-4">
          <h3 className="text-lg font-semibold">FollowUps Pendentes</h3>

          {followups.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="pt-12 pb-12 text-center">
                <RotateCw className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">Nenhum followup pendente</p>
                <p className="text-sm text-gray-400">Tudo em dia! 🎉</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {followups.map((fu) => (
                <Card key={fu.id} className="hover:shadow-md transition-shadow border-l-4 border-l-amber-500">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-amber-600" />
                          <span className="font-semibold">
                            {format(new Date(fu.reminder_date), 'dd MMM', { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{fu.message}</p>
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{fu.consultor_nome}</span>
                        </div>
                      </div>
                      <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                        #{fu.sequence_number}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal: Registrar Atendimento */}
      {showRegistrarAtendimento && (
        <RegistrarAtendimento
          isOpen={showRegistrarAtendimento}
          onClose={() => setShowRegistrarAtendimento(false)}
          workshopId={workshopId}
        />
      )}
    </>
  );
}