import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Play, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getNavigationForItem } from "./NavigationMapper";
import { toast } from "sonner";

export default function QuickActionButtons({ item, workshop, compact = false }) {
  const navigate = useNavigate();
  const navigationInfo = getNavigationForItem(item, workshop);

  if (!navigationInfo) return null;

  const handleExecute = (e) => {
    e.stopPropagation();
    
    if (item.status === 'concluido') {
      toast.success('Este item já está concluído!');
    }
    
    navigate(navigationInfo.url);
  };

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleExecute}
        className="h-8 px-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        title={navigationInfo.description}
      >
        <Play className="w-3 h-3 mr-1" />
        Executar
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExecute}
        className="border-blue-300 text-blue-700 hover:bg-blue-50"
      >
        <ExternalLink className="w-4 h-4 mr-2" />
        {navigationInfo.label}
      </Button>
      
      {item.status === 'a_fazer' && (
        <Badge variant="outline" className="text-xs text-orange-600">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Não iniciado
        </Badge>
      )}
      
      {item.status === 'concluido' && (
        <Badge className="bg-green-100 text-green-700 text-xs">
          ✅ Concluído
        </Badge>
      )}
    </div>
  );
}