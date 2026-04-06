import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Video, LinkIcon, Clock, Loader2 } from 'lucide-react';
import WorkshopSearchSelect from '@/components/aceleracao/WorkshopSearchSelect';
import TipoAtendimentoManager from '@/components/aceleracao/TipoAtendimentoManager';
import MeetingTimer from '@/components/aceleracao/MeetingTimer';
import { TimePicker } from '@/components/ui/time-picker';
import { toast } from 'sonner';

export default function BasicInfoCard({
  formData,
  setFormData,
  workshops,
  consultores,
  user,
  todosOsTipos,
  showMeetingTimer,
  setShowMeetingTimer,
  setTimerData,
  isCreating,
  createMeeting,
  refetchTipos
}) {
  const gerarLinkGoogleMeet = () => {
    const randomId = Math.random().toString(36).substring(7);
    const meetLink = `https://meet.google.com/${randomId}`;
    setFormData({ ...formData, google_meet_link: meetLink });
    toast.success('Link gerado! Você pode editá-lo se necessário.');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações Básicas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Oficina Cliente *</Label>
            <WorkshopSearchSelect
              workshops={workshops}
              value={formData.workshop_id}
              onValueChange={(value) => setFormData({ ...formData, workshop_id: value })}
            />
          </div>

          {user?.role === 'admin' && (
            <div>
              <Label>Consultor Responsável</Label>
              <Select
                value={formData.consultor_id || user.id}
                onValueChange={(value) => {
                  const consultor = consultores?.find(c => c.id === value);
                  setFormData({
                    ...formData,
                    consultor_id: value,
                    consultor_nome: consultor?.full_name || user.full_name
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={user.id}>{user.full_name} (Eu)</SelectItem>
                  {consultores?.filter(c => c.id !== user.id).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Tipo de Atendimento *</Label>
              <TipoAtendimentoManager onSave={refetchTipos} />
            </div>
            <Select
              value={formData.tipo_atendimento}
              onValueChange={(value) => {
                const tipo = todosOsTipos.find(t => t.value === value || t.id === value);
                const duracao = tipo?.duracao || 60;
                setFormData({
                  ...formData,
                  tipo_atendimento: value,
                  duracao_minutos: duracao
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo..." />
              </SelectTrigger>
              <SelectContent>
                {todosOsTipos && todosOsTipos.length > 0 ? (
                  todosOsTipos.map(tipo => (
                    <SelectItem key={tipo.id} value={tipo.value || tipo.id}>
                      {tipo.label} ({tipo.duracao}min)
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-gray-500">Carregando tipos...</div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agendado">Agendado</SelectItem>
                <SelectItem value="confirmado">Confirmado</SelectItem>
                <SelectItem value="realizado">Realizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Data *</Label>
            <Input
              type="date"
              value={formData.data_agendada}
              onChange={(e) => setFormData({ ...formData, data_agendada: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Horário *</Label>
            <TimePicker
              value={formData.hora_agendada}
              onChange={(val) => setFormData({ ...formData, hora_agendada: val })}
              required
            />
          </div>
          <div>
            <Label>Duração (min)</Label>
            <Input
              type="number"
              value={formData.duracao_minutos}
              onChange={(e) => setFormData({ ...formData, duracao_minutos: parseInt(e.target.value) })}
              min="15"
              step="15"
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label>Google Meet</Label>

          {formData.data_agendada && formData.hora_agendada && !formData.google_meet_link && (
            <Button
              type="button"
              variant="default"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isCreating}
              onClick={async () => {
                const startDateTime = new Date(`${formData.data_agendada}T${formData.hora_agendada}:00`);
                const endDateTime = new Date(startDateTime.getTime() + formData.duracao_minutos * 60000);

                const attendeesEmails = formData.participantes
                  .map(p => p.email)
                  .filter(e => e && e.includes('@'));

                const meetData = await createMeeting({
                  summary: `${formData.tipo_atendimento?.replace(/_/g, ' ')} - Oficinas Master`,
                  description: formData.objetivos.join('\n'),
                  startDateTime: startDateTime.toISOString(),
                  endDateTime: endDateTime.toISOString(),
                  attendees: attendeesEmails
                });

                if (meetData) {
                  setFormData({
                    ...formData,
                    google_meet_link: meetData.meetLink,
                    google_event_id: meetData.eventId,
                    google_calendar_link: meetData.htmlLink
                  });
                }
              }}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando reunião...
                </>
              ) : (
                <>
                  <Video className="w-4 h-4 mr-2" />
                  Criar Reunião Automática (Google Calendar + Meet)
                </>
              )}
            </Button>
          )}

          <div className="flex gap-2">
            <Input
              placeholder="Ou cole o link manualmente"
              value={formData.google_meet_link}
              onChange={(e) => setFormData({ ...formData, google_meet_link: e.target.value })}
            />
            {!formData.google_meet_link && (
              <Button type="button" variant="outline" onClick={gerarLinkGoogleMeet}>
                <LinkIcon className="w-4 h-4 mr-2" />
                Gerar
              </Button>
            )}
          </div>

          {formData.google_event_id && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CalendarIcon className="w-3 h-3" />
              Evento criado no Google Calendar
            </p>
          )}
        </div>

        {formData.status === 'participando' && (
          <div className="border-t pt-4">
            <Button
              type="button"
              variant="outline"
              className="w-full mb-4"
              onClick={() => setShowMeetingTimer(!showMeetingTimer)}
            >
              <Clock className="w-4 h-4 mr-2" />
              {showMeetingTimer ? 'Ocultar Timer' : 'Iniciar Reunião com Timer'}
            </Button>
            {showMeetingTimer && <MeetingTimer onTimerData={setTimerData} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}