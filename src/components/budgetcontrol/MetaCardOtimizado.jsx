import React, { useMemo, memo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

/**
 * Card de meta otimizado com memoização
 * Evita re-renderizações desnecessárias
 */
const MetaCardOtimizado = memo(function MetaCardOtimizado({ meta, onClick }) {
  // Memoização de cálculos
  const status = useMemo(() => {
    if (!meta.meta_fixa_rs || !meta.faturamento_meta_rs) return 'neutro';
    const pct = (meta.meta_fixa_rs / meta.faturamento_meta_rs * 100);
    if (pct >= 100) return 'acima';
    if (pct >= 80) return 'dentro';
    return 'abaixo';
  }, [meta.meta_fixa_rs, meta.faturamento_meta_rs]);

  const corStatus = useMemo(() => {
    switch (status) {
      case 'acima': return 'bg-green-100 text-green-800';
      case 'dentro': return 'bg-blue-100 text-blue-800';
      default: return 'bg-red-100 text-red-800';
    }
  }, [status]);

  const iconeStatus = useMemo(() => {
    switch (status) {
      case 'acima': return <TrendingUp className="w-4 h-4" />;
      case 'dentro': return <Minus className="w-4 h-4" />;
      default: return <TrendingDown className="w-4 h-4" />;
    }
  }, [status]);

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => onClick(meta)}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="truncate">{meta.item}</span>
          <Badge className={corStatus}>{iconeStatus}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Meta:</span>
            <span className="font-medium">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(meta.meta_fixa_rs || 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Realizado:</span>
            <span className="font-medium">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(meta.faturamento_meta_rs || 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Atingimento:</span>
            <span className="font-medium">
              {((meta.meta_fixa_rs / meta.faturamento_meta_rs * 100) || 0).toFixed(1)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

/**
 * Lista virtualizada de metas
 * Performance: renderiza apenas itens visíveis
 */
export function ListaMetasVirtualizada({ metas, onMetaClick }) {
  const ITEM_HEIGHT = 120;
  const CONTAINER_HEIGHT = 600;

  // Virtualização simples (em produção usar react-window)
  const [visibleRange, setVisibleRange] = React.useState({ start: 0, end: 20 });

  React.useEffect(() => {
    const handleScroll = (e) => {
      const scrollTop = e.target.scrollTop;
      const startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
      const visibleCount = Math.ceil(CONTAINER_HEIGHT / ITEM_HEIGHT) + 5;
      const endIndex = Math.min(startIndex + visibleCount, metas.length);
      setVisibleRange({ start: startIndex, end: endIndex });
    };

    const container = document.getElementById('metas-virtualizadas-container');
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [metas.length]);

  const metasVisiveis = useMemo(() => {
    return metas.slice(visibleRange.start, visibleRange.end);
  }, [metas, visibleRange]);

  const totalHeight = metas.length * ITEM_HEIGHT;

  return (
    <div 
      id="metas-virtualizadas-container"
      className="relative overflow-auto"
      style={{ height: CONTAINER_HEIGHT }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ 
          position: 'absolute', 
          top: visibleRange.start * ITEM_HEIGHT,
          width: '100%' 
        }}>
          {metasVisiveis.map((meta, index) => (
            <div key={meta.id} style={{ height: ITEM_HEIGHT }}>
              <MetaCardOtimizado 
                meta={meta} 
                onClick={onMetaClick}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MetaCardOtimizado;