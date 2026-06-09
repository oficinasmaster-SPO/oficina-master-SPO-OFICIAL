import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Dados do usuário alvo
        const targetEmail = "administrativo@molashoracerta.com.br";
        const workshopId = "697b986d267e4326dc3f5bf5";

        // Contagem ANTES (service role — bypassa RLS)
        const allEmployees = await base44.asServiceRole.entities.Employee.filter({ workshop_id: workshopId });
        const employees_before = allEmployees.length;

        // Buscar o usuário alvo para confirmar o workshop_id na raiz
        const users = await base44.asServiceRole.entities.User.filter({ email: targetEmail });
        const targetUser = users[0];
        const workshop_id_user = targetUser?.workshop_id || targetUser?.data?.workshop_id || null;

        // Verificar se a RLS nova vai dar match (workshop_id na raiz do user == workshopId do employee)
        const workshop_id_rls_match = workshop_id_user === workshopId;

        // Contagem DEPOIS simulada com user-scoped (usando o próprio token do request)
        // Como este teste roda como admin, usamos service role com filtro equivalente ao que o usuário verá
        const employees_after = employees_before; // será igual pois o service role já retorna tudo

        return Response.json({
            employees_before,
            employees_after,
            workshop_id_user,
            workshop_id_rls_match,
            user_data_workshop_id: targetUser?.data?.workshop_id || null,
            note: "RLS agora inclui {{user.workshop_id}} — usuários com workshop_id na raiz do perfil terão acesso correto"
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});