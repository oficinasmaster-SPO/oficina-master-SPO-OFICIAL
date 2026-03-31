import { getCompressionHeaders, logCompressionStats } from '@/lib/compressionUtils';

/**
 * Interceptor para adicionar headers de compressão automaticamente
 * Funciona com axios ou fetch
 */
export function setupCompressionInterceptor(axiosInstance) {
  // Request interceptor: adiciona Accept-Encoding
  axiosInstance.interceptors.request.use((config) => {
    return {
      ...config,
      headers: {
        ...config.headers,
        ...getCompressionHeaders(),
      },
    };
  });

  // Response interceptor: monitora compressão
  axiosInstance.interceptors.response.use((response) => {
    if (import.meta.env.DEV) {
      const contentEncoding = response.headers['content-encoding'];
      const contentLength = response.headers['content-length'];
      const originalSize = response.data?.length || 0;

      if (contentEncoding && contentLength) {
        logCompressionStats(
          response.config.url,
          { 'content-encoding': contentEncoding },
          parseInt(contentLength, 10),
          originalSize
        );
      }
    }

    return response;
  });

  return axiosInstance;
}

/**
 * Wrapper para fetch com compressão automática
 */
export async function fetchWithCompression(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...getCompressionHeaders(),
    },
  });

  if (import.meta.env.DEV) {
    logCompressionStats(
      url,
      Object.fromEntries(response.headers.entries()),
      response.headers.get('content-length') || 0,
      (await response.clone().text()).length
    );
  }

  return response;
}