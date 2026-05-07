import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { tarefa_id } = await req.json();

    if (!tarefa_id) {
      return Response.json({ error: 'tarefa_id obrigatório' }, { status: 400 });
    }

    // Busca tarefa escalada
    const tarefa = await base44.asServiceRole.entities.TarefaBacklog.get(tarefa_id);
    
    if (!tarefa || !tarefa.sla_escalado) {
      return Response.json({ error: 'Tarefa não encontrada ou não escalada' }, { status: 404 });
    }

    // Busca usuário líder ou consultor
    let usuarioDestino;
    if (tarefa.lider_id) {
      usuarioDestino = await base44.asServiceRole.entities.User.get(tarefa.lider_id);
    } else {
      usuarioDestino = await base44.asServiceRole.entities.User.get(tarefa.consultor_id);
    }

    if (!usuarioDestino?.email) {
      return Response.json({ error: 'Usuário destino sem email' }, { status: 400 });
    }

    // Envia email
    await base44.integrations.Core.SendEmail({
      to: usuarioDestino.email,
      subject: `🚨 ESCALAÇÃO SLA: ${tarefa.titulo}`,
      body: `
Olá ${usuarioDestino.full_name},

A tarefa "${tarefa.titulo}" violou seu SLA e foi automaticamente escalada.

DETALHES:
- Cliente: ${tarefa.cliente_nome}
- Prioridade: ${tarefa.prioridade.toUpperCase()}
- SLA: ${tarefa.sla_prazo_horas} horas
- Status: BLOQUEADA (escalonada automaticamente)
- Motivo: ${tarefa.motivo_bloqueio}

AÇÃO NECESSÁRIA:
Faça login no sistema imediatamente e tome as medidas necessárias.

---
Este é um alerta automático de escalação de SLA.
      `
    });

    return Response.json({ ok: true, email_enviado: usuarioDestino.email });
  } catch (error) {
    console.error('Erro em sendSlaBreachEmail:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});