import React from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useSmartBack } from '@/components/hooks/useSmartBack';

/**
 * SmartBackButton
 * 
 * Botão "Voltar" inteligente que:
 * - Se existe ?from= → volta exatamente para lá
 * - Senão → usa histórico do navegador
 * - Senão → vai para fallback seguro
 * 
 * Mantém contexto (aba, step, filtro) via query params
 */
export default function SmartBackButton({ 
  className = '', 
  fallbackRoute = 'Home',
  label = 'Voltar'
}) {
  const location = useLocation();
  const { goBack } = useSmartBack(fallbackRoute);

  // Não mostrar na Home
  if (!location || location.pathname === '/' || location.pathname === '/Home') {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={goBack}
      className={`text-gray-600 hover:text-gray-900 hover:bg-gray-100 gap-2 mb-4 ${className}`}
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </Button>
  );
}