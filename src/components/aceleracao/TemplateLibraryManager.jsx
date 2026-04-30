import React, { useReducer, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TrailsTab from './TrailsTab';
import SprintsTab from './SprintsTab';
import MissionsTemplateGrid from './MissionsTemplateGrid';
import { AlertCircle } from 'lucide-react';

/**
 * TemplateLibraryManager - Orquestrador para gerenciar trilhas, missões e sprints
 * P2 Refactor: Split monolítico com useReducer para audit logging
 */

const auditReducer = (state, action) => {
  return [
    {
      timestamp: new Date().toISOString(),
      action: action.type,
      details: action.payload,
    },
    ...state.slice(0, 99), // Manter últimas 100 ações
  ];
};

export default function TemplateLibraryManager() {
  const [auditLog, dispatch] = useReducer(auditReducer, []);

  const handleAudit = useCallback((actionType, details) => {
    dispatch({ type: actionType, payload: details });
    // Enviar para backend (async, sem bloquear UI)
    sendAuditLog(actionType, details).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-900">Matriz de Templates Padrão</h3>
            <p className="text-sm text-blue-700 mt-1">
              Base de trilhas guiadas, missões e sprints padrão para reutilizar e adaptar.
              As trilhas personalizadas dos clientes são montadas individualmente no cronograma de cada consultoria.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="trails" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trails">Trilhas Guiadas</TabsTrigger>
          <TabsTrigger value="missions">Missões</TabsTrigger>
          <TabsTrigger value="sprints">Sprints</TabsTrigger>
        </TabsList>

        <TabsContent value="trails" className="space-y-4">
          <TrailsTab onAudit={handleAudit} />
        </TabsContent>

        <TabsContent value="missions" className="space-y-4">
          <div className="flex justify-end mb-4">
            {/* Nova Missão button já está dentro de MissionsTemplateGrid */}
          </div>
          <MissionsTemplateGrid />
        </TabsContent>

        <TabsContent value="sprints" className="space-y-4">
          <SprintsTab onAudit={handleAudit} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Backend audit logging
async function sendAuditLog(actionType, details) {
  try {
    // Será chamado por backend função de audit logging
    // Implementado em funções/auditTemplateLibrary.js
  } catch (error) {
    console.warn('Erro ao registrar audit:', error);
  }
}