import { Loader2, ShieldAlert } from "lucide-react";
import useControleAceleracaoState from "@/components/hooks/useControleAceleracaoState";
import useAceleracaoPermissions from "@/components/hooks/useAceleracaoPermissions";
import ControleAceleracaoView from "@/components/aceleracao/ControleAceleracaoView";
import WheelLoader from "@/components/ui/WheelLoader";

/**
 * Container — lógica, guards RBAC backend-validated, composição de hooks.
 * Zero UI própria (delega tudo para ControleAceleracaoView).
 */
export default function ControleAceleracao() {
  const state = useControleAceleracaoState();
  const { user, loadingUser } = state;

  // ── RBAC backend-validated ──
  const rbac = useAceleracaoPermissions(user?.id);

  // ── Guard: loading (user + permissions) ──
  if (loadingUser || rbac.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <WheelLoader size="lg" text="Validando permissões..." />
      </div>
    );
  }

  // ── Guard: não autenticado ──
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Não Autenticado</h2>
          <p className="text-gray-600">Faça login para acessar esta área.</p>
        </div>
      </div>
    );
  }

  // ── Guard: permissão negada pelo backend ──
  if (!rbac.authorized) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Acesso Restrito</h2>
          <p className="text-gray-600">
            {rbac.error || "Você não tem permissão para acessar o Controle de Aceleração."}
          </p>
          <p className="text-xs text-gray-400 mt-4">
            Se você acredita que isso é um erro, entre em contato com o administrador.
          </p>
        </div>
      </div>
    );
  }

  // ── Render com permissões validadas ──
  return (
    <ControleAceleracaoView
      state={state}
      permissions={rbac.permissions}
      hasPermission={rbac.hasPermission}
      effectiveRole={rbac.effectiveRole}
    />
  );
}