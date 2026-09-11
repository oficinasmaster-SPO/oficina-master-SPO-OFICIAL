import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft, SearchX, ShieldAlert } from "lucide-react";
import { useResultadoDISCData } from "@/components/disc/useResultadoDISCData";
import ResultadoDISCContent from "@/components/disc/ResultadoDISCContent";

// Compat: manter o export do modal para possíveis importadores legados de '@/pages/ResultadoDISC'
export { default as ResultadoDISCModal } from "@/components/disc/ResultadoDISCModal";

/**
 * Página real do Resultado DISC (rota /ResultadoDISC?id=).
 * Atende os 3 fluxos que navegam por URL:
 * - Aba "Testes" do perfil (DiagnosticosVinculados)
 * - Mapa de Autoavaliações (Autoavaliacoes)
 * - Redirect pós-conclusão da Autoavaliação DISC
 * O modal in-place (HistoricoDISC) continua existindo via ResultadoDISCModal.
 */
export default function ResultadoDISC() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const diagnosticId = urlParams.get("id");

  const { loading, diagnostic, employee, teamComparison, accessDenied } = useResultadoDISCData(diagnosticId);

  const handleBack = () => navigate(-1);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600">Carregando resultado...</p>
        </div>
      </div>
    );
  }

  if (!diagnosticId || !diagnostic) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <Card>
          <CardContent className="p-10">
            <SearchX className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Resultado não encontrado</h1>
            <p className="text-gray-600 mb-6">
              O diagnóstico informado não existe ou você não tem acesso a ele.
            </p>
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <Card>
          <CardContent className="p-10">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Acesso Restrito</h1>
            <p className="text-gray-600 mb-6">Você não tem permissão para ver o resultado de outros colaboradores.</p>
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-2 sm:px-4">
      <div className="max-w-5xl mx-auto">
        <Button variant="ghost" size="sm" onClick={handleBack} className="mb-3 text-gray-600">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div className="rounded-xl overflow-hidden shadow-lg">
          <ResultadoDISCContent
            diagnostic={diagnostic}
            employee={employee}
            teamComparison={teamComparison}
            onClose={handleBack}
          />
        </div>
      </div>
    </div>
  );
}