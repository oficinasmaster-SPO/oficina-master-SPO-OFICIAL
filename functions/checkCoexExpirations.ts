import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { differenceInDays, parseISO, addDays } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify if triggered by authenticated user or cron (assuming service role for cron logic in future)
    // For now, we allow authenticated users to trigger checks for their own workshop
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch workshops owned by user
    const workshops = await base44.entities.Workshop.filter({ owner_id: user.id });
    
    const results = [];

    for (const workshop of workshops) {
      const settings = workshop.notification_settings || {
        coex_expiration_days: [30, 60, 90],
        email_enabled: true,
        in_app_enabled: true
      };

      if (!settings.email_enabled && !settings.in_app_enabled) continue;

      // Get active employees for this workshop to find COEX contracts
      const employees = await base44.entities.Employee.filter({ workshop_id: workshop.id });
      const employeeIds = employees.map(e => e.id);

      if (employeeIds.length === 0) continue;

      // This is not efficient for huge datasets but fine for this scale
      // We need to filter contracts by employee IDs. 
      // Since we can't do 'IN' query easily if not supported, we might need to iterate or fetch all and filter.
      // Assuming we can fetch all contracts for now (or filter by workshop if added to contract schema, but it's not there).
      // Wait, contracts have `employee_id`.
      
      const allContracts = await base44.entities.COEXContract.filter({ status: 'ativo' });
      const workshopContracts = allContracts.filter(c => employeeIds.includes(c.employee_id));

      const today = new Date();

      for (const contract of workshopContracts) {
        if (!contract.end_date) continue;
        
        const endDate = parseISO(contract.end_date);
        const daysUntilExpiration = differenceInDays(endDate, today);
        
        // Check if daysUntilExpiration matches any of the configured thresholds
        // We use a small window (e.g., same day) to avoid duplicate notifications if run daily
        // But since this is triggered manually/periodically, we might want to be careful.
        // For "Upcoming", we just return the status.
        // For "Sending Notifications", we should ideally check if already sent today. 
        // For simplicity in this iteration, we will just return the list of alerts to be displayed or processed.
        
        if (settings.coex_expiration_days.includes(daysUntilExpiration)) {
          const employee = employees.find(e => e.id === contract.employee_id);
          
          const alertData = {
            type: 'coex_expiration',
            contract_id: contract.id,
            employee_name: employee?.full_name || 'Colaborador',
            days_remaining: daysUntilExpiration,
            end_date: contract.end_date
          };
          
          results.push(alertData);

          // Send In-App Notification
          if (settings.in_app_enabled) {
             await base44.entities.Notification.create({
               user_id: user.id, // Notify the workshop owner
               subtask_id: null, // Optional
               type: 'prazo_proximo',
               title: `COEX Vencendo: ${alertData.employee_name}`,
               message: `O contrato COEX de ${alertData.employee_name} vence em ${daysUntilExpiration} dias (${new Date(contract.end_date).toLocaleDateString('pt-BR')}).`,
               is_read: false,
               email_sent: false
             });
          }

          // Send Email
          if (settings.email_enabled) {
             await base44.integrations.Core.SendEmail({
               to: user.email,
               subject: `Alerta de Vencimento COEX - ${alertData.employee_name}`,
               body: `Olá ${user.full_name},\n\nO contrato COEX do colaborador ${alertData.employee_name} está próximo do vencimento.\n\nDias restantes: ${daysUntilExpiration}\nData de vencimento: ${new Date(contract.end_date).toLocaleDateString('pt-BR')}\n\nAcesse a plataforma para renovar ou gerenciar.\n\nAtenciosamente,\nEquipe Oficinas Master`
             });
          }
        }
      }
    }

    return Response.json({ success: true, alerts_generated: results.length, details: results });

  } catch (error) {
    console.error("Error checking COEX expirations:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});