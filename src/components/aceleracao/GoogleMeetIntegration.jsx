import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video, Link as LinkIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function GoogleMeetIntegration({ 
  atendimento, 
  onMeetCreated,
  manualMode = false 
}) {
  const [creating, setCreating] = useState(false);
  const [manualLink, setManualLink] = useState(atendimento?.google_meet_link || "");

  const createMeetLink = async () => {
    if (!atendimento) return;

    setCreating(true);
    try {
      const startDateTime = new Date(atendimento.data_hora);
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hora

      const response = await base44.functions.invoke('createGoogleMeetEvent', {
        summary: `Atendimento - ${atendimento.workshop_name || 'Consultoria'}`,
        description: `Tipo: ${atendimento.tipo_atendimento}\nStatus: ${atendimento.status}`,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        attendees: atendimento.participants_emails || [],
      });

      if (response.data.success) {
        const meetData = {
          google_meet_link: response.data.meetLink,
          google_event_id: response.data.eventId,
          google_calendar_link: response.data.htmlLink,
        };

        if (onMeetCreated) {
          await onMeetCreated(meetData);
        }

        toast.success('Link do Google Meet criado!');
      } else {
        toast.error('Erro ao criar reunião: ' + response.data.error);
      }
    } catch (error) {
      console.error('Error creating Meet link:', error);
      toast.error('Erro ao criar link do Meet');
    } finally {
      setCreating(false);
    }
  };

  const handleManualSave = () => {
    if (onMeetCreated) {
      onMeetCreated({ google_meet_link: manualLink });
    }
    toast.success('Link salvo!');
  };

  if (manualMode) {
    return (
      <div className="space-y-3">
        <Label>Link do Google Meet (Manual)</Label>
        <div className="flex gap-2">
          <Input
            value={manualLink}
            onChange={(e) => setManualLink(e.target.value)}
            placeholder="https://meet.google.com/xxx-xxxx-xxx"
            className="flex-1"
          />
          <Button onClick={handleManualSave} size="sm">
            <LinkIcon className="w-4 h-4 mr-2" />
            Salvar
          </Button>
        </div>
      </div>
    );
  }

  if (atendimento?.google_meet_link) {
    return (
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Reunião criada</span>
          </div>
          <a
            href={atendimento.google_meet_link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            Abrir Meet
          </a>
        </div>
      </div>
    );
  }

  return (
    <Button
      onClick={createMeetLink}
      disabled={creating}
      variant="outline"
      className="w-full"
    >
      {creating ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Criando reunião...
        </>
      ) : (
        <>
          <Video className="w-4 h-4 mr-2" />
          Criar Link do Google Meet
        </>
      )}
    </Button>
  );
}