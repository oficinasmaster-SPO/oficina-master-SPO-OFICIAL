import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Buscar todos os processos com notificação diária ativa
    const processosAtivos = await base44.asServiceRole.entities.CronogramaProgresso.filter({
      notificacao_diaria_ativa,
      situacao: 'em_andamento'
    });

    const hoje = new Date().toISOString().split('T')[0];
    let notificacoesEnviadas = 0;

    for (const processo of processosAtivos) {
      // Verificar se já enviou hoje
      const ultimaNotificacao = processo.ultima_notificacao_enviada 
        ? new Date(processo.ultima_notificacao_enviada).toISOString().split('T')[0]
        ;

      if (ultimaNotificacao === hoje) {
        continue; // Já enviou hoje
      }

      // Buscar workshop e email do cliente
      const workshops = await base44.asServiceRole.entities.Workshop.filter({ id.workshop_id });
      const workshop = workshops[0];

      if (!workshop || !workshop.owner_id) continue;

      // Buscar usuário owner
      const users = await base44.asServiceRole.entities.User.filter({ id.owner_id });
      const owner = users[0];

      if (!owner?.email) continue;

      // Gerar mensagem motivacional
      const mensagens = [
        `Olá! Continue firme na implementação do ${processo.modulo_nome}. Cada passo conta! 💪`,
        `Bom dia! Lembre-se sucesso do ${processo.modulo_nome} depende da sua consistência diária! 🚀`,
        `Mais um dia de progresso! Como está indo o ${processo.modulo_nome}? Estamos aqui para ajudar! ✨`,
        `Continue avançando! O ${processo.modulo_nome} está te levando para outro nível! 📈`,
        `Foco e persistência! Seu progresso no ${processo.modulo_nome} está fazendo diferença! 🎯`
      ];

      const mensagem = mensagens[Math.floor(Math.random() * mensagens.length)];

      // Enviar email
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to.email,
          subject: `${processo.modulo_nome} - Mensagem Motivacional`,
          body: `
            Olá, ${owner.full_name || 'Parceiro'}!</h2>
            ${mensagem}</p>
            Módulo:</strong> ${processo.modulo_nome}</p>
            Fase:</strong> ${processo.fase_oficina}</p>
            Continue firme na sua jornada de crescimento!</p>
            
            Equipe Oficinas Master</p>
          `
        });

        // Atualizar última notificação
        await base44.asServiceRole.entities.CronogramaProgresso.update(processo.id, {
          ultima_notificacao_enviada Date().toISOString()
        });

        notificacoesEnviadas++;
      } catch (emailError) {
        console.error(`Erro ao enviar email para ${owner.email}:`, emailError);
      }
    }

    return Response.json({
      success,
      notificacoes_enviadas
    });

  } catch (error) {
    return Response.json({ error.message }, { status: 500 });
  }
});
