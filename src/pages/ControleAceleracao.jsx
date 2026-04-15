import React from "react";
// rebuild trigger
import useControleAceleracaoState from "@/components/hooks/useControleAceleracaoState";
import ControleAceleracaoView from "@/components/aceleracao/ControleAceleracaoView";
import PageAccessControl from "@/components/auth/PageAccessControl";
import WheelLoader from "@/components/ui/WheelLoader";

export default function ControleAceleracao() {
  const state = useControleAceleracaoState();

  if (state.loadingUser) {
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