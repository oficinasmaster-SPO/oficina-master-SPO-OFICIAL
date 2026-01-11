import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { LogOut, Handshake } from 'lucide-react';
import { toast } from 'sonner';

export default function AssistanceModeBanner({ user }) {
  const location = useLocation();
  const [assistanceData, setAssistanceData] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const assistanceMode = params.get('assistance_mode') === 'true';
    const workshopId = params.get('workshop_id');
    const assistedBy = params.get('assisted_by');

    if (assistanceMode && workshopId && assistedBy) {
      setAssistanceData({ workshopId, assistedBy });
    } else {
      setAssistanceData(null);
    }
  }, [location.search]);

  // Carregar dados do cliente (workshop)
  const { data: clientWorkshop } = useQuery({
    queryKey: ['workshop-assistance', assistanceData?.workshopId],
    queryFn: () => base44.entities.Workshop.get(assistanceData.workshopId),
    enabled: !!assistanceData?.workshopId
  });

  // Carregar dados do consultor
  const { data: consultant } = useQuery({
    queryKey: ['consultant-assistance', assistanceData?.assistedBy],
    queryFn: async () => {
      try {
        const employees = await base44.entities.Employee.filter({ 
          user_id: assistanceData.assistedBy 
        });
        return employees[0] || null;
      } catch {
        return null;
      }
    },
    enabled: !!assistanceData?.assistedBy
  });

  const handleExitAssistance = () => {
    // Remove parâmetros de assistência da URL e recarrega
    const url = new URL(window.location);
    url.searchParams.delete('assistance_mode');
    url.searchParams.delete('workshop_id');
    url.searchParams.delete('assisted_by');
    window.location.href = url.toString();
  };

  if (!assistanceData) return null;

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 sticky top-0 z-40 shadow-lg">
      <div className="flex items-center justify-between max-w-full">
        <div className="flex items-center gap-3 flex-1">
          <Handshake className="w-5 h-5 flex-shrink-0" />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">
              Você está ajudando {clientWorkshop?.name || 'carregando...'}
            </span>
            <span className="text-blue-100">|</span>
            <span className="text-sm text-blue-100">
              Sessão assistida por {consultant?.full_name || user?.full_name || 'você'}
            </span>
          </div>
        </div>
        <Button
          onClick={handleExitAssistance}
          size="sm"
          className="bg-white hover:bg-blue-50 text-blue-700 ml-4 flex-shrink-0"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair da Assistência
        </Button>
      </div>
    </div>
  );
}