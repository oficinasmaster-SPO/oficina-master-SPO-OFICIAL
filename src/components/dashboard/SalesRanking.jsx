import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Award, Medal, ShoppingCart } from "lucide-react";

export default function SalesRanking({ employees }) {
  // Filtrar vendedores (vendas e comercial)
  const salespeople = employees
    .filter(emp => (emp.area === 'vendas' || emp.area === 'comercial') && emp.status === 'ativo')
    .map(emp => {
      const totalSales = (emp.production_parts_sales || 0) + (emp.production_services || 0);
      const commission = emp.commission || 0;
      
      return {
        id: emp.id,
        name: emp.full_name,
        position: emp.position,
        area: emp.area,
        sales: totalSales,
        commission: commission,
        workshop_id: emp.workshop_id
      };
    })
    .filter(seller => seller.sales > 0)
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 20);

  const getRankIcon = (position) => {
    if (position === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (position === 2) return <Award className="w-5 h-5 text-gray-400" />;
    if (position === 3) return <Medal className="w-5 h-5 text-orange-500" />;
    return <span className="text-sm font-bold text-gray-600">{position}</span>;
  };

  const areaLabels = {
    vendas: "Vendas",
    comercial: "Comercial"
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-green-600" />
          Ranking Nacional - Vendas
        </CardTitle>
        <CardDescription>Top 20 consultores por faturamento em vendas</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left p-3 font-semibold text-gray-700 w-16">Pos.</th>
                <th className="text-left p-3 font-semibold text-gray-700">Nome</th>
                <th className="text-left p-3 font-semibold text-gray-700">Área</th>
                <th className="text-right p-3 font-semibold text-gray-700">Vendas</th>
                <th className="text-right p-3 font-semibold text-gray-700">Comissão</th>
              </tr>
            </thead>
            <tbody>
              {salespeople.map((seller, index) => (
                <tr 
                  key={seller.id}
                  className={`border-b hover:bg-gray-50 transition-colors ${
                    index < 3 ? 'bg-gradient-to-r from-green-50 to-transparent' : ''
                  }`}
                >
                  <td className="p-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50">
                      {getRankIcon(index + 1)}
                    </div>
                  </td>
                  <td className="p-3">
                    <p className="font-medium text-gray-900">{seller.name}</p>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">{areaLabels[seller.area]}</Badge>
                  </td>
                  <td className="p-3 text-right">
                    <p className="font-bold text-green-600">
                      R$ {seller.sales.toLocaleString('pt-BR')}
                    </p>
                  </td>
                  <td className="p-3 text-right">
                    <span className="text-sm text-gray-600">
                      R$ {seller.commission.toLocaleString('pt-BR')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {salespeople.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Nenhum vendedor com vendas registradas
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}