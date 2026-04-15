import { useMemo } from "react";

/**
 * Hook que determina as permissões do usuário sobre um sprint.
 * 
 * @param {object} sprint - O objeto ConsultoriaSprint
 * @param {object} user - O usuário autenticado (base44.auth.me())
 * @param {object} workshop - A oficina do contexto atual
 * @returns {object} flags de permissão booleanas
 */
export function useSprintPermissions(sprint, user, workshop) {
  return useMemo(() => {
    if (!sprint || !user) {
      return {
        isConsultor: false,
        isOficina: false,
        canCreateSprint: false,
        canEditSprintMeta: false,
        canAddTasks: false,
        canCompleteTasks: false,
        canAddNotes: false,
        canSubmitForReview: false,
        canReviewPhase: false,
        canAdvancePhase: false,
        canReturnPhase: false,
        canViewSprint: false,
        role: "none",
      };
    }

    const isAdmin = user.role === "admin";
    const isConsultor =
      isAdmin ||
      sprint.consultor_id === user.id ||
      (user.data?.consulting_firm_id && sprint.consulting_firm_id === user.data.consulting_firm_id);
    
    const isOficina =
      !isConsultor && (
        (workshop && sprint.workshop_id === workshop.id) ||
        (user.data?.workshop_id && sprint.workshop_id === user.data.workshop_id)
      );

    const sprintCompleted = sprint.status === "completed";

    return {
      // Identidade
      isConsultor,
      isOficina,
      role: isConsultor ? "consultor" : isOficina ? "oficina" : "none",

      // Sprint-level
      canCreateSprint: isConsultor,
      canEditSprintMeta: isConsultor && !sprintCompleted,
      canAddTasks: isConsultor && !sprintCompleted,

      // Task-level
      canCompleteTasks: (isConsultor || isOficina) && !sprintCompleted,

      // Notes/evidence
      canAddNotes: (isConsultor || isOficina) && !sprintCompleted,

      // Phase flow - oficina submete, consultor revisa
      canSubmitForReview: isOficina && !sprintCompleted,
      canReviewPhase: isConsultor && !sprintCompleted,
      canAdvancePhase: isConsultor && !sprintCompleted,
      canReturnPhase: isConsultor && !sprintCompleted,

      // View
      canViewSprint: isConsultor || isOficina,
    };
  }, [sprint, user, workshop]);
}