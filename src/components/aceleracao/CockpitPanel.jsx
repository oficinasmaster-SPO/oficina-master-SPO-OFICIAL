import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { differenceInDays } from "date-fns";
import { PlayCircle, X, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import WorkshopAvatar from "./followups/ds/WorkshopAvatar";
import OverviewCockpit from "./followups/OverviewCockpit";

function EmptyState() {
  return (
    <div className="bg-white border border-dashed border-gray-200 rounded-xl p-8 text-center space-y-3">
      <MousePointerClick className="w-6 h-6 text-gray-300 mx-auto" />
      <p className="text-sm text-gray-400 leading-snug">
        Clique em um follow-up<br />para ver o cockpit do cliente
      </p>
    </div>
  );
}

function CockpitPanelInner({ reminder, seqNum, stats, today, onIniciarAtendimento, onClear }) {
  const { data: atas = [] } = useQuery({
    queryKey: ["atas-cockpit", reminder.workshop_id],
    queryFn: () =>
      base44.entities.MeetingMinutes.filter(
        { workshop_id: reminder.workshop_id },
        "-meeting_date",
        20
      ),
    enabled: !!reminder.workshop_id,
    staleTime: 3 * 60 * 1000,
  });

  const { data: concluidos = [] } = useQuery({
    queryKey: ["concluidos-cockpit", reminder.workshop_id],
    queryFn: () =>
      base44.entities.FollowUpConcluido.filter(
        { workshop_id: reminder.workshop_id },
        "-completedAt",
        20
      ),
    enabled: !!reminder.workshop_id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: allFollowUps = [] } = useQuery({
    queryKey: ["all-followups-cockpit", reminder.workshop_id],
    queryFn: () =>
      base44.entities.FollowUpReminder.filter(
        { workshop_id: reminder.workshop_id },
        "-reminder_date",
        100
      ),
    enabled: !!reminder.workshop_id,
    staleTime: 2 * 60 * 1000,
  });

  const isOverdue = !!reminder.reminder_date && reminder.reminder_date < today;
  const daysOver =
    isOverdue && reminder.reminder_date
      ? differenceInDays(new Date(today), new Date(reminder.reminder_date + "T00:00:00"))
      : 0;
  const currentStep = seqNum ?? 1;
  const totalSteps = stats?.total ?? 1;

  return (
    <div className="space-y-3">
      {/* Client header */}
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
        <WorkshopAvatar name={reminder.workshop_name} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate leading-tight">
            {reminder.workshop_name || "Cliente"}
          </p>
          {reminder.consultor_nome && (
            <p className="text-[11px] text-gray-400 truncate mt-0.5">
              {reminder.consultor_nome}
            </p>
          )}
        </div>
        {onClear && (
          <button
            onClick={onClear}
            className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors p-1 rounded"
            title="Fechar cockpit"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <OverviewCockpit
        reminder={reminder}
        allFollowUps={allFollowUps}
        atas={atas}
        concluidos={concluidos}
        today={today}
        currentStep={currentStep}
        totalSteps={totalSteps}
        daysOver={daysOver}
        isOverdue={isOverdue}
        stats={stats}
      />

      <Button
        onClick={() => onIniciarAtendimento?.(reminder)}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 gap-2"
      >
        <PlayCircle className="w-4 h-4" />
        Iniciar Atendimento
      </Button>
    </div>
  );
}

export default function CockpitPanel(props) {
  if (!props.reminder) return <EmptyState />;
  return <CockpitPanelInner {...props} />;
}
