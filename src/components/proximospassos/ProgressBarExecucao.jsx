import React from "react";

const STEPS = [0, 25, 50, 75, 100];

const COLOR = (v) =>
  v === 100 ? "bg-green-500" : v >= 75 ? "bg-blue-500" : v >= 50 ? "bg-blue-400" : v >= 25 ? "bg-yellow-400" : "bg-gray-300";

export default function ProgressBarExecucao({ value, onChange }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-gray-600">Percentual de execução</label>
        <span className="text-sm font-bold text-gray-800">{value}%</span>
      </div>

      {/* Barra visual */}
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all duration-300 ${COLOR(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>

      {/* Botões rápidos */}
      <div className="flex gap-2">
        {STEPS.map(step => (
          <button
            key={step}
            onClick={() => onChange(step)}
            className={`flex-1 text-xs py-1.5 rounded-lg border font-medium transition-all ${
              value === step
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600"
            }`}
          >
            {step}%
          </button>
        ))}
      </div>

      {/* Slider preciso */}
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full mt-3 accent-blue-600"
      />
    </div>
  );
}