import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, AlertCircle, Clock } from 'lucide-react';
import { getSeverityIcon, getSeverityBadgeClass } from '@/utils/severityCalculator';

export default function ParallelDemandsPanel({ demands, isOpen = true, onDemandClick }) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedTypes, setExpandedTypes] = useState({
    sprint: true,
    pedido: true,
    tarefa: true,
    cronograma: true
  });

  // Recuperar estado de colapso do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('parallel-demands-collapsed');
    if (saved) setCollapsed(JSON.parse(saved));
  }, []);

  const handleCollapse = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    localStorage.setItem('parallel-demands-collapsed', JSON.stringify(newCollapsed));
  };

  const toggleType = (type) => {
    setExpandedTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  // Contar críticos por tipo
  const getCriticalCount = (items) => items.filter(i => i.severity === 'RED').length;
  const getTotalCritical = () =>
    getCriticalCount(demands.sprints) +
    getCriticalCount(demands.pedidosInternos) +
    getCriticalCount(demands.backlogTarefas) +
    getCriticalCount(demands.cronogramaItems);

  const DemandType = ({ label, icon, items, type }) => {
    // Validar dados
    const validItems = Array.isArray(items) ? items : [];
    if (validItems.length === 0) return null;

    const criticalCount = getCriticalCount(validItems);
    const isExpanded = expandedTypes[type];
    const hasCritical = criticalCount > 0;

    return (
      <div className="border-b border-gray-200 last:border-b-0">
        <button
          onClick={() => toggleType(type)}
          className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{icon}</span>
            <span className="text-sm font-medium text-gray-700">{label}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              hasCritical ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'
            }`}>
              {validItems.length}
            </span>
            {hasCritical && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-semibold">
                {criticalCount} crítico{criticalCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {isExpanded && (
          <div className="bg-gray-50 px-3 py-2 space-y-1.5 border-t border-gray-100">
            {validItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onDemandClick?.(type, item.id)}
                className={`w-full text-left px-2.5 py-2 rounded text-xs transition-colors ${
                  item.severity === 'RED'
                    ? 'bg-red-50 hover:bg-red-100 border border-red-200'
                    : item.severity === 'YELLOW'
                    ? 'bg-yellow-50 hover:bg-yellow-100 border border-yellow-200'
                    : 'bg-white hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">
                      {item.title || item.titulo || item.item_nome}
                    </p>
                    {item.dias_para_vencer !== undefined && (
                      <p className={`text-xs mt-0.5 ${
                        item.severity === 'RED' ? 'text-red-700' : 'text-gray-600'
                      }`}>
                        {item.vencido
                          ? `${Math.abs(item.dias_para_vencer)} dias atrasado`
                          : `Vence em ${item.dias_para_vencer} dias`}
                      </p>
                    )}
                    {item.dias_atraso !== undefined && item.dias_atraso > 0 && (
                      <p className="text-xs mt-0.5 text-red-700">
                        {item.dias_atraso} dias atrasado
                      </p>
                    )}
                  </div>
                  <span className="text-lg flex-shrink-0">
                    {getSeverityIcon(item.severity)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed right-4 top-4 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 transition-all ${
      collapsed ? 'h-12' : 'max-h-[80vh]'
    } flex flex-col`}>
      {/* Header */}
      <button
        onClick={handleCollapse}
        className="flex items-center justify-between px-4 py-3 border-b border-gray-200 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold text-gray-900">Demandas Paralelas</h3>
          {getTotalCritical() > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
              {getTotalCritical()}
            </span>
          )}
        </div>
        <button
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label={collapsed ? 'Expandir' : 'Colapsar'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </button>
      </button>

      {/* Content */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto">
          <DemandType
            label="Sprints"
            icon="🔴"
            items={demands.sprints}
            type="sprint"
          />
          <DemandType
            label="Pedidos Internos"
            icon="🟡"
            items={demands.pedidosInternos}
            type="pedido"
          />
          <DemandType
            label="Backlog Tarefas"
            icon="🔵"
            items={demands.backlogTarefas}
            type="tarefa"
          />
          <DemandType
            label="Cronograma"
            icon="⚪"
            items={demands.cronogramaItems}
            type="cronograma"
          />

          {!demands.sprints?.length &&
            !demands.pedidosInternos?.length &&
            !demands.backlogTarefas?.length &&
            !demands.cronogramaItems?.length && (
              <div className="p-4 text-center">
                <p className="text-sm text-gray-600">Nenhuma demanda paralela</p>
              </div>
            )}
        </div>
      )}
    </div>
  );
}