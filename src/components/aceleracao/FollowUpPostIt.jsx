import React from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { StickyNote, Check, ExternalLink, User, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function FollowUpPostIt({ reminders, onUpdate }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  if (!reminders || reminders.length === 0) return null;

  const handleComplete = async (reminder) => {
    try {
      await base44.entities.FollowUpReminder.update(reminder.id, {
        is_completed: true,
        completed_at: new Date().toISOString()
      });
      toast.success("Follow-up marcado como realizado!");
      // Invalida todas as queries de follow-up (independente de workshop_id no cache)
      queryClient.invalidateQueries({ queryKey: ['follow-up-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['followups-realizados'] });
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error("Erro ao atualizar: " + error.message);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <StickyNote className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-semibold text-amber-800">Lembretes de Follow-Up</span>
      </div>
      {reminders.map((reminder) => (
        <div
          key={reminder.id}
          className={`p-3 rounded-lg border-l-4 shadow-sm transition-all ${
            reminder.is_completed
              ? "bg-green-50 border-green-400 opacity-60"
              : "bg-amber-50 border-amber-400 hover:shadow-md"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-amber-900 truncate">
                📌 {reminder.workshop_name || "Cliente"}
              </p>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                {reminder.days_since_meeting} dias desde último atendimento. Retorne ao cliente para saber sobre sua evolução.
              </p>
              <div className="flex flex-col gap-0.5 mt-1.5">
                {reminder.consultor_nome && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-700">
                    <User className="w-2.5 h-2.5" />
                    {reminder.consultor_nome}
                  </span>
                )}
                {reminder.reminder_date && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-700">
                    <Calendar className="w-2.5 h-2.5" />
                    {format(new Date(reminder.reminder_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                )}
                <span className="inline-block text-[10px] text-amber-600 font-medium">
                  Follow-up {reminder.sequence_number}/4
                </span>
              </div>
            </div>
            {!reminder.is_completed && (
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 h-7 w-7 p-0 text-green-600 hover:bg-green-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleComplete(reminder);
                }}
                title="Marcar como realizado"
              >
                <Check className="w-4 h-4" />
              </Button>
            )}
          </div>
          {reminder.is_completed && (
            <p className="text-[10px] text-green-600 mt-1 font-medium">✓ Concluído</p>
          )}
          {reminder.ata_id && (
            <Button
              size="sm"
              variant="outline"
              className="mt-2 w-full h-6 text-[10px] text-amber-700 border-amber-300 hover:bg-amber-100 gap-1"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/ControleAceleracao?tab=atendimentos&viewAta=${reminder.ata_id}`);
              }}
            >
              <ExternalLink className="w-3 h-3" />
              Visualizar ATA
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}