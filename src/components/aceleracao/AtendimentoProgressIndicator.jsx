import React from "react";
import { Check, Circle } from "lucide-react";

const STEPS = [
  { key: "dados", label: "Dados", check: (f) => !!f.workshop_id && !!f.data_agendada && !!f.hora_agendada },
  { key: "pauta", label: "Pauta", check: (f) => (f.pauta || []).some(p => p.titulo) },
  { key: "checklist", label: "Checklist", check: (f) => (f.checklist_respostas || []).length > 0 },
  { key: "observacoes", label: "Observações", check: (f) => !!f.observacoes_consultor },
  { key: "ata", label: "ATA", check: (f) => !!f.ata_id },
];

export default function AtendimentoProgressIndicator({ formData }) {
  const completed = STEPS.filter(s => s.check(formData)).length;
  const pct = Math.round((completed / STEPS.length) * 100);

  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-700">Progresso do Atendimento</span>
        <span className="text-xs font-medium text-gray-500">{completed}/{STEPS.length} etapas</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div
          className="h-2 rounded-full transition-all duration-500 bg-blue-600"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-1">
        {STEPS.map((step, i) => {
          const done = step.check(formData);
          return (
            <div key={step.key} className="flex flex-col items-center gap-1 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                done ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"
              }`}>
                {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-[10px] font-medium ${done ? "text-green-700" : "text-gray-400"}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}