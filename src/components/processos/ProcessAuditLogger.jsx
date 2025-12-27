import { base44 } from "@/api/base44Client";

export async function logProcessAction({
  workshopId,
  processType,
  processId,
  processCode,
  processTitle,
  action,
  changesMade = {}
}) {
  try {
    const user = await base44.auth.me();
    
    await base44.entities.ProcessAudit.create({
      workshop_id: workshopId,
      process_type: processType,
      process_id: processId,
      process_code: processCode,
      process_title: processTitle,
      action: action,
      performed_by: user.email,
      performed_by_name: user.full_name,
      changes_made: changesMade,
      ip_address: ""
    });
  } catch (error) {
    console.error("Erro ao registrar auditoria:", error);
  }
}