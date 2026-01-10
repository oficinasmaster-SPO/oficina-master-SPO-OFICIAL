import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";

export default function SaturacaoLegenda({ onVisualize }) {
  const niveis = [
    { label: 'Crítico', range: '>150%', cor: 'bg-red-600', desc: 'Sobrecarga severa' },
    { label: 'Alto', range: '100-150%', cor: 'bg-orange-600', desc: 'Sobrecarga' },
    { label: 'Médio', range: '70-100%', cor: 'bg-yellow-600', desc: 'Capacidade boa' },
    { label: 'Baixo', range: '<70%', cor: 'bg-green-600', desc: 'Capacidade disponível' }
  ];

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm text-blue-900">Legenda de Saturação</h3>
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={onVisualize}
          className="text-blue-600 hover:text-blue-800 h-auto p-1"
        >
          <Info className="w-4 h-4 mr-1" />
          Visualizar
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {niveis.map((nivel) => (
          <div key={nivel.label} className="flex items-center gap-2 text-xs">
            <div className={`w-3 h-3 rounded-full ${nivel.cor}`}></div>
            <div>
              <p className="font-semibold text-gray-900">{nivel.label}</p>
              <p className="text-gray-600">{nivel.range}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}