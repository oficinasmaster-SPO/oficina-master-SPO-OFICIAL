import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function SaturacaoLegendaModal({ open, onOpenChange }) {
  const niveis = [
    { label: 'Crítico', range: '>150%', cor: 'bg-red-600', desc: 'Sobrecarga severa' },
    { label: 'Alto', range: '100-150%', cor: 'bg-orange-600', desc: 'Sobrecarga' },
    { label: 'Médio', range: '70-100%', cor: 'bg-yellow-600', desc: 'Capacidade boa' },
    { label: 'Baixo', range: '<70%', cor: 'bg-green-600', desc: 'Capacidade disponível' }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Como funciona o cálculo de saturação</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold mb-2">Fórmula</p>
            <p className="text-sm bg-gray-100 p-3 rounded font-mono">
              Saturação = (Horas Atendimentos + Horas Tarefas) / 40h × 100
            </p>
            <p className="text-xs text-gray-600 mt-2">+ Ajuste: +20% por cada tarefa vencida</p>
          </div>

          <div>
            <p className="text-sm font-semibold mb-3">Níveis de Saturação</p>
            <div className="space-y-3">
              {niveis.map((nivel) => (
                <div key={nivel.label} className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className={`w-4 h-4 rounded-full ${nivel.cor} mt-1`}></div>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-900">{nivel.label}: {nivel.range}</p>
                    <p className="text-sm text-gray-600">{nivel.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <p className="text-xs text-blue-900">
              <strong>Nota:</strong> A saturação indica o percentual de horas disponíveis que o consultor está utilizando. 
              Valores acima de 100% indicam sobrecarga, enquanto valores abaixo de 70% indicam capacidade disponível.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}