import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { LEADER_JOB_ROLES } from "@/components/lib/jobRoles";
import { getUserJobRole } from "@/utils/userUtils";

/**
 * useEvaluationPermissions
 *
 * Controla quem pode ver resultados de diagnósticos de outros colaboradores.
 *
 * REGRAS:
 *   1. Admin (role: admin)           → vê tudo
 *   2. Interno (user_type: internal) → vê tudo (consultor, acelerador, marketing, etc.)
 *   3. Líder da oficina              → vê colaboradores da própria oficina
 *   4. O próprio colaborador         → vê o próprio resultado
 *   5. Demais                        → bloqueado
 *
 * CORREÇÕES aplicadas:
 *   - Hook buscava employee por conta própria assincronamente com loading: undefined
 *   - isLeader ignorava user_type: internal (Mateus marketing era bloqueado)
 *   - currentUserEmployee nunca era populado — comparação com diagnostic.employee_id sempre falhava
 */

// LEADER_JOB_ROLES importado de @/components/lib/jobRoles — fonte única de verdade

export function useEvaluationPermissions() {
  const { user } = useAuth();
  const [currentUserEmployee, setCurrentUserEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Internos e admins não precisam de employee para ter acesso — pular query
    if (user.role === "admin" || user.user_type === "internal") {
      setLoading(false);
      return;
    }

    // Para externos: buscar o employee para comparação de self-access
    base44.entities.Employee
      .filter({ user_id: user.id })
      .then(employees => {
        if (employees && employees.length > 0) {
          setCurrentUserEmployee(employees[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  if (!user) {
    return {
      canSelfEvaluate: false,
      canEvaluateOthers: false,
      canViewResult: () => false,
      isLeader: false,
      currentUserEmployee: null,
      loading: false,
    };
  }

  const isAdmin    = user.role === "admin";
  const isInternal = user.user_type === "internal"; // internos veem tudo
  // Job role vem do Employee, não do User — usar currentUserEmployee
  const userJobRole = currentUserEmployee?.job_role || getUserJobRole(user);
  // isLeader: job_role de liderança OU é sócio/owner da oficina
  // Fallback rápido via user.data antes de currentUserEmployee carregar
  const userDataJobRole = user?.data?.job_role;
  const isLeader   = LEADER_JOB_ROLES.includes(userJobRole) || 
                     LEADER_JOB_ROLES.includes(userDataJobRole) ||
                     (currentUserEmployee?.is_partner === true) ||
                     (currentUserEmployee?.owner_id === user.id);

  /**
   * canViewResult(diagnosticEmployeeId)
   * Retorna true se o usuário logado pode ver o resultado deste diagnóstico.
   */
  const canViewResult = (diagnosticEmployeeId) => {
    if (isAdmin || isInternal) return true;
    if (isLeader) return true;
    if (currentUserEmployee?.id === diagnosticEmployeeId) return true;
    return false;
  };

  const canEvaluate = (targetEmployeeId) => {
    if (isAdmin || isInternal || isLeader) return true;
    if (currentUserEmployee?.id === targetEmployeeId) return true;
    return false;
  };

  return {
    canSelfEvaluate: !!currentUserEmployee,
    canEvaluateOthers: isAdmin || isInternal || isLeader,
    canViewResult,
    canEvaluate,
    isLeader,
    isInternal,
    isAdmin,
    currentUserEmployee,
    loading,
  };
}