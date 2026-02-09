import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Play, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getNavigationForItem } from "./NavigationMapper";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function QuickActionButtons({ item, workshop, compact = false }) {
  const navigate = useNavigate();
  const navigationInfo = getNavigationForItem(item, workshop);

  const handleExecute = (e) => {
    if (e) e.stopPropagation();
    
    if (!navigationInfo) {
      toast.warning(
        `Item "${item.item_nome}" não possui navegação direta`,
        { description: "Configure o mapeamento deste conteúdo no sistema" }
      );
      return;
    }

    try {
      if (item.status === 'concluido') {
        const confirmReopen = window.confirm(
          `✅ Este item já está concluído.\n\nDeseja reabrir para edição?`
        );
        if (!confirmReopen) return;
      }

      if (navigationInfo.isFallback) {
        toast.info(
          `Navegando para tela genérica: ${navigationInfo.label}`,
          { description: navigationInfo.description, duration: 3000 }
        );
      }
      
      navigate(navigationInfo.url);
    } catch (error) {
      console.error('Erro na navegação:', error);
      toast.error('Falha ao abrir a tela. Verifique sua conexão.');
    }
  };

  if (compact) {
    if (!navigationInfo) {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            toast.info("Este item não possui tela específica vinculada");
          }}
          className="h-8 px-3 text-gray-400 hover:text-gray-600"
          disabled
        >
          <Info className="w-3 h-3 mr-1" />
          Sem ação
        </Button>
      );
    }

    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleExecute}
        className={`h-8 px-3 ${
          navigationInfo.isFallback
            ? 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50'
            : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
        }`}
        title={navigationInfo.description}
      >
        <Play className="w-3 h-3 mr-1" />
        Executar
      </Button>
    );
  }

  // Modo expandido
  if (!navigationInfo) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2 text-gray-600">
          <Info className="w-5 h-5" />
          <div>
            <p className="text-sm font-medium">Navegação não disponível</p>
            <p className="text-xs text-gray-500 mt-1">
              Este item não possui tela específica no sistema
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleExecute}
        className={`w-full justify-start ${
          navigationInfo.isFallback
            ? 'bg-yellow-600 hover:bg-yellow-700'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        <ExternalLink className="w-4 h-4 mr-2" />
        {navigationInfo.label}
      </Button>
      
      <div className="flex items-center gap-2 flex-wrap">
        {navigationInfo.isFallback && (
          <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Tela genérica
          </Badge>
        )}
        
        {item.status === 'a_fazer' && (
          <Badge variant="outline" className="text-xs text-orange-600">
            ⚪ Não iniciado
          </Badge>
        )}
        
        {item.status === 'em_andamento' && (
          <Badge className="bg-blue-100 text-blue-700 text-xs">
            🟡 Em andamento
          </Badge>
        )}
        
        {item.status === 'concluido' && (
          <Badge className="bg-green-100 text-green-700 text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            Concluído
          </Badge>
        )}
      </div>
      
      <p className="text-xs text-gray-500 italic">{navigationInfo.description}</p>
    </div>
  );
}