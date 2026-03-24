import { useAuth } from "@/lib/AuthContext";

export function useEvaluationPermissions(employee) {
  const { user } = useAuth();
  
  if (!user) {
    return { canSelfEvaluate: false, canEvaluateOthers: false, currentUserEmployee: null };
  }

  // Verifica liderança
  const isLeader = ["gerente", "diretor", "socio", "lider_tecnico", "supervisor_loja"].includes(user.job_role || user.data?.job_role);
  const isAdmin = user.role === "admin";
  
  // É o próprio colaborador logado
  let isSelf = false;
  if (employee) {
    isSelf = employee.email === user.email || employee.user_id === user.id;
  }

  const canEvaluate = (targetEmployeeId) => {
    if (isAdmin || isLeader) return true;
    if (employee && employee.id === targetEmployeeId) return true;
    return false;
  };

  return {
    canSelfEvaluate: isSelf,
    canEvaluateOthers: isAdmin || isLeader,
    canEvaluate,
    isLeader,
    currentUserEmployee: employee
  };
}