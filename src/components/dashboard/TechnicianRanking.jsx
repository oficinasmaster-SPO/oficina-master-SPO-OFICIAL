import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Award, Medal, Wrench } from "lucide-react";

export default function TechnicianRanking({ employees }) {
  // Filtrar apenas técnicos e calcular produtividade
  const technicians = employees
    .filter(emp => emp.area === 'tecnico' && emp.status === 'ativo')
    .map(emp => {
      const totalCost = (emp.salary || 0) + (emp.commission || 0) + (emp.bonus || 0);
      const totalProduction = (emp.production_parts || 0) + (emp.production_services || 0);
      const productivity = totalCost > 0 ? (totalProduction / totalCost) * 100 : 0;
      
      return {
        id: emp.id,
        name: emp.full_name,
        position: emp.position,
        production: totalProduction,
        productivity: productivity,
        workshop_id: emp.workshop_id
      };
    })
    .filter(tech => tech.production > 0)
    .sort((a, b) => b.production - a.production)
    .slice(0, 20);

  const getRankIcon = (position) => {
    if (position === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (position === 2) return <Award className="w-5 h-5 text-gray-400" />;
    if (position === 3) return <Medal className="w-5 h-5 text-orange-500" />;
    return <span className="text-sm font-bold text-gray-600">{position}</span>;
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-blue-600" />
          Ranking Nacional - Técnicos
        </CardTitle>
        <CardDescription>Top 20 técnicos por produção total</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left p-3 font-semibold text-gray-700 w-16">Pos.</th>
                <th className="text-left p-3 font-semibold text-gray-700">Nome</th>
                <th className="text-left p-3 font-semibold text-gray-700">Cargo</th>
                <th className="text-right p-3 font-semibold text-gray-700">Produção</th>
                <th className="text-right p-3 font-semibold text-gray-700">Produtividade</th>
              </tr>
            </thead>
            <tbody>
              {technicians.map((tech, index) => (
                <tr 
                  key={tech.id}
                  className={`border-b hover:bg-gray-50 transition-colors ${
                    index < 3 ? 'bg-gradient-to-r from-blue-50 to-transparent' : ''
                  }`}
                >
                  <td className="p-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50">
                      {getRankIcon(index + 1)}
                    </div>
                  </td>
                  <td className="p-3">
                    <p className="font-medium text-gray-900">{tech.name}</p>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-gray-600">{tech.position}</span>
                  </td>
                  <td className="p-3 text-right">
                    <p className="font-bold text-green-600">
                      R$ {tech.production.toLocaleString('pt-BR')}
                    </p>
                  </td>
                  <td className="p-3 text-right">
                    <Badge className={
                      tech.productivity >= 100 
                        ? "bg-green-100 text-green-700" 
                        : "bg-orange-100 text-orange-700"
                    }>
                      {tech.productivity.toFixed(0)}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {technicians.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Nenhum técnico com produção registrada
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}