import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { selectedClients, data } = body;

        if (!selectedClients || selectedClients.length === 0) {
            return Response.json({ error: 'Selecione pelo menos um cliente' }, { status: 400 });
        }
        if (!data.data_agendada || !data.hora_agendada) {
            return Response.json({ error: 'Preencha data e horário' }, { status: 400 });
        }

        const dataHora = `${data.data_agendada}T${data.hora_agendada}:00`;

        const atendimentos = selectedClients.map(workshop_id => ({
            workshop_id,
            tipo_atendimento: data.tipo_atendimento,
            status: data.status,
            consultor_id: user.id,
            consultor_nome: user.full_name,
            data_agendada: dataHora,
            duracao_minutos: data.duracao_minutos,
            google_meet_link: data.google_meet_link,
            pauta: data.pauta ? [{ titulo: data.pauta, descricao: "", tempo_estimado: 15 }] : [],
            objetivos: data.objetivos ? [data.objetivos] : [],
            observacoes_consultor: data.observacoes
        }));

        const results = await Promise.all(
            atendimentos.map(atendimento => 
                base44.entities.ConsultoriaAtendimento.create(atendimento)
            )
        );

        // Fetch last batch dispatch to generate sequence ID
        const lastDisparos = await base44.asServiceRole.entities.BatchDispatch.list('-created_date', 1).catch(() => []);
        let nextNumber = 1;
        if (lastDisparos && lastDisparos.length > 0) {
            const lastIdStr = lastDisparos[0].disparo_id;
            if (lastIdStr && lastIdStr.startsWith('DP')) {
                 nextNumber = parseInt(lastIdStr.replace('DP', '')) + 1;
            } else {
                 // Fallback in case ID is completely numeric or another format
                 nextNumber = parseInt(lastDisparos[0].id.replace(/[^0-9]/g, '').slice(-3) || "1") + 1; 
            }
        }
        const disparoId = `DP${String(nextNumber).padStart(3, "0")}`;

        // Buscar dados dos clientes usando asServiceRole para evitar problemas de RLS de leitura
        const clientesData = await Promise.all(
            selectedClients.map(id => base44.asServiceRole.entities.Workshop.get(id).catch(() => null))
        ).then(resData => resData.filter(Boolean));

        // Salvar registro do disparo no histórico
        await base44.entities.BatchDispatch.create({
            disparo_id: disparoId,
            workshop_id: user.data?.workshop_id || user.id,
            consultor_id: user.id,
            consultor_nome: user.full_name,
            grupo_nome: `Lote ${new Date().toLocaleDateString("pt-BR")}`,
            tipo_atendimento: data.tipo_atendimento,
            data_agendada: data.data_agendada,
            hora_agendada: data.hora_agendada,
            duracao_minutos: data.duracao_minutos,
            status: data.status,
            total_clientes: selectedClients.length,
            clientes: clientesData.map(c => ({
                workshop_id: c.id,
                nome: c.name,
                cidade: c.city,
                plano: c.planoAtual
            })),
            pauta: data.pauta,
            objetivos: data.objetivos,
            observacoes: data.observacoes,
            atendimentos_criados: results.map(r => r.id)
        });

        return Response.json({ success: true, count: results.length, results });

    } catch (error) {
        console.error(error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});