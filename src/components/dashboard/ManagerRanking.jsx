import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Award, Medal, Users } from "lucide-react";

export default function ManagerRanking({ employees }) {
  // Filtrar gerentes
  const managers = employees
    .filter(emp => emp.position?.toLowerCase().includes('gerente') && emp.status === 'ativo')
    .map(emp => {
      const totalProduction = (emp.production_parts || 0) + (emp.production_services || 0);
      
      return {
        id: emp.id,
        name: emp.full_name,
        position: emp.position,
        area: emp.area,
        production: totalProduction,
        engagement: emp.engagement_score || 0,
        workshop_id: emp.workshop_id
      };
    })
    .filter(mgr => mgr.production > 0)
    .sort((a, b) => b.production - a.production)
    .slice(0, 20);

  const getRankIcon = (position) => {
    if (position === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (position === 2) return <Award className="w-5 h-5 text-gray-400" />;
    if (position === 3) return <Medal className="w-5 h-5 text-orange-500" />;
    return <span className="text-sm font-bold text-gray-600">{position}</span>;
  };

  const areaLabels = {
    vendas: "Vendas",
    comercial: "Comercial",
    marketing: "Marketing",
    tecnico: "Técnico",
    administrativo: "Administrativo",
    financeiro: "Financeiro",
    gerencia: "Gerência"
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-600" />
          Ranking Nacional - Gerentes
        </CardTitle>
        <CardDescription>Top 20 gerentes por resultados e liderança</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left p-3 font-semibold text-gray-700 w-16">Pos.</th>
                <th className="text-left p-3 font-semibold text-gray-700">Nome</th>
                <th className="text-left p-3 font-semibold text-gray-700">Área</th>
                <th className="text-right p-3 font-semibold text-gray-700">Produção</th>
                <th className="text-right p-3 font-semibold text-gray-700">Engajamento</th>
              </tr>
            </thead>
            <tbody>
              {managers.map((mgr, index) => (
                <tr 
                  key={mgr.id}
                  className={`border-b hover:bg-gray-50 transition-colors ${
                    index < 3 ? 'bg-gradient-to-r from-purple-50 to-transparent' : ''
                  }`}
                >
                  <td className="p-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50">
                      {getRankIcon(index + 1)}
                    </div>
                  </td>
                  <td className="p-3">
                    <p className="font-medium text-gray-900">{mgr.name}</p>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">{areaLabels[mgr.area] || mgr.area}</Badge>
                  </td>
                  <td className="p-3 text-right">
                    <p className="font-bold text-purple-600">
                      R$ {mgr.production.toLocaleString('pt-BR')}
                    </p>
                  </td>
                  <td className="p-3 text-right">
                    <Badge className={
                      mgr.engagement >= 70 
                        ? "bg-green-100 text-green-700" 
                        : mgr.engagement >= 40
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }>
                      {mgr.engagement.toFixed(0)} pts
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {managers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Nenhum gerente com produção registrada
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}