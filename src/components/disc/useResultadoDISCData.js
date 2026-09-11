import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { useEvaluationPermissions } from "@/components/hooks/useEvaluationPermissions";

/**
 * Hook compartilhado de carregamento do Resultado DISC.
 * Usado tanto pelo modal (HistoricoDISC) quanto pela página de rota (/ResultadoDISC?id=).
 *
 * @param {string} diagnosticId - ID do diagnóstico DISC
 * @param {boolean} enabled - Quando false, não carrega (ex.: modal fechado)
 */
export function useResultadoDISCData(diagnosticId, enabled = true) {
  const [loading, setLoading] = useState(true);
  const [diagnostic, setDiagnostic] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [teamComparison, setTeamComparison] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const { user } = useAuth();
  const { isLeader, isInternal, isAdmin, currentUserEmployee, loading: permissionsLoading } = useEvaluationPermissions();

  useEffect(() => {
    if (!enabled || !diagnosticId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);
        setNotFound(false);

        // Buscar employee do usuário atual se ainda não tiver
        let currentEmployee = currentUserEmployee;
        if (!currentEmployee) {
          const employees = await base44.entities.Employee.filter({ user_id: user.id });
          currentEmployee = employees.length > 0 ? employees[0] : null;
        }

        const diagnosticsList = await base44.entities.DISCDiagnostic.filter({ id: diagnosticId });
        const currentDiagnostic = diagnosticsList[0];

        if (!currentDiagnostic) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!cancelled) setDiagnostic(currentDiagnostic);

        let emp = null;
        if (currentDiagnostic.employee_id) {
          const empList = await base44.entities.Employee.filter({ id: currentDiagnostic.employee_id });
          emp = empList[0] || null;
        }
        if (!cancelled) setEmployee(emp);

        if (currentDiagnostic.team_name) {
          // RLS-safe: filtrar por team_name direto
          const teamDiagnostics = await base44.entities.DISCDiagnostic.filter({
            team_name: currentDiagnostic.team_name,
            completed: true
          }).then(res => res.filter(d => d.id !== currentDiagnostic.id)).catch(() => []);

          if (teamDiagnostics.length > 0) {
            const avgScores = { executor_d: 0, comunicador_i: 0, planejador_s: 0, analista_c: 0 };
            teamDiagnostics.forEach(diag => {
              avgScores.executor_d += diag.profile_scores.executor_d;
              avgScores.comunicador_i += diag.profile_scores.comunicador_i;
              avgScores.planejador_s += diag.profile_scores.planejador_s;
              avgScores.analista_c += diag.profile_scores.analista_c;
            });
            const count = teamDiagnostics.length;
            Object.keys(avgScores).forEach(key => {
              avgScores[key] = avgScores[key] / count;
            });
            if (!cancelled) {
              setTeamComparison({ teamName: currentDiagnostic.team_name, avgScores, memberCount: count });
            }
          }
        }
      } catch (error) {
        console.error(error);
        toast.error("Erro ao carregar resultado");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, [enabled, diagnosticId]);

  const isLoading = loading || permissionsLoading;

  // Admin e internos sempre têm acesso; líder vê a equipe; demais só o próprio resultado
  const accessDenied = !!diagnostic &&
    !isAdmin && !isInternal && !isLeader &&
    currentUserEmployee?.id !== diagnostic.employee_id;

  return {
    loading: isLoading,
    diagnostic,
    employee,
    teamComparison,
    notFound,
    accessDenied,
    isAdmin,
    isInternal,
    isLeader,
    currentUserEmployee
  };
}