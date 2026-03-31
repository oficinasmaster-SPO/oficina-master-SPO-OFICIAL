/**
 * Detecta suporte a compressão no navegador/servidor
 */
export function getAcceptedEncodings() {
  const encodings = ['gzip'];
  
  // Brotli suportado em navegadores modernos
  if ('CompressionStream' in window) {
    encodings.unshift('br');
  }
  
  return encodings.join(', ');
}

/**
 * Headers padrão para solicitar compressão
 */
export function getCompressionHeaders() {
  return {
    'Accept-Encoding': getAcceptedEncodings(),
  };
}

/**
 * Calcula tamanho comprimido vs original
 * Útil para monitoramento
 */
export function getCompressionRatio(originalSize, compressedSize) {
  if (!originalSize || !compressedSize) return 0;
  return ((1 - compressedSize / originalSize) * 100).toFixed(2);
}

/**
 * Logger para monitoramento de compressão em dev
 */
export function logCompressionStats(url, headers, compressedSize, decompressedSize) {
  if (import.meta.env.DEV) {
    const encoding = headers['content-encoding'] || 'none';
    const ratio = getCompressionRatio(decompressedSize, compressedSize);
    
    console.log(
      `📦 [${encoding.toUpperCase()}] ${url}\n` +
      `  Original: ${(decompressedSize / 1024).toFixed(2)}KB\n` +
      `  Compressed: ${(compressedSize / 1024).toFixed(2)}KB\n` +
      `  Saved: ${ratio}%`
    );
  }
}