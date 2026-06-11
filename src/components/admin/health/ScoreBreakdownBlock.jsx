import React from "react";

const METRIC_LABELS = {
  duplicate_users:          "Duplicate Users",
  duplicate_employees:      "Duplicate Employees",
  workshops_without_owner:  "Workshops s/ Owner",
  owners_with_wrong_profile:"Owners Perfil Errado",
  employees_orphaned:       "Employees Órfãos",
  invites_expired:          "Convites Expirados",
};

export default function ScoreBreakdownBlock({ data }) {
  const breakdown = data.score_breakdown || [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-base font-semibold text-gray-900 mb-4">🧮 Score de Saúde — Detalhamento</h2>

      {breakdown.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-4xl mb-2">🎉</p>
          <p className="text-sm text-green-600 font-medium">Sem penalizações! Score máximo.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase">Métrica</th>
                <th className="text-right py-2 pr-4 text-xs font-semibold text-gray-500 uppercase">Qtd</th>
                <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Penalidade</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-50">
                <td className="py-2.5 pr-4 text-gray-700 font-medium">Score Base</td>
                <td className="py-2.5 pr-4 text-right text-gray-400">–</td>
                <td className="py-2.5 text-right font-bold text-green-600">+100</td>
              </tr>
              {breakdown.map((item, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2.5 pr-4 text-gray-700">{METRIC_LABELS[item.reason] || item.reason}</td>
                  <td className="py-2.5 pr-4 text-right text-gray-500">{item.count}</td>
                  <td className="py-2.5 text-right font-bold text-red-600">{item.penalty}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300">
                <td className="py-3 pr-4 font-bold text-gray-900">Score Final</td>
                <td className="py-3 pr-4 text-right text-gray-400">–</td>
                <td className={`py-3 text-right font-bold text-xl ${data.health_score >= 80 ? "text-green-600" : data.health_score >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                  {data.health_score}/100
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}