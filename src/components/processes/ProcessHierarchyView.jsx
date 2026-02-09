import React from "react";
import { ChevronRight, ChevronDown, FileText, FileCheck, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function ProcessHierarchyView({ maps, its, onSelectMap, onSelectIT }) {
  const [expandedMaps, setExpandedMaps] = React.useState([]);

  const toggleMap = (mapId) => {
    setExpandedMaps(prev =>
      prev.includes(mapId) ? prev.filter(id => id !== mapId) : [...prev, mapId]
    );
  };

  const getITsForMap = (mapId) => {
    return its.filter(it => it.parent_map_id === mapId);
  };

  const getTypeIcon = (type) => {
    if (type === 'IT') return FileCheck;
    if (type === 'FR') return ClipboardList;
    return FileText;
  };

  return (
    <div className="space-y-2">
      {maps.map((map) => {
        const isExpanded = expandedMaps.includes(map.id);
        const childITs = getITsForMap(map.id);

        return (
          <div key={map.id} className="border rounded-lg bg-white">
            <div className="flex items-center gap-2 p-3 hover:bg-gray-50 cursor-pointer" onClick={() => toggleMap(map.id)}>
              <button className="p-1">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </button>
              <FileText className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{map.code || "MAP"}</span>
                  <span className="text-gray-700">{map.title}</span>
                  {childITs.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {childITs.length} IT{childITs.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectMap(map);
                }}
              >
                Ver Detalhes
              </Button>
            </div>

            {isExpanded && childITs.length > 0 && (
              <div className="pl-12 pr-3 pb-3 space-y-1">
                {childITs.map((it) => {
                  const Icon = getTypeIcon(it.type);
                  return (
                    <div
                      key={it.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-blue-50 cursor-pointer"
                      onClick={() => onSelectIT(it)}
                    >
                      <Icon className={cn(
                        "w-4 h-4",
                        it.type === 'IT' ? "text-green-600" : "text-orange-600"
                      )} />
                      <span className="text-sm font-mono text-gray-600">{it.code}</span>
                      <span className="text-sm text-gray-700">{it.title}</span>
                      <Badge variant="outline" className="text-xs ml-auto">
                        {it.type}
                      </Badge>
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