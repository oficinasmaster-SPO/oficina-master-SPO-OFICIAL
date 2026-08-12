import React from "react";
import { Check } from "lucide-react";

const MONTH_ABBR = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function parseMonth(ym) {
  const [y, m] = ym.split("-").map(Number);
  return { y, m: m - 1 };
}

function toKey(y, m) {
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

function addMonths(key, delta) {
  const { y, m } = parseMonth(key);
  const d = new Date(y, m + delta, 1);
  return toKey(d.getFullYear(), d.getMonth());
}

function monthsBetween(a, b) {
  const pa = parseMonth(a);
  const pb = parseMonth(b);
  return (pb.y - pa.y) * 12 + (pb.m - pa.m);
}

function buildRange(inicioMes, currentMes) {
  let start;
  const end = currentMes;
  if (inicioMes) {
    start = addMonths(inicioMes, -3);
    if (monthsBetween(start, end) > 23) start = addMonths(end, -23);
  } else {
    start = addMonths(end, -11);
  }
  const cells = [];
  let cur = start;
  let guard = 0;
  while (cur <= end && guard < 60) {
    cells.push(cur);
    cur = addMonths(cur, 1);
    guard++;
  }
  return cells;
}

function inHighlightWindow(key, inicioMes) {
  if (!inicioMes) return false;
  const start = addMonths(inicioMes, -3);
  return key >= start && key <= inicioMes;
}

export default function IndicadoresMonthGrid({
  capturedMonths,
  inicioMes,
  mesReferencia,
  onSelectMonth,
  loading,
}) {
  const currentMes = new Date().toISOString().slice(0, 7);
  const cells = buildRange(inicioMes, currentMes);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {cells.map((key) => {
          const { y, m } = parseMonth(key);
          const captured = capturedMonths.has(key);
          const isStart = inicioMes && key === inicioMes;
          const highlighted = !captured && inHighlightWindow(key, inicioMes);
          const isSelected = key === mesReferencia;
          const isFuture = key > currentMes;

          let cls =
            "relative flex flex-col items-center justify-center rounded-md border w-11 h-11 text-[10px] transition-colors select-none ";
          if (isFuture) {
            cls += "border-transparent text-muted-foreground/40 opacity-50 cursor-not-allowed";
          } else if (captured) {
            cls += "bg-green-500 border-green-500 text-white hover:bg-green-600 cursor-pointer";
          } else if (highlighted) {
            cls += "bg-blue-50 border-2 border-blue-500 text-blue-700 hover:bg-blue-100 cursor-pointer";
          } else {
            cls += "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 cursor-pointer";
          }
          if (isSelected && !isFuture) {
            cls += " ring-2 ring-offset-1 ring-gray-900";
          }

          return (
            <button
              type="button"
              key={key}
              disabled={isFuture}
              onClick={() => !isFuture && onSelectMonth(key)}
              className={cls}
              title={`${MONTH_ABBR[m]}/${String(y).slice(2)}${captured ? " — capturado" : " — pendente"}${isStart ? " — início" : ""}`}
            >
              {isStart && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-6 bg-blue-600 rounded-b-sm" />
              )}
              {captured && (
                <Check className="w-3 h-3" strokeWidth={3} />
              )}
              {!captured && (
                <>
                  <span className="font-medium uppercase leading-none">{MONTH_ABBR[m]}</span>
                  <span className="text-[8px] leading-none mt-0.5 opacity-70">{String(y).slice(2)}</span>
                </>
              )}
            </button>
          );
        })}
        {loading && (
          <span className="text-[10px] text-muted-foreground self-center ml-1">carregando...</span>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground mt-2 flex items-center flex-wrap gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500" /> capturado
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm border-2 border-blue-500 bg-blue-50" /> início + 3 anteriores
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm border border-gray-300 bg-white" /> pendente
        </span>
      </p>
    </div>
  );
}