import React from "react";
import { base44 } from "@/api/base44Client";
import { StickyNote, Check, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function FollowUpPostIt({ reminders, onUpdate }) {
  const queryClient = useQueryClient();

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
              <span className="inline-block mt-1 text-[10px] text-amber-600 font-medium">
                Follow-up {reminder.sequence_number}/4
              </span>
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
        </div>
      ))}
    </div>
  );
}