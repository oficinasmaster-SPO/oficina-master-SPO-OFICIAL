import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getNavigationForItem } from "./NavigationMapper";
import { toast } from "sonner";

export default function NavigableItemName({ 
  item, 
  workshop, 
  showDependencyWarning = false,
  className = "" 
}) {
  const navigate = useNavigate();
  const navigationInfo = getNavigationForItem(item, workshop);

  const handleNavigate = (e) => {
    e.stopPropagation();
    
    if (!navigationInfo) {
      toast.info("Navegação não configurada para este item");
      return;
    }

    if (showDependencyWarning) {
      toast.warning("Atenção: Esta tarefa possui dependências pendentes");
    }

    navigate(navigationInfo.url);
  };

  if (!navigationInfo) {
    // Modo não navegável - apenas exibe o nome
    return (
      <div className={className}>
        <div className="flex items-center gap-2">
          {item.status === 'concluido' && (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          )}
          {showDependencyWarning && (
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
          )}
          <div>
            <p className="font-medium text-gray-900">{item.item_nome}</p>
            <Badge variant="outline" className="capitalize text-xs mt-1">
              {item.item_tipo}
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  // Modo navegável
  return (
    <div className={`${className} group`}>
      <div className="flex items-center gap-2">
        {item.status === 'concluido' && (
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
        )}
        {showDependencyWarning && (
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900">{item.item_nome}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNavigate}
              className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-50 hover:bg-blue-100 text-blue-700"
              title={navigationInfo.description}
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Executar
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="capitalize text-xs">
              {item.item_tipo}
            </Badge>
            {navigationInfo.label && (
              <span className="text-xs text-gray-500 italic">
                → {navigationInfo.label}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}