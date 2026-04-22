import React, { useState } from "react";
import { ChevronDown, ChevronRight, Package, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function getStatusColor(status) {
  const colors = {
    ativo: 'bg-green-100 text-green-800',
    obsoleto: 'bg-red-100 text-red-800',
    em_revisao: 'bg-yellow-100 text-yellow-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

function getOperationalStatusLabel(status) {
  const labels = {
    em_elaboracao: 'Em Elaboração',
    em_implementacao: 'Em Implementação',
    em_auditoria: 'Em Auditoria',
    em_melhoria_continua: 'Melhoria Contínua',
    operacional: 'Operacional',
  };
  return labels[status] || status?.replace(/_/g, ' ') || '';
}

function getOperationalStatusColor(status) {
  const colors = {
    em_elaboracao: 'bg-blue-100 text-blue-800',
    em_implementacao: 'bg-purple-100 text-purple-800',
    em_auditoria: 'bg-orange-100 text-orange-800',
    em_melhoria_continua: 'bg-teal-100 text-teal-800',
    operacional: 'bg-green-100 text-green-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

function ProcessRow({ process, onSelectProcess }) {
  return (
    <div
      onClick={() => onSelectProcess(process)}
      className="flex items-center gap-3 p-3 rounded-lg border hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {process.code && (
            <span className="font-mono text-xs font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
              {process.code}
            </span>
          )}
          <span className="text-gray-900 font-medium truncate">{process.title}</span>
          {process.subcategory && (
            <Badge variant="outline" className="text-xs text-blue-700 border-blue-200 bg-blue-50 flex items-center gap-1">
              <Tag className="w-2.5 h-2.5" />
              {process.subcategory}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {process.status && (
            <Badge className={cn("text-xs", getStatusColor(process.status))} variant="outline">
              {process.status}
            </Badge>
          )}
          {process.operational_status && (
            <Badge className={cn("text-xs", getOperationalStatusColor(process.operational_status))} variant="outline">
              {getOperationalStatusLabel(process.operational_status)}
            </Badge>
          )}
          {process.child_its_count > 0 && (
            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">{process.child_its_count} ITs</Badge>
          )}
          {process.indicators_count > 0 && (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">{process.indicators_count} KPIs</Badge>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AreaGroupedView({ areas, processes, onSelectProcess }) {
  const [expandedAreas, setExpandedAreas] = React.useState([]);
  const [expandedSubcats, setExpandedSubcats] = React.useState({});

  const toggleArea = (areaId) => {
    setExpandedAreas(prev =>
      prev.includes(areaId) ? prev.filter(id => id !== areaId) : [...prev, areaId]
    );
  };

  const toggleSubcat = (areaId, subcat) => {
    const key = `${areaId}__${subcat}`;
    setExpandedSubcats(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getProcessesForArea = (areaId) =>
    areaId === 'sem_area' ? processes.filter(p => !p.area_id) : processes.filter(p => p.area_id === areaId);

  const processesWithoutArea = processes.filter(p => !p.area_id);

  return (
    <div className="space-y-3">
      {processesWithoutArea.length > 0 && (
        <div className="border rounded-lg bg-white overflow-hidden">
          <button
            onClick={() => toggleArea('sem_area')}
            className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
          >
            {expandedAreas.includes('sem_area') ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-200">
              <Package className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-gray-900">Sem Área Definida</h3>
              <p className="text-sm text-gray-500">Processos aguardando categorização</p>
            </div>
            <Badge variant="secondary">{processesWithoutArea.length} MAP{processesWithoutArea.length > 1 ? 's' : ''}</Badge>
          </button>
          {expandedAreas.includes('sem_area') && (
            <div className="px-4 pb-4 space-y-2">
              {processesWithoutArea.map(p => <ProcessRow key={p.id} process={p} onSelectProcess={onSelectProcess} />)}
            </div>
          )}
        </div>
      )}

      {areas.map((area) => {
        const isExpanded = expandedAreas.includes(area.id);
        const areaProcesses = getProcessesForArea(area.id);
        if (areaProcesses.length === 0) return null;

        // Group by subcategory
        const subcatMap = {};
        const noSubcat = [];
        areaProcesses.forEach(p => {
          if (p.subcategory) {
            if (!subcatMap[p.subcategory]) subcatMap[p.subcategory] = [];
            subcatMap[p.subcategory].push(p);
          } else {
            noSubcat.push(p);
          }
        });
        const hasSubcats = Object.keys(subcatMap).length > 0;

        return (
          <div key={area.id} className="border rounded-lg bg-white overflow-hidden shadow-sm">
            {/* Area header */}
            <button
              onClick={() => toggleArea(area.id)}
              className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
            >
              {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: area.color || '#3b82f6' }}>
                <Package className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <h3 className="font-semibold text-gray-900">{area.name}</h3>
                {area.description && <p className="text-sm text-gray-500 truncate">{area.description}</p>}
              </div>
              <Badge variant="secondary">{areaProcesses.length} MAP{areaProcesses.length > 1 ? 's' : ''}</Badge>
            </button>

            {isExpanded && (
              <div className="border-t bg-gray-50 px-4 py-3 space-y-3">
                {/* Processes without subcategory */}
                {noSubcat.map(p => <ProcessRow key={p.id} process={p} onSelectProcess={onSelectProcess} />)}

                {/* Grouped by subcategory */}
                {Object.entries(subcatMap).map(([subcat, subProcesses]) => {
                  const key = `${area.id}__${subcat}`;
                  const isSubExpanded = expandedSubcats[key] !== false; // default open

                  return (
                    <div key={subcat} className="border rounded-lg bg-white overflow-hidden">
                      <button
                        onClick={() => toggleSubcat(area.id, subcat)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors"
                      >
                        {isSubExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                        <Tag className="w-3.5 h-3.5 flex-shrink-0" style={{ color: area.color || '#3b82f6' }} />
                        <span className="text-sm font-medium text-gray-700 flex-1 text-left">{subcat}</span>
                        <Badge variant="outline" className="text-xs">{subProcesses.length}</Badge>
                      </button>
                      {isSubExpanded && (
                        <div className="px-3 pb-3 space-y-2">
                          {subProcesses.map(p => <ProcessRow key={p.id} process={p} onSelectProcess={onSelectProcess} />)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}