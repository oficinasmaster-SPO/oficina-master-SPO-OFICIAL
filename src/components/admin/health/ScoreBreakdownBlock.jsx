import React from "react";

const LABEL_MAP = {
  duplicate_users:            "Duplicate Users",
  duplicate_employees:        "Duplicate Employees",
  workshops_without_owner:    "Workshops sem Owner",
  owners_with_wrong_profile:  "Owners com Perfil Errado",
  orphan_employees:           "Employees Órfãos",
  orphan_users:               "Users Órfãos",
  users_without_employee:     "Users sem Employee",
  legacy_endpoint_calls:      "Legacy Endpoint Chamado (24h)",
  invites_expired:            "Invites Expirados",
  users_pending_workshop:     "Users Pending Workshop",
};

// Penalizações máximas conforme spec
const SPEC_PENALTIES = {
  duplicate_users:            -25,
  duplicate_employees:        -25,
  workshops_without_owner:    -20,
  owners_with_wrong_profile:  -20,
  orphan_users:               -10,
  orphan_employees:           -10,
  legacy_endpoint_calls:      -10,
  users_pending_workshop:     -1,
  invites_expired:            -1,
};

export default function ScoreBreakdownBlock({ data }) {
  const breakdown = data.score_breakdown || [];
  const score = data.health_score ?? 100;
  const scoreColor = score >= 90 ? "text-green-600" : score >= 70 ? "text-yellow-600" : "text-red-600";
  const scoreBg = score >= 90 ? "bg-green-50 border-green-200" : score >= 70 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-base font-semibold text-gray-900 mb-1">📊 Detalhamento do Health Score</h2>
      <p className="text-xs text-gray-400 mb-4">
        Base: 100 pontos · <code className="bg-gray-100 px-1 rounded">employees_pending_invite</code> não penaliza (estado operacional esperado)
      </p>

      <div className="flex items-center gap-3 mb-4">
        <div className={`rounded-lg border px-5 py-3 ${scoreBg}`}>
          <p className="text-xs text-gray-500 mb-0.5">Score Final</p>
          <p className={`text-3xl font-bold ${scoreColor}`}>{score}<span className="text-base font-normal text-gray-400">/100</span></p>
        </div>
        <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${score >= 90 ? "bg-green-500" : score >= 70 ? "bg-yellow-400" : "bg-red-500"}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {breakdown.length === 0 ? (
        <div className="text-center py-6 bg-green-50 rounded-lg border border-green-200">
          <p className="text-2xl mb-1">🎉</p>
          <p className="text-sm font-semibold text-green-700">Score perfeito — nenhuma penalização aplicada!</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 text-xs text-gray-400 font-semibold uppercase tracking-wider">Métrica</th>
              <th className="text-center py-2 text-xs text-gray-400 font-semibold uppercase tracking-wider">Qtd</th>
              <th className="text-center py-2 text-xs text-gray-400 font-semibold uppercase tracking-wider">Penalidade Máx</th>
              <th className="text-right py-2 text-xs text-gray-400 font-semibold uppercase tracking-wider">Aplicada</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.map((item, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className="py-2.5 text-gray-700">{LABEL_MAP[item.reason] || item.reason}</td>
                <td className="py-2.5 text-center text-gray-600">{item.count}</td>
                <td className="py-2.5 text-center text-gray-400 text-xs">
                  {SPEC_PENALTIES[item.reason] ?? "–"}
                </td>
                <td className="py-2.5 text-right font-semibold text-red-600">{item.penalty}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-200 bg-gray-50">
              <td colSpan={3} className="py-2.5 font-semibold text-gray-700 text-right pr-4">Score Final</td>
              <td className={`py-2.5 text-right font-bold text-lg ${scoreColor}`}>{score}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}