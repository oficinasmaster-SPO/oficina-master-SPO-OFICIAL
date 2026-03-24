import React from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';

export default function PlanLimitWarning({ limitData, resourceName }) {
  const navigate = useNavigate();
  
  if (!limitData || !limitData.isLimitReached) return null;

  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-5 mb-6 rounded-r-md shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center">
      <div className="flex-shrink-0 bg-red-100 p-2 rounded-full">
        <Lock className="h-6 w-6 text-red-600" />
      </div>
      <div className="flex-1">
        <h3 className="text-red-800 font-bold text-lg">Limite de {resourceName} Atingido</h3>
        <p className="text-red-700 text-sm mt-1">
          O plano da oficina (<strong>{limitData.plano}</strong>) permite até <strong>{limitData.limit}</strong> {resourceName.toLowerCase()} por mês. 
          Você já atingiu esse limite. Os contadores são resetados no primeiro dia de cada mês.
        </p>
      </div>
      <div className="flex-shrink-0">
        <Button 
          className="bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm"
          onClick={() => navigate(createPageUrl("Planos"))}
        >
          Fazer Upgrade do Plano
        </Button>
      </div>
    </div>
  );
}