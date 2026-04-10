import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, Loader2, MessageSquare, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import TipoAtendimentoManager from "@/components/aceleracao/TipoAtendimentoManager";
import WorkshopSearchSelect from "@/components/aceleracao/WorkshopSearchSelect";

export default function BasicInfoSection({
  formData, setFormData, user, workshops, consultores,
  todosOsTipos, customTipos, setCustomTipos,
  createMeeting, isCreating
}) {
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
              onValueChange={(value) => setFormData((prev) => ({ ...prev, workshop_id: value }))} />
            
          </div>

          {user?.role === 'admin' &&
          <div>
              <Label>Consultor Responsável</Label>
              <Select
              value={formData.consultor_id || user.id}
              onValueChange={(value) => {
                const consultor = consultores?.find((c) => c.id === value);
                setFormData((prev) => ({
                  ...prev,
                  consultor_id: value,
                  consultor_nome: consultor?.full_name || user.full_name
                }));
              }}>
              
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {consultores?.map((c) =>
                <SelectItem key={c.id} value={c.id}>
                      {c.full_name}
                    </SelectItem>
                )}
                </SelectContent>
              </Select>
            </div>
          }
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Tipo de Atendimento *</Label>
              <TipoAtendimentoManager customTipos={customTipos} onSave={setCustomTipos} />
            </div>
            <Select
              value={formData.tipo_atendimento}
              onValueChange={(value) => {
                const tipo = todosOsTipos.find((t) => t.value === value || t.id === value);
                const duracao = tipo?.duracao || 60;
                setFormData((prev) => ({ ...prev, tipo_atendimento: value, duracao_minutos: duracao }));
              }}>
              
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo..." />
              </SelectTrigger>
              <SelectContent>
                {todosOsTipos && todosOsTipos.length > 0 ?
                todosOsTipos.map((tipo) =>
                <SelectItem key={tipo.id} value={tipo.value || tipo.id}>
                      {tipo.label} ({tipo.duracao}min)
                    </SelectItem>
                ) :

                <div className="p-2 text-sm text-gray-500">Carregando tipos...</div>
                }
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col justify-end">
            <Label>Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}>
              
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agendado">Agendado</SelectItem>
                <SelectItem value="confirmado">Confirmado</SelectItem>
                <SelectItem value="participando">Participando</SelectItem>
                <SelectItem value="realizado">Realizado</SelectItem>
                <SelectItem value="atrasado">Atrasado</SelectItem>
                <SelectItem value="reagendado">Reagendado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
                <SelectItem value="faltou">Faltou</SelectItem>
                <SelectItem value="desmarcou">Desmarcou</SelectItem>
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
              onChange={(e) => setFormData((prev) => ({ ...prev, data_agendada: e.target.value }))}
              required />
            
          </div>
          <div>
            <Label>Horário *</Label>
            <Input
              type="time"
              value={formData.hora_agendada}
              onChange={(e) => setFormData((prev) => ({ ...prev, hora_agendada: e.target.value }))}
              required />
            
          </div>
          <div>
            <Label>Duração (min)</Label>
            <Input
              type="number"
              value={formData.duracao_minutos}
              onChange={(e) => setFormData((prev) => ({ ...prev, duracao_minutos: parseInt(e.target.value, 10) || 60 }))}
              min="15"
              step="15" />
            
          </div>
        </div>

        {/* Google Meet */}
        <GoogleMeetSection
          formData={formData}
          setFormData={setFormData}
          user={user}
          consultores={consultores}
          createMeeting={createMeeting}
          isCreating={isCreating} />
        

      </CardContent>
    </Card>);

}

function GoogleMeetSection({ formData, setFormData, user, consultores, createMeeting, isCreating }) {
  const copyInviteMessage = () => {
    const msg = buildInviteMessage(formData, user, consultores);
    try {
      navigator.clipboard.writeText(msg);
      toast.success("Mensagem copiada para a área de transferência!");
    } catch {
      toast.error("Não foi possível copiar. Selecione e copie manualmente.");
    }
  };

  return (
    <div className="space-y-3">
      <Label>Google Meet</Label>

      {formData.data_agendada && formData.hora_agendada && !formData.google_meet_link &&
      <Button
        type="button"
        variant="default"
        className="w-full bg-blue-600 hover:bg-blue-700"
        disabled={isCreating}
        onClick={async () => {
          const startDateTime = new Date(`${formData.data_agendada}T${formData.hora_agendada}:00`);
          const endDateTime = new Date(startDateTime.getTime() + formData.duracao_minutos * 60000);

          const attendeesEmails = formData.participantes.
          map((p) => p.email).
          filter((e) => e && e.includes('@'));

          const meetData = await createMeeting({
            summary: `${formData.tipo_atendimento?.replace(/_/g, ' ')} - Oficinas Master`,
            description: formData.objetivos.join('\n'),
            startDateTime: startDateTime.toISOString(),
            endDateTime: endDateTime.toISOString(),
            attendees: attendeesEmails
          });

          if (meetData) {
            setFormData((prev) => ({
              ...prev,
              google_meet_link: meetData.meetLink,
              google_event_id: meetData.eventId,
              google_calendar_link: meetData.htmlLink
            }));
            try {
              const msg = buildInviteMessage({ ...formData, google_meet_link: meetData.meetLink }, user, consultores);
              navigator.clipboard.writeText(msg);
              toast.success("Reunião criada e convite copiado!");
            } catch {
              toast.success("Reunião criada com sucesso!");
            }
          }
        }}>
        
          {isCreating ?
        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando reunião...</> :

        <><Video className="w-4 h-4 mr-2" />Criar Reunião Automática (Google Calendar + Meet)</>
        }
        </Button>
      }

      <div className="space-y-3">
        <Input
          placeholder="Ou cole o link manualmente"
          value={formData.google_meet_link}
          onChange={(e) => setFormData((prev) => ({ ...prev, google_meet_link: e.target.value }))} />
        

        {formData.google_meet_link &&
        <div className="mt-4 p-4 border rounded-lg bg-gray-50 space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              Mensagem de Convite
            </Label>
            <p className="text-xs text-gray-500 mb-2">Envie esta mensagem ao cliente pelo WhatsApp ou E-mail.</p>
            <div className="relative">
              <Textarea
              readOnly
              className="text-sm text-gray-700 bg-white min-h-[140px] pr-12 focus-visible:ring-1"
              value={buildInviteMessage(formData, user, consultores)} />
            
              <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 hover:bg-blue-100 hover:text-blue-600 transition-colors"
              onClick={copyInviteMessage}
              title="Copiar mensagem">
              
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        }
      </div>

      {formData.google_event_id &&
      <p className="text-xs text-green-600 flex items-center gap-1 mt-2">
          <CheckCircle2 className="w-3 h-3" />
          Evento criado e sincronizado com o Google Calendar
        </p>
      }
    </div>);

}

function buildInviteMessage(formData, user, consultores) {
  // I4: resolve consul name from consultores list when consultor_nome is empty
  let nomeConsultor = formData.consultor_nome;
  if (!nomeConsultor && consultores?.length > 0) {
    const c = consultores.find((c) => c.id === (formData.consultor_id || user?.id));
    nomeConsultor = c?.full_name;
  }
  nomeConsultor = nomeConsultor || user?.full_name || 'o consultor';
  return `Olá! Tudo bem?\nSua reunião de ${formData.tipo_atendimento?.replace(/_/g, ' ')} com ${nomeConsultor} está agendada.\n\n🗓 Data: ${formData.data_agendada?.split('-').reverse().join('/') || ''}\n⏰ Horário: ${formData.hora_agendada || ''}\n\nPara participar, acesse o link abaixo no horário combinado:\n🔗 ${formData.google_meet_link}`;
}