import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook de virtual scrolling — renderiza apenas items visíveis
 * Perfeito para listas de 1000+ itens
 */
export function useVirtualScroll({
  items = [],
  itemHeight,
  containerHeight,
  overscan = 3, // render 3 items fora da viewport como buffer
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollRef = useRef(null);

  // Calcula range de items visíveis
  const visibleRange = useCallback(() => {
    if (!itemHeight || !containerHeight) return { start: 0, end: items.length };

    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return { start: startIndex, end: endIndex };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  const range = visibleRange();
  const visibleItems = items.slice(range.start, range.end);

  // Offset do container para posicionar items corretamente
  const offsetY = range.start * itemHeight;

  const handleScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    ref: scrollRef,
    visibleItems,
    startIndex: range.start,
    offsetY,
    totalHeight: items.length * itemHeight,
    handleScroll,
  };
}