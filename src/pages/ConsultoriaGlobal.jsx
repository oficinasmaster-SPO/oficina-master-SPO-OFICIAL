import React from 'react';
import TemplateLibraryManager from '@/components/aceleracao/TemplateLibraryManager';

/**
 * ConsultoriaGlobal - Painel de Gerenciamento de Templates Padrão
 * 
 * Matriz consolidada de todas as trilhas, missões e sprints
 * existentes de todos os clientes para ser usada como referência
 * e base para criar novos templates padrão.
 */
export default function ConsultoriaGlobal() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Consultoria Global - Matriz de Templates</h1>
        <p className="text-gray-600 mt-2">
          Gerencie trilhas, missões e sprints padrão para replicação em novos clientes
        </p>
      </div>

      <TemplateLibraryManager />
    </div>
  );
}