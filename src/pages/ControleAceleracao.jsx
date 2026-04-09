import useControleAceleracaoState from "@/components/hooks/useControleAceleracaoState";
import ControleAceleracaoView from "@/components/aceleracao/ControleAceleracaoView";
import PageAccessControl from "@/components/auth/PageAccessControl";
import WheelLoader from "@/components/ui/WheelLoader";

/**
 * Container — composição de hooks + guard via RBAC centralizado do sistema.
 * Permissão: "acceleration.manage" (definida em pagePermissions).
 */
export default function ControleAceleracao() {
  const state = useControleAceleracaoState();
  const { loadingUser } = state;

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <WheelLoader size="lg" text="Carregando..." />
      </div>
    );
  }

  return (
    <PageAccessControl
      requiredPermissions={["acceleration.manage"]}
      requiredJobRoles={["acelerador", "consultor", "mentor"]}
    >
      <ControleAceleracaoView state={state} />
    </PageAccessControl>
  );
}