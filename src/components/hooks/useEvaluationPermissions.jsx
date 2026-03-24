import { useAuth } from "@/lib/AuthContext";

export function useEvaluationPermissions(employee) {
  const { user } = useAuth();
  
  if (!user || !employee) {
    return { canSelfEvaluate: false, canEvaluateOthers: false };
  }

  // Verifica liderança
  const isLeader = ["gerente", "diretor", "socio", "lider_tecnico", "supervisor_loja"].includes(user.job_role || user.data?.job_role);
  const isAdmin = user.role === "admin";
  
  // É o próprio colaborador logado
  const isSelf = employee.email === user.email || employee.user_id === user.id;

  return {
    canSelfEvaluate: isSelf,
    canEvaluateOthers: isAdmin || isLeader
  };
}