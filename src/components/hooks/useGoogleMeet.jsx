import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export function useGoogleMeet() {
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const createMeeting = async ({ summary, description, startDateTime, endDateTime, attendees }) => {
    setCreating(true);
    try {
      const response = await base44.functions.invoke('createGoogleMeetEvent', {
        summary,
        description,
        startDateTime,
        endDateTime,
        attendees,
      });

      if (response.data.success) {
        toast.success('Reunião criada com sucesso!');
        return response.data;
      } else {
        toast.error('Erro ao criar reunião: ' + response.data.error);
        return null;
      }
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast.error('Erro ao criar reunião do Google Meet');
      return null;
    } finally {
      setCreating(false);
    }
  };

  const updateMeeting = async ({ eventId, summary, description, startDateTime, endDateTime, attendees }) => {
    setUpdating(true);
    try {
      const response = await base44.functions.invoke('updateGoogleMeetEvent', {
        eventId,
        summary,
        description,
        startDateTime,
        endDateTime,
        attendees,
      });

      if (response.data.success) {
        toast.success('Reunião atualizada!');
        return response.data;
      } else {
        toast.error('Erro ao atualizar reunião: ' + response.data.error);
        return null;
      }
    } catch (error) {
      console.error('Error updating meeting:', error);
      toast.error('Erro ao atualizar reunião');
      return null;
    } finally {
      setUpdating(false);
    }
  };

  const deleteMeeting = async (eventId) => {
    setDeleting(true);
    try {
      const response = await base44.functions.invoke('deleteGoogleMeetEvent', { eventId });

      if (response.data.success) {
        toast.success('Reunião cancelada!');
        return true;
      } else {
        toast.error('Erro ao cancelar reunião: ' + response.data.error);
        return false;
      }
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast.error('Erro ao cancelar reunião');
      return false;
    } finally {
      setDeleting(false);
    }
  };

  return {
    createMeeting,
    updateMeeting,
    deleteMeeting,
    isCreating: creating,
    isUpdating: updating,
    isDeleting: deleting,
  };
}