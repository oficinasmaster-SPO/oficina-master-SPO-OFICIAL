import React, { useState } from 'react';
import { useLazyLoad } from '@/hooks/useLazyLoad';
import { getOptimizedImageUrl } from '@/lib/imageOptimizer';

/**
 * Componente de imagem otimizado
 * - Lazy loading automático
 * - WebP com fallback
 * - Skeleton loader enquanto carrega
 * - Responsive
 */
export default function OptimizedImage({
  src,
  alt = '',
  width,
  height,
  className = '',
  loading = 'lazy', // 'lazy' | 'eager'
  fit = 'cover', // 'cover' | 'contain'
  fallback = null,
  onLoad,
  ...props
}) {
  const { ref, isLoaded } = useLazyLoad();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  // Gerar URL otimizada (WebP se suportado, senão original)
  const optimizedUrl = loading === 'lazy' ? getOptimizedImageUrl(src) : src;
  const shouldLoad = loading === 'eager' || isLoaded;

  const handleLoad = () => {
    setImageLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setImageFailed(true);
    // Fallback: recarregar com URL original se WebP falhar
    if (optimizedUrl !== src && !imageFailed) {
      setImageLoaded(false);
    }
  };

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden bg-gray-100 ${className}`}
      style={{
        aspectRatio: width && height ? `${width}/${height}` : undefined,
      }}
    >
      {/* Skeleton while loading */}
      {!imageLoaded && !imageFailed && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}

      {/* Imagem principal */}
      {shouldLoad && (
        <>
          {/* WebP com fallback */}
          <picture>
            <source 
              srcSet={optimizedUrl.replace(/\.[^/.]+$/, '.webp')}
              type="image/webp"
            />
            <img
              src={imageFailed ? src : optimizedUrl}
              alt={alt}
              width={width}
              height={height}
              loading={loading}
              onLoad={handleLoad}
              onError={handleError}
              className={`w-full h-full object-${fit} transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              {...props}
            />
          </picture>
        </>
      )}

      {/* Fallback se não conseguir carregar */}
      {imageFailed && fallback && <div>{fallback}</div>}
    </div>
  );
}