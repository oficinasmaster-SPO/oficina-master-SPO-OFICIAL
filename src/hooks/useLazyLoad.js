import { useEffect, useRef, useState } from 'react';

/**
 * Hook de lazy loading com Intersection Observer
 * Fallback: se não suportado, carrega imediatamente
 */
export function useLazyLoad() {
  const ref = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    // Suportado?
    if (!('IntersectionObserver' in window)) {
      setIsLoaded(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsLoaded(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '50px' } // Começa a carregar 50px antes de entrar no viewport
    );

    observer.observe(ref.current);

    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, []);

  return { ref, isLoaded };
}