import { Loader2 } from "lucide-react";
import useControleAceleracaoState from "@/components/hooks/useControleAceleracaoState";
import ControleAceleracaoView from "@/components/aceleracao/ControleAceleracaoView";

/**
 * Container — lógica, guards, composição de hooks.
 * Zero UI própria (delega tudo para ControleAceleracaoView).
 */
export default function ControleAceleracao() {
  const state = useControleAceleracaoState();
  const { user, loadingUser } = state;

  // ── Guard: loading ──
  if (loadingUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // ── Guard: permissão ──
  if (!user || (user.role !== "admin" && user.job_role !== "acelerador")) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Acesso Restrito</h2>
          <p className="text-gray-600">Esta área é restrita a consultores e aceleradores.</p>
        </div>
      </div>
    );
  }

  // ── Render ──
  return <ControleAceleracaoView state={state} />;
}