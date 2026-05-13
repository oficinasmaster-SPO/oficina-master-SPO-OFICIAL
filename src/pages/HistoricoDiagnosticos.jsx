import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import HistoricoFilters from '@/components/diagnostico/HistoricoFilters';
import HistoricoCard from '@/components/diagnostico/HistoricoCard';
import { Button } from '@/components/ui/button';

const ITEMS_PER_PAGE = 50;

export default function HistoricoDiagnosticos() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [filters, setFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      // Detectar admin_workshop_id (modo Admin ativo)
      const adminMode = localStorage.getItem('admin_workshop_id');
      if (adminMode) {
        currentUser._adminModeWorkshopId = adminMode;
      }
      setUser(currentUser);
    } catch (error) {
      toast.error('Erro ao verificar autenticação');
      navigate('/');
    }
  };

  // Buscar histórico de diagnósticos
  const { data: historyData, isLoading, error } = useQuery({
    queryKey: ['diagnosticHistory', user?.id, user?._adminModeWorkshopId, filters],
    queryFn: async () => {
      if (!user) return { diagnostics: [] };
      
      try {
        // Em modo Admin, usar admin_workshop_id; caso contrário, usar workshop_id do user
        const targetWorkshopId = user._adminModeWorkshopId || user.data?.workshop_id || null;
        
        const result = await base44.functions.invoke('getDiagnosticHistory', {
          workshop_id: targetWorkshopId,
          isAdmin: user.role === 'admin' || !!user.data?.consulting_firm_id
        });
        
        if (!result.data?.diagnostics) return { diagnostics: [] };

        // Aplicar filtros no frontend
        let filtered = result.data.diagnostics;

        if (filters.diagnostic_type) {
          filtered = filtered.filter(d => d.diagnostic_type === filters.diagnostic_type);
        }

        if (filters.company_name) {
          filtered = filtered.filter(d => d.company_name === filters.company_name);
        }

        if (filters.dateFrom) {
          const from = new Date(filters.dateFrom);
          filtered = filtered.filter(d => new Date(d.created_date || d.completed_at) >= from);
        }

        if (filters.dateTo) {
          const to = new Date(filters.dateTo);
          to.setHours(23, 59, 59, 999);
          filtered = filtered.filter(d => new Date(d.created_date || d.completed_at) <= to);
        }

        return { diagnostics: filtered };
      } catch (error) {
        console.error('Error fetching history:', error);
        return { diagnostics: [] };
      }
    },
    enabled: !!user
  });

  // Buscar workshops para o filtro (só se admin/consultor)
  const { data: workshops = [] } = useQuery({
    queryKey: ['workshopsForFilter', user?.role, user?._adminModeWorkshopId],
    queryFn: async () => {
      if (!user) return [];
      // Se em modo Admin vendo um cliente específico, retornar só aquele cliente
      if (user._adminModeWorkshopId) {
        const workshop = await base44.entities.Workshop.filter({ id: user._adminModeWorkshopId });
        return workshop;
      }
      // Se admin/consultor, retornar todos
      if (user.role === 'user') return [];
      return base44.entities.Workshop.list('-created_date', 100);
    },
    enabled: !!user && (user?.role === 'admin' || user?.data?.consulting_firm_id)
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const diagnostics = historyData?.diagnostics || [];
  const isAdminMode = user.role === 'admin' || user.data?.consulting_firm_id;
  const showCompanyFilter = isAdminMode;

  // Paginação
  const totalPages = Math.ceil(diagnostics.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedDiagnostics = diagnostics.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleViewResult = (diagnostic) => {
    // Navegar para a página de resultado baseado no tipo de diagnóstico
    const diagnosticTypeRoutes = {
      entrepreneur_diagnostic: '/DiagnosticoEmpresario',
      // Add more mappings as needed
    };
    
    const route = diagnosticTypeRoutes[diagnostic.diagnostic_type] || '/Historico';
    navigate(route, { state: { diagnostic } });
  };

  const handleViewActionPlan = (diagnostic) => {
    navigate('/PlanoAcao', { state: { diagnostic } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Histórico de Diagnósticos</h1>
          <p className="text-gray-600 mt-2">Visualize e acompanhe todos os diagnósticos realizados</p>
        </div>

        {/* Filtros */}
        <HistoricoFilters
          onFilterChange={setFilters}
          workshops={workshops}
          showCompanyFilter={showCompanyFilter}
        />

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Erro ao carregar histórico</h3>
              <p className="text-sm text-red-700 mt-1">{error.message}</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && diagnostics.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">Nenhum diagnóstico encontrado</h3>
            <p className="text-gray-600 mt-2">Nenhum diagnóstico foi realizado com os filtros selecionados</p>
          </div>
        )}

        {/* Cards */}
        {!isLoading && !error && diagnostics.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {paginatedDiagnostics.map(diagnostic => (
                <HistoricoCard
                  key={diagnostic.id}
                  diagnostic={diagnostic}
                  onViewResult={handleViewResult}
                  onViewActionPlan={handleViewActionPlan}
                />
              ))}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                >
                  Anterior
                </Button>
                
                <div className="text-sm text-gray-600">
                  Página {currentPage} de {totalPages}
                </div>

                <Button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  variant="outline"
                >
                  Próxima
                </Button>
              </div>
            )}

            {/* Resumo */}
            <div className="text-center mt-6 text-sm text-gray-600">
              Total: {diagnostics.length} diagnóstico(s)
            </div>
          </>
        )}
      </div>
    </div>
  );
}