import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, Settings } from "lucide-react";
import { toast } from "sonner";

export default function CustomReports({ filters }) {
  const [selectedMetrics, setSelectedMetrics] = useState({
    faturamento: true,
    clientes: true,
    ticketMedio: false,
    lucro: false,
    diagnosticos: false,
    colaboradores: false,
    tcmp2: false
  });

  const metrics = [
    { key: 'faturamento', label: 'Faturamento (Peças + Serviços)' },
    { key: 'clientes', label: 'Volume de Clientes' },
    { key: 'ticketMedio', label: 'Ticket Médio' },
    { key: 'lucro', label: 'Lucro e Rentabilidade' },
    { key: 'diagnosticos', label: 'Evolução de Diagnósticos' },
    { key: 'colaboradores', label: 'Performance de Colaboradores' },
    { key: 'tcmp2', label: 'TCMP² e Indicadores' }
  ];

  const handleToggle = (key) => {
    setSelectedMetrics(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGenerateCustomReport = () => {
    const selected = Object.keys(selectedMetrics).filter(k => selectedMetrics[k]);
    
    if (selected.length === 0) {
      toast.error("Selecione pelo menos uma métrica");
      return;
    }

    toast.success(`Gerando relatório customizado com ${selected.length} métricas...`);
    // Implementação futura: gerar relatório com métricas selecionadas
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-600" />
            Configure seu Relatório Personalizado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metrics.map(metric => (
              <div key={metric.key} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                <Checkbox
                  id={metric.key}
                  checked={selectedMetrics[metric.key]}
                  onCheckedChange={() => handleToggle(metric.key)}
                />
                <Label htmlFor={metric.key} className="cursor-pointer">
                  {metric.label}
                </Label>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t">
            <div className="flex gap-3">
              <Button onClick={handleGenerateCustomReport} className="bg-purple-600 hover:bg-purple-700">
                <Download className="w-4 h-4 mr-2" />
                Gerar Relatório
              </Button>
              <Button variant="outline" onClick={() => setSelectedMetrics({
                faturamento: true,
                clientes: true,
                ticketMedio: true,
                lucro: true,
                diagnosticos: true,
                colaboradores: true,
                tcmp2: true
              })}>
                Selecionar Todos
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Dica: Relatórios Customizados</h3>
          <p className="text-sm text-blue-800">
            Selecione as métricas que deseja incluir no seu relatório personalizado. 
            Os dados serão filtrados de acordo com os filtros gerais definidos acima.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}