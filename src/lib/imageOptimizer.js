/**
 * Converte URL de imagem para WebP com fallback
 * Ex: "image.jpg" → "image.webp" (se suportado)
 */
export function getOptimizedImageUrl(url, format = 'avif') {
  if (!url) return url;
  
  // Se já é WebP/AVIF, retorna direto
  if (url.includes('.webp') || url.includes('.avif')) return url;
  
  // Não otimizar URLs externas que não sejam do nosso storage ou base64
  if (url.startsWith('http') && !url.includes('storage.base44')) {
    return url;
  }
  if (url.startsWith('data:')) {
    return url;
  }
  
  // Converter extensão local
  const [path, ext] = url.lastIndexOf('.') > -1 
    ? [url.substring(0, url.lastIndexOf('.')), url.substring(url.lastIndexOf('.'))]
    : [url, ''];
  
  return `${path}.${format}`;
}

/**
 * Gera srcSet responsivo
 * Ex: "image.jpg 1x, image@2x.jpg 2x"
 */
export function getResponsiveSrcSet(url) {
  if (!url) return '';
  
  const base = url.substring(0, url.lastIndexOf('.'));
  const ext = url.substring(url.lastIndexOf('.'));
  
  return `${base}${ext} 1x, ${base}@2x${ext} 2x`;
}

/**
 * Calcula aspect ratio automático se possível
 */
export function parseAspectRatio(width, height) {
  if (!width || !height) return null;
  return (height / width * 100).toFixed(2);
}