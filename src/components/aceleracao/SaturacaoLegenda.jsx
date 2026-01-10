import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SaturacaoLegenda({ onShowInfo }) {
  const niveis = [
    { label: 'Crítico', range: '>150%', cor: 'bg-red-600' },
    { label: 'Alto', range: '100-150%', cor: 'bg-orange-600' },
    { label: 'Médio', range: '70-100%', cor: 'bg-yellow-600' },
    { label: 'Baixo', range: '<70%', cor: 'bg-green-600' }
  ];

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm text-blue-900">Legenda de Saturação</h3>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={onShowInfo}
            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
          >
            <HelpCircle className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {niveis.map((nivel) => (
            <div key={nivel.label} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${nivel.cor}`}></div>
              <div className="text-xs">
                <p className="font-semibold text-gray-900">{nivel.label}</p>
                <p className="text-gray-600">{nivel.range}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}