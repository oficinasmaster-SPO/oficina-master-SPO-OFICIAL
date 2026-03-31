import React from 'react';
import { useVirtualScroll } from '@/hooks/useVirtualScroll';

/**
 * Componente de lista virtual — renderiza apenas items visíveis
 * Ideal para listas de 1000+ itens
 *
 * Props:
 * - items: array de items
 * - itemHeight: altura fixa de cada item (px)
 * - height: altura do container (px)
 * - renderItem: função que renderiza cada item
 * - keyExtractor: função para extrair key (padrão: (item, idx) => idx)
 * - className: classes customizadas
 * - overscan: items buffer fora da viewport (padrão: 3)
 * - gap: espaço entre items via CSS (padrão: 0)
 *
 * Exemplo:
 * <VirtualList
 *   items={employees}
 *   itemHeight={60}
 *   height={600}
 *   renderItem={(item) => <EmployeeRow {...item} />}
 *   keyExtractor={(emp) => emp.id}
 * />
 */
export default function VirtualList({
  items = [],
  itemHeight,
  height,
  renderItem,
  keyExtractor = (item, idx) => idx,
  className = '',
  overscan = 3,
  gap = 0,
}) {
  // Hook SEMPRE chamado antes de qualquer early return
  const {
    ref,
    visibleItems,
    startIndex,
    offsetY,
    totalHeight,
    handleScroll,
  } = useVirtualScroll({
    items,
    itemHeight: itemHeight || 1,
    containerHeight: height || 1,
    overscan,
  });

  if (!itemHeight || !height) {
    console.warn('VirtualList: itemHeight e height são obrigatórios');
    return null;
  }

  // Adjust total height se houver gap
  const adjustedItemHeight = itemHeight + gap;
  const adjustedTotalHeight = items.length * adjustedItemHeight;

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      className={`overflow-y-auto ${className}`}
      style={{ height }}
    >
      {/* Spacer top */}
      <div style={{ height: offsetY }} />

      {/* Items visíveis */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px` }}>
        {visibleItems.map((item, idx) => (
          <div
            key={keyExtractor(item, startIndex + idx)}
            style={{
              minHeight: itemHeight,
              flexShrink: 0,
            }}
          >
            {renderItem(item, startIndex + idx)}
          </div>
        ))}
      </div>

      {/* Spacer bottom */}
      <div
        style={{
          height: Math.max(0, adjustedTotalHeight - offsetY - visibleItems.length * adjustedItemHeight),
        }}
      />
    </div>
  );
}

/**
 * Variante com layout em grid (múltiplas colunas)
 */
export function VirtualGrid({
  items = [],
  itemHeight,
  itemWidth,
  height,
  columns,
  renderItem,
  keyExtractor = (item, idx) => idx,
  className = '',
  gap = 8,
  overscan = 1,
}) {
  // Hook SEMPRE chamado antes de qualquer conditional
  const {
    ref,
    visibleItems,
    startIndex,
    offsetY,
    totalHeight,
    handleScroll,
  } = useVirtualScroll({
    items,
    itemHeight: itemHeight + gap || 1,
    containerHeight: height || 1,
    overscan,
  });

  // Calcula altura de uma linha
  const rowHeight = itemHeight + gap;
  const itemsPerRow = columns || Math.floor((height - gap) / (itemWidth + gap));

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      className={`overflow-y-auto ${className}`}
      style={{ height }}
    >
      {/* Spacer top */}
      <div style={{ height: offsetY }} />

      {/* Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${itemsPerRow}, 1fr)`,
          gap: `${gap}px`,
          paddingBottom: gap,
        }}
      >
        {visibleItems.map((item, idx) => (
          <div key={keyExtractor(item, startIndex + idx)}>
            {renderItem(item, startIndex + idx)}
          </div>
        ))}
      </div>

      {/* Spacer bottom */}
      <div style={{ height: Math.max(0, totalHeight - offsetY - visibleItems.length * rowHeight) }} />
    </div>
  );
}