import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import DiagnosticoRiscosPanel from '@/components/diagnostico/DiagnosticoRiscosPanel';
import TesteQueriesRiscos from '@/components/diagnostico/TesteQueriesRiscos';
import { useAuth } from '@/lib/AuthContext';
import { useWorkshopContext } from '@/components/hooks/useWorkshopContext';

export default function DiagnosticoRiscos() {
  const { user } = useAuth();
  const { workshop, workshopId } = useWorkshopContext();

  if (!workshopId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Nenhuma oficina selecionada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow-sm border-b p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">🔬 Diagnóstico - Fase 1</h1>
          <p className="text-gray-600 mt-2">
            Validação de dados: Riscos & Oportunidades
          </p>
          {workshop && (
            <p className="text-sm text-gray-500 mt-1">
              Oficina: <strong>{workshop.name}</strong>
            </p>
          )}
        </div>

        <DiagnosticoRiscosPanel workshopId={workshopId} />

        <div className="mt-12 pt-8 border-t">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📋 Testes de Queries (QA)</h2>
          <TesteQueriesRiscos workshopId={workshopId} />
        </div>
      </div>
    </div>
  );
}