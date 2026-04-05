import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, TrendingUp } from "lucide-react";

export default function NPSPanel({ respostas = [] }) {
  // Calcular NPS (Promotores - Detratores) / Total * 100
  const promotores = respostas.filter(r => r.score >= 9).length;
  const detratores = respostas.filter(r => r.score <= 6).length;
  const nps = respostas.length > 0 
    ? Math.round(((promotores - detratores) / respostas.length) * 100)
    : 0;

  const scoreMedio = respostas.length > 0
    ? (respostas.reduce((sum, r) => sum + r.score, 0) / respostas.length).toFixed(1)
    : 0;

  const avaliacoes = [
    { score: "9-10", label: "Promotores", count: promotores, color: "text-green-600" },
    { score: "7-8", label: "Neutros", count: respostas.filter(r => r.score >= 7 && r.score <= 8).length, color: "text-yellow-600" },
    { score: "0-6", label: "Detratores", count: detratores, color: "text-red-600" }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-pink-600" />
          NPS (Satisfação de Clientes)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-green-600 font-bold text-3xl">{nps}</p>
            <p className="text-green-700 text-sm font-medium">Índice NPS</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-blue-600 font-bold text-3xl">{scoreMedio}</p>
            <p className="text-blue-700 text-sm font-medium">Score Médio</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <p className="text-purple-600 font-bold text-3xl">{respostas.length}</p>
            <p className="text-purple-700 text-sm font-medium">Respostas</p>
          </div>
        </div>

        <div className="space-y-3">
          {avaliacoes.map((av, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{av.label}</span>
              <div className="flex items-center gap-3">
                <div className="w-40 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${av.color}`}
                    style={{
                      width: `${respostas.length > 0 ? (av.count / respostas.length) * 100 : 0}%`,
                      backgroundColor: av.color === "text-green-600" ? "#16a34a" : av.color === "text-yellow-600" ? "#eab308" : "#dc2626"
                    }}
                  />
                </div>
                <span className={`font-bold text-lg ${av.color}`}>{av.count}</span>
              </div>
            </div>
          ))}
        </div>

        {respostas.length === 0 && (
          <p className="text-gray-500 text-center py-6">Aguardando respostas NPS...</p>
        )}
      </CardContent>
    </Card>
  );
}