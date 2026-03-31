import { useEffect, useRef } from 'react';
import { logCompressionStats } from '@/lib/compressionUtils';

/**
 * Hook para monitorar compressão de requisições na página
 * Mostra estatísticas em tempo real em dev
 */
export function useCompressionMonitor(pageName = 'Page') {
  const statsRef = useRef({
    totalRequests: 0,
    compressedRequests: 0,
    totalOriginal: 0,
    totalCompressed: 0,
  });

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    // Interceptar fetch nativo
    const originalFetch = window.fetch;
    window.fetch = function (...args) {
      return originalFetch.apply(this, args).then((response) => {
        const contentEncoding = response.headers.get('content-encoding');
        const contentLength = response.headers.get('content-length');

        if (contentEncoding) {
          statsRef.current.compressedRequests++;
          statsRef.current.totalCompressed += parseInt(contentLength || 0, 10);
        }

        statsRef.current.totalRequests++;

        return response;
      });
    };

    return () => {
      window.fetch = originalFetch;

      // Log summary ao desmontar
      const stats = statsRef.current;
      if (stats.totalRequests > 0) {
        const compressionRate = (
          (stats.compressedRequests / stats.totalRequests) *
          100
        ).toFixed(2);

        console.log(
          `📊 [${pageName}] Compression Summary:\n` +
          `  Total Requests: ${stats.totalRequests}\n` +
          `  Compressed: ${stats.compressedRequests} (${compressionRate}%)\n` +
          `  Total Original: ${(stats.totalOriginal / 1024).toFixed(2)}KB\n` +
          `  Total Compressed: ${(stats.totalCompressed / 1024).toFixed(2)}KB`
        );
      }
    };
  }, [pageName]);
}