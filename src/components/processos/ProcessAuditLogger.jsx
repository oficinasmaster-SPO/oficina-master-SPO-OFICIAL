
import { base44 } from "@/api/base44Client";

/**
 * Utility para registrar automaticamente ações de auditoria nos processos
 */
export async function logProcessAction({
  workshopId,
  processType,
  processId,
  processCode,
  processTitle,
  action,
  performedBy,
  performedByName,
  changesMade = null
}) {
  try {
    await base44.entities.ProcessAudit.create({
      workshop_id: workshopId,
      process_type: processType,
      process_id: processId,
      process_code: processCode,
      process_title: processTitle,
      action: action,
      performed_by: performedBy,
      performed_by_name: performedByName,
      changes_made: changesMade
    });
  } catch (error) {
    console.error("Erro ao registrar auditoria:", error);
  }
}

export default { logProcessAction };
