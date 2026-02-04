import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // ID da empresa fornecido
        const workshopId = "695408b3ed74bfeb60d708c0";
        
        // Nomes exatos para deletar
        const targetNames = [
            "teste financeiro", "teste", 
            "teste137", "teste136", "teste135", "teste134", 
            "teste133", "teste132", "teste131", "teste130", 
            "teste129", "teste128", "teste127", "teste126", 
            "SDR2", "SDR"
        ];

        // Buscar colaboradores da oficina
        // Usamos asServiceRole para garantir permissão de exclusão em massa
        const employees = await base44.asServiceRole.entities.Employee.filter({
             workshop_id: workshopId 
        }, { limit: 200 }); 

        // Filtrar colaboradores que correspondem aos critérios
        const toDelete = employees.filter(emp => 
            targetNames.includes(emp.full_name) || 
            emp.full_name.toLowerCase().startsWith("teste") ||
            emp.full_name.startsWith("SDR")
        );

        // Deletar um por um
        const deleted = [];
        const errors = [];
        
        for (const emp of toDelete) {
            try {
                // Tentar deletar o colaborador
                await base44.asServiceRole.entities.Employee.delete(emp.id);
                
                // Tentar limpar usuário associado se existir e for apenas teste
                if (emp.user_id) {
                    try {
                        const user = await base44.asServiceRole.entities.User.get(emp.user_id);
                        // Só deleta usuário se parecer teste também
                        if (user && (user.email.includes("teste") || user.email.includes("example"))) {
                            // Nota: Deletar usuário pode ser restrito, mas tentamos limpar a referência
                            // Na verdade, a entidade User é protegida, não podemos deletar diretamente via SDK normalmente
                            // Mas podemos tentar limpar dados sensíveis se necessário. 
                            // Por enquanto, focamos em deletar o Employee que é o que aparece na lista.
                        }
                    } catch (e) {
                        // Ignora erro de usuário
                    }
                }
                
                deleted.push(`${emp.full_name} (${emp.id})`);
            } catch (err) {
                errors.push(`Falha ao deletar ${emp.full_name}: ${err.message}`);
            }
        }

        return Response.json({ 
            success: true, 
            totalFound: toDelete.length,
            deletedCount: deleted.length,
            deletedItems: deleted,
            errors: errors
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});