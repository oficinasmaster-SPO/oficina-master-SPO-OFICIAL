import React from "react";
import { ChevronDown, ChevronRight, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function AreaGroupedView({ areas, processes, onSelectProcess }) {
  const [expandedAreas, setExpandedAreas] = React.useState([]);

  const toggleArea = (areaId) => {
    setExpandedAreas(prev =>
      prev.includes(areaId) ? prev.filter(id => id !== areaId) : [...prev, areaId]
    );
  };

  const getProcessesForArea = (areaId) => {
    return processes.filter(p => p.area_id === areaId);
  };

  const getStatusColor = (status) => {
    const colors = {
      'ativo': 'bg-green-100 text-green-800',
      'obsoleto': 'bg-red-100 text-red-800',
      'em_revisao': 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getOperationalStatusColor = (status) => {
    const colors = {
      'em_elaboracao': 'bg-blue-100 text-blue-800',
      'em_implementacao': 'bg-purple-100 text-purple-800',
      'em_auditoria': 'bg-orange-100 text-orange-800',
      'em_melhoria_continua': 'bg-teal-100 text-teal-800',
      'operacional': 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-3">
      {areas.map((area) => {
        const isExpanded = expandedAreas.includes(area.id);
        const areaProcesses = getProcessesForArea(area.id);

        if (areaProcesses.length === 0) return null;

        return (
          <div key={area.id} className="border rounded-lg bg-white overflow-hidden">
            <button
              onClick={() => toggleArea(area.id)}
              className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-500" />
              )}
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: area.color || '#3b82f6' }}
              >
                <Package className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-900">{area.name}</h3>
                <p className="text-sm text-gray-600">{area.description}</p>
              </div>
              <Badge variant="secondary">
                {areaProcesses.length} MAP{areaProcesses.length > 1 ? 's' : ''}
              </Badge>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 space-y-2">
                {areaProcesses.map((process) => (
                  <div
                    key={process.id}
                    onClick={() => onSelectProcess(process)}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-semibold text-gray-700">
                          {process.code}
                        </span>
                        <span className="text-gray-900">{process.title}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge className={getStatusColor(process.status)} variant="outline">
                          {process.status}
                        </Badge>
                        {process.operational_status && (
                          <Badge className={getOperationalStatusColor(process.operational_status)} variant="outline">
                            {process.operational_status.replace(/_/g, ' ')}
                          </Badge>
                        )}
                        {process.child_its_count > 0 && (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700">
                            {process.child_its_count} ITs
                          </Badge>
                        )}
                        {process.indicators_count > 0 && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            {process.indicators_count} KPIs
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}