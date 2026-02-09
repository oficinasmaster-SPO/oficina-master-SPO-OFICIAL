import React from "react";
import { Trophy, Award, Medal } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function RankingTable({ data, type = "faturamento" }) {
  const getRankIcon = (position) => {
    if (position === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (position === 2) return <Award className="w-5 h-5 text-gray-400" />;
    if (position === 3) return <Medal className="w-5 h-5 text-orange-500" />;
    return <span className="text-sm font-bold text-gray-600">{position}</span>;
  };

  const formatValue = (value, type) => {
    if (type === "faturamento" || type === "ticket") {
      return `R$ ${value.toLocaleString()}`;
    }
    if (type === "percentage") {
      return `${value.toFixed(1)}%`;
    }
    return value;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="text-left p-3 font-semibold text-gray-700 w-16">Pos.</th>
            <th className="text-left p-3 font-semibold text-gray-700">Oficina</th>
            <th className="text-left p-3 font-semibold text-gray-700">Estado</th>
            <th className="text-left p-3 font-semibold text-gray-700">Segmento</th>
            <th className="text-right p-3 font-semibold text-gray-700">Valor</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr 
              key={index} 
              className={`border-b hover:bg-gray-50 transition-colors ${
                index < 3 ? 'bg-gradient-to-r from-yellow-50 to-transparent' : ''
              }`}
            >
              <td className="p-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50">
                  {getRankIcon(index + 1)}
                </div>
              </td>
              <td className="p-3">
                <p className="font-medium text-gray-900">{item.name}</p>
              </td>
              <td className="p-3">
                <Badge variant="outline">{item.state}</Badge>
              </td>
              <td className="p-3">
                <span className="text-sm text-gray-600">{item.segment}</span>
              </td>
              <td className="p-3 text-right">
                <p className="font-bold text-gray-900">
                  {formatValue(item.value, type)}
                </p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}