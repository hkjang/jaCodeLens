'use client';

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';

interface VirtualListProps<T> {
  items: T[];
  height?: number;
  itemHeight?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscanCount?: number;
  emptyMessage?: string;
}

/**
 * VirtualList - Efficiently render large lists with virtual scrolling
 * Uses native scroll and CSS to only render visible items
 */
export default function VirtualList<T>({
  items,
  height = 400,
  itemHeight = 60,
  renderItem,
  className = '',
  overscanCount = 5,
  emptyMessage = 'No items to display'
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Calculate visible range with overscan
  const { startIndex, endIndex, visibleItems, offsetY } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscanCount);
    const end = Math.min(
      items.length,
      Math.ceil((scrollTop + height) / itemHeight) + overscanCount
    );
    
    return {
      startIndex: start,
      endIndex: end,
      visibleItems: items.slice(start, end),
      offsetY: start * itemHeight
    };
  }, [scrollTop, itemHeight, height, items, overscanCount]);

  if (items.length === 0) {
    return (
      <div 
        className={`flex items-center justify-center text-gray-400 ${className}`} 
        style={{ height }}
      >
        {emptyMessage}
      </div>
    );
  }

  const totalHeight = items.length * itemHeight;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-auto ${className}`}
      style={{ height }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, i) => (
            <div 
              key={startIndex + i} 
              style={{ height: itemHeight }}
            >
              {renderItem(item, startIndex + i)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to determine if virtual scrolling should be used based on item count
 */
export function useVirtualScrollThreshold(itemCount: number, threshold = 100): boolean {
  return itemCount > threshold;
}


