import React from "react";
import { CalendarDays } from "lucide-react";
import { differenceInCalendarDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

function SmartDueDate({ date, completed = false }) {
  if (!date) return <span className="text-sm text-gray-400">Sem prazo</span>;
  const due = new Date(date);
  const diff = differenceInCalendarDays(due, new Date());
  const relative = completed ? "Concluída" : diff === 0 ? "Hoje" : diff === 1 ? "Amanhã" : diff > 1 ? `Em ${diff} dias` : `Vencido há ${Math.abs(diff)} ${Math.abs(diff) === 1 ? "dia" : "dias"}`;
  const tone = !completed && diff < 0 ? "text-red-600" : !completed && diff <= 1 ? "text-amber-600" : "text-gray-700";

  return (
    <div className={`flex items-start gap-2 ${tone}`}>
      <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
      <div><p className="text-sm font-semibold">{relative}</p><p className="text-xs opacity-70">{format(due, "dd/MM/yyyy", { locale: ptBR })}</p></div>
    </div>
  );
}

export default React.memo(SmartDueDate);