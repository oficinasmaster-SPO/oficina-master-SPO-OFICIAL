import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, CheckCircle, AlertCircle, Info, Lock } from "lucide-react";
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
      toast.info(
        `📌 Item "${item.item_nome}" não possui tela específica vinculada`,
        { description: "Configure este item no painel administrativo" }
      );
      return;
    }

    if (showDependencyWarning) {
      const confirmAction = window.confirm(
        `⚠️ ATENÇÃO\n\nEsta tarefa possui dependências pendentes.\nRecomenda-se concluí-las antes.\n\nDeseja continuar mesmo assim?`
      );
      if (!confirmAction) return;
    }

    try {
      if (navigationInfo.isFallback) {
        toast.info(
          `Redirecionando para tela genérica: ${navigationInfo.label}`,
          { description: navigationInfo.description }
        );
      }
      
      navigate(navigationInfo.url);
    } catch (error) {
      console.error('Erro ao navegar:', error);
      toast.error('Erro ao abrir a tela. Tente novamente.');
    }
  };

  const handleNonNavigableClick = (e) => {
    e.stopPropagation();
    toast.warning(
      `Item "${item.item_nome}" não possui ação direta`,
      { 
        description: "Este conteúdo não está vinculado a uma tela específica do sistema",
        duration: 4000
      }
    );
  };

  // Renderização para item não navegável
  if (!navigationInfo) {
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
                onClick={handleNonNavigableClick}
                className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500"
              >
                <Info className="w-3 h-3 mr-1" />
                Info
              </Button>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="capitalize text-xs">
                {item.item_tipo || 'item'}
              </Badge>
              <Badge variant="outline" className="text-xs text-gray-500">
                <Lock className="w-3 h-3 mr-1" />
                Sem navegação direta
              </Badge>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Renderização para item navegável
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
              className={`h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity ${
                navigationInfo.isFallback 
                  ? 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700' 
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
              }`}
              title={navigationInfo.description}
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              {showDependencyWarning ? 'Executar (com aviso)' : 'Executar'}
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className="capitalize text-xs">
              {item.item_tipo || 'item'}
            </Badge>
            {navigationInfo.isFallback && (
              <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">
                ⚠️ Tela genérica
              </Badge>
            )}
            <span className="text-xs text-gray-500 italic truncate max-w-[300px]">
              {navigationInfo.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}