import React from "react";

const ORIGIN_BONUS = {
  guarda_chuva: 25,
  suporte: 15,
  suporte_checkin: 15,
};

export function calcPriorityScore(reminder, today) {
  if (!reminder || reminder.is_completed) return 0;
  if (!reminder.reminder_date) return 0;

  const msDay = 1000 * 60 * 60 * 24;
  const daysOverdue = Math.max(
    0,
    Math.floor(
      (new Date(today + "T00:00:00") - new Date(reminder.reminder_date + "T00:00:00")) / msDay
    )
  );

  let score = 0;
  if (daysOverdue > 0) score += Math.min(daysOverdue * 8, 60);
  else if (reminder.reminder_date === today) score += 20;

  score += ORIGIN_BONUS[reminder.origin_type] || 0;

  return Math.min(score, 100);
}

function getConfig(score) {
  if (score >= 70) return { ring: "bg-red-500",    text: "text-red-700",    bg: "bg-red-50",    border: "border-red-200"    };
  if (score >= 50) return { ring: "bg-orange-500", text: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" };
  if (score >= 25) return { ring: "bg-amber-400",  text: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200"  };
  return             { ring: "bg-gray-300",    text: "text-gray-500",   bg: "bg-gray-50",   border: "border-gray-200"   };
}

export function PriorityDot({ score }) {
  if (score == null) return <span className="w-2 h-2 rounded-full bg-gray-200 inline-block flex-shrink-0" />;
  const { ring } = getConfig(score);
  return <span className={`w-2 h-2 rounded-full ${ring} inline-block flex-shrink-0`} />;
}

export function PriorityBadge({ score }) {
  if (score == null) return null;
  const { text, bg, border } = getConfig(score);
  return (
    <span
      className={`inline-flex items-center justify-center text-[10px] font-bold tabular-nums border px-1.5 py-0.5 rounded leading-none ${text} ${bg} ${border}`}
    >
      {score}
    </span>
  );
}
