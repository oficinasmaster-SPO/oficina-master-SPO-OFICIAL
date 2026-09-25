import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loader2 } from "lucide-react";

/**
 * Sprint 2 / A1 (auditoria QA 25/09/2026)
 * A versão anterior desta página quebrava ao renderizar (lia question.labels, que não
 * existe em MaturityQuestions) e, se renderizasse, pontuaria sempre "bebê".
 * A autoavaliação de maturidade já é feita por DiagnosticoMaturidade (o usuário
 * seleciona a si mesmo e o registro é gravado como evaluation_type 'self').
 * Esta rota passa a apenas redirecionar, preservando a query string.
 */
export default function AutoavaliacaoMaturidade() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(createPageUrl("DiagnosticoMaturidade") + window.location.search, { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );
}
