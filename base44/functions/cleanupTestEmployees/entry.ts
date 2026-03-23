import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const workshopId = "695408b3ed74bfeb60d708c0";
        const targetNames = [
            "teste financeiro", "teste", 
            "teste137", "teste136", "teste135", "teste134", 
            "teste133", "teste132", "teste131", "teste130", 
            "teste129", "teste128", "teste127", "teste126", 
            "SDR2", "SDR", "SDR3"
        ];
        // Adicionei SDR3 que vi na lista do usuário também

        // Buscar últimos 300 employees (deve cobrir todos os testes recentes)
        const allEmployees = await base44.asServiceRole.entities.Employee.list('-created_date', 300);

        // Filtrar na memória
        const toDelete = allEmployees.filter(emp => {
            if (emp.workshop_id !== workshopId) return false;
            
            return targetNames.includes(emp.full_name) || 
                   emp.full_name.toLowerCase().startsWith("teste") ||
                   emp.full_name.startsWith("SDR");
        });

        const deleted = [];
        const errors = [];
        
        for (const emp of toDelete) {
            try {
                await base44.asServiceRole.entities.Employee.delete(emp.id);
                deleted.push(`${emp.full_name} (${emp.id})`);
            } catch (err) {
                errors.push(`Falha ao deletar ${emp.full_name}: ${err.message}`);
            }
        }

        return Response.json({ 
            success: true, 
            scannedCount: allEmployees.length,
            matchCount: toDelete.length,
            deletedCount: deleted.length,
            deletedItems: deleted,
            errors: errors
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});