import React from "react";

export function calcHealthScore({ reminder, allFollowUps = [], atas = [], concluidos = [], today }) {
  let score = 50;
  const msDay = 1000 * 60 * 60 * 24;

  if (atas.length >= 5) score += 25;
  else if (atas.length >= 3) score += 15;
  else if (atas.length >= 1) score += 8;
  else score -= 10;

  if (concluidos.length > 0) {
    const lastContact = concluidos.reduce((latest, c) => {
      const d = c.completedAt || c.created_date;
      return (!latest || d > latest) ? d : latest;
    }, null);
    if (lastContact) {
      const daysAgo = Math.floor((new Date(today) - new Date(lastContact)) / msDay);
      if (daysAgo <= 7)  score += 20;
      else if (daysAgo <= 14) score += 10;
      else if (daysAgo <= 30) score += 5;
      else score -= 10;
    }
  } else {
    score -= 15;
  }

  if (reminder && !reminder.is_completed && reminder.reminder_date) {
    const daysOverdue = Math.max(0, Math.floor(
      (new Date(today + "T00:00:00") - new Date(reminder.reminder_date + "T00:00:00")) / msDay
    ));
    if (daysOverdue > 14) score -= 20;
    else if (daysOverdue > 7)  score -= 10;
    else if (daysOverdue > 3)  score -= 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getConfig(score) {
  if (score >= 70) return { label: "Saudável",  color: "text-green-700",  bg: "bg-green-50",  bar: "bg-green-500",  border: "border-green-200"  };
  if (score >= 40) return { label: "Atenção",   color: "text-amber-700",  bg: "bg-amber-50",  bar: "bg-amber-500",  border: "border-amber-200"  };
  return             { label: "Em risco",  color: "text-red-700",    bg: "bg-red-50",    bar: "bg-red-500",    border: "border-red-200"    };
}

export function HealthScoreBadge({ score }) {
  if (score == null) return null;
  const { label, color, bg, border } = getConfig(score);
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${color} ${bg} ${border}`}>
      <span className="tabular-nums">{score}</span>
      <span className="font-medium">{label}</span>
    </span>
  );
}

export function HealthScoreBar({ score, showLabel = true }) {
  if (score == null) return null;
  const { label, bar, color } = getConfig(score);
  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex justify-between text-[11px]">
          <span className="text-gray-500">Saúde do cliente</span>
          <span className={`font-semibold ${color}`}>{score}% · {label}</span>
        </div>
      )}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${bar}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}