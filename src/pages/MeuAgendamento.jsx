import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, AlertCircle, Plus, Loader2 } from 'lucide-react';
import AutoAgendamentoModal from '@/components/aceleracao/AutoAgendamentoModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function MeuAgendamento() {
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [openModal, setOpenModal] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);

        if (userData?.data?.workshop_id) {
          const ws = await base44.entities.Workshop.get(userData.data.workshop_id);
          setWorkshop(ws);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };

    loadUserData();
  }, []);

  const { data: atendimentos = [], isLoading: loadingAtendimentos } = useQuery({
    queryKey: ['meus-atendimentos', user?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      const list = await base44.entities.ConsultoriaAtendimento.filter({
        workshop_id: workshop.id,
        status: { $in: ['agendado', 'confirmado', 'realizado', 'concluido'] }
      }, '-data_agendada', 20);
      return list || [];
    },
    enabled: !!workshop?.id
  });

  const { data: solicitacoes = [], isLoading: loadingSolicitacoes } = useQuery({
    queryKey: ['minhas-solicitacoes', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      const list = await base44.entities.AgendamentoSolicitacao.filter({
        workshop_id: workshop.id,
        status: 'aguardando_vaga'
      }, '-created_date', 10);
      return list || [];
    },
    enabled: !!workshop?.id
  });

  if (!user || !workshop) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  const statusColors = {
    agendado: 'bg-blue-100 text-blue-800',
    confirmado: 'bg-green-100 text-green-800',
    realizado: 'bg-purple-100 text-purple-800',
    concluido: 'bg-gray-100 text-gray-800',
    aguardando_vaga: 'bg-yellow-100 text-yellow-800'
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{workshop.name}</h1>
              <p className="text-gray-600 mt-1">Plano: <strong>{workshop.planoAtual || 'Não informado'}</strong></p>
            </div>
            <Button
              onClick={() => setOpenModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agendar Atendimento
            </Button>
          </div>
        </div>

        {/* Solicitações em Espera */}
        {solicitacoes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                Solicitações na Fila de Espera
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {solicitacoes.map(sol => (
                  <div key={sol.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{sol.tipo_atendimento_nome}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Solicitado em {format(new Date(sol.created_date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        </p>
                        <p className="text-xs text-yellow-700 mt-2">
                          Você será notificado quando um horário ficar disponível
                        </p>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        Aguardando
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Atendimentos Agendados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Meus Atendimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAtendimentos ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : atendimentos.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">Nenhum atendimento agendado</p>
                <p className="text-sm text-gray-500 mt-1">Clique no botão acima para agendar seu primeiro atendimento</p>
              </div>
            ) : (
              <div className="space-y-3">
                {atendimentos.map(atendimento => (
                  <div key={atendimento.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-medium text-gray-900">{atendimento.tipo_atendimento}</p>
                          <Badge className={statusColors[atendimento.status]}>
                            {atendimento.status}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 flex-shrink-0" />
                            <span>
                              {format(new Date(atendimento.data_agendada), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          {atendimento.consultor_nome && (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 flex-shrink-0" />
                              <span>{atendimento.consultor_nome}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {atendimento.google_meet_link && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(atendimento.google_meet_link, '_blank')}
                        >
                          Google Meet
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AutoAgendamentoModal open={openModal} onOpenChange={setOpenModal} workshop={workshop} user={user} />
    </div>
  );
}