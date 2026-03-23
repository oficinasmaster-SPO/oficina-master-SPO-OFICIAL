import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Buscar todos os progressos não concluídos
    const progressos = await base44.asServiceRole.entities.CronogramaProgresso.list();
    const progressosAtivos = progressos.filter(p => p.situacao !== 'concluido');

    const hoje = new Date();
    const em7Dias = new Date();
    em7Dias.setDate(hoje.getDate() + 7);

    let notificacoesCriadas = 0;

    for (const progresso of progressosAtivos) {
      if (!progresso.data_conclusao_previsto || !progresso.workshop_id) continue;

      const dataPrevista = new Date(progresso.data_conclusao_previsto);
      const diasRestantes = Math.ceil((dataPrevista - hoje) / (1000 * 60 * 60 * 24));

      // Buscar colaboradores da oficina
      const colaboradores = await base44.asServiceRole.entities.Employee.filter({
        workshop_id: progresso.workshop_id,
        status: 'ativo'
      });

      // Buscar template para pegar nome do processo
      const templates = await base44.asServiceRole.entities.CronogramaTemplate.filter({
        codigo: progresso.modulo_codigo
      });
      const processoNome = templates[0]?.nome || progresso.modulo_codigo;

      // Verificar se já existe notificação recente (últimas 24h)
      const notificacoesExistentes = await base44.asServiceRole.entities.Notification.filter({
        workshop_id: progresso.workshop_id
      });
      const jaNotificadoHoje = notificacoesExistentes.some(n => 
        n.processo_id === progresso.id && 
        new Date(n.created_date) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      );

      if (jaNotificadoHoje) continue;

      let tipoNotificacao = null;
      let titulo = '';
      let mensagem = '';

      // Atrasado
      if (diasRestantes < 0) {
        tipoNotificacao = 'processo_atrasado';
        titulo = '🔴 Processo Atrasado';
        mensagem = `O processo "${processoNome}" está ${Math.abs(diasRestantes)} dias atrasado.`;
      }
      // Vence hoje
      else if (diasRestantes === 0) {
        tipoNotificacao = 'prazo_hoje';
        titulo = '⚠️ Prazo Vence Hoje';
        mensagem = `O processo "${processoNome}" deve ser concluído hoje.`;
      }
      // Vence em 3 dias
      else if (diasRestantes <= 3) {
        tipoNotificacao = 'prazo_proximo';
        titulo = '⏰ Prazo Próximo';
        mensagem = `O processo "${processoNome}" vence em ${diasRestantes} dias.`;
      }
      // Vence em 7 dias
      else if (diasRestantes <= 7) {
        tipoNotificacao = 'prazo_semana';
        titulo = '📅 Prazo em Uma Semana';
        mensagem = `O processo "${processoNome}" vence em ${diasRestantes} dias.`;
      }

      if (tipoNotificacao) {
        // Criar notificações para todos colaboradores ativos
        for (const colab of colaboradores) {
          if (!colab.user_id) continue;

          // Verificar preferências de e-mail
          const prefs = await base44.asServiceRole.entities.Notification.filter({
            user_id: colab.user_id,
            type: 'config_preferencias'
          });
          const emailEnabled = prefs.length === 0 || prefs[0]?.metadata?.email_enabled !== false;
          const notificarPrazos = prefs.length === 0 || prefs[0]?.metadata?.notificar_prazos !== false;
          const notificarAtrasados = prefs.length === 0 || prefs[0]?.metadata?.notificar_atrasados !== false;

          const deveNotificar = (tipoNotificacao === 'processo_atrasado' && notificarAtrasados) ||
                                (tipoNotificacao !== 'processo_atrasado' && notificarPrazos);

          if (!deveNotificar) continue;

          const notifCriada = await base44.asServiceRole.entities.Notification.create({
            user_id: colab.user_id,
            workshop_id: progresso.workshop_id,
            processo_id: progresso.id,
            type: tipoNotificacao,
            title: titulo,
            message: mensagem,
            is_read: false,
            email_sent: false
          });
          notificacoesCriadas++;

          // Enviar e-mail se habilitado
          if (emailEnabled) {
            try {
              const user = await base44.asServiceRole.entities.User.get(colab.user_id);
              if (user?.email) {
                await base44.asServiceRole.integrations.Core.SendEmail({
                  from_name: 'Oficinas Master',
                  to: user.email,
                  subject: titulo,
                  body: `
                    <h2>${titulo}</h2>
                    <p>${mensagem}</p>
                    <p><strong>Processo:</strong> ${processoNome}</p>
                    <p><strong>Data prevista:</strong> ${new Date(progresso.data_conclusao_previsto).toLocaleDateString('pt-BR')}</p>
                    <br>
                    <p>Acesse a plataforma para mais detalhes.</p>
                  `
                });
                await base44.asServiceRole.entities.Notification.update(notifCriada.id, { email_sent: true });
              }
            } catch (emailError) {
              console.error('Erro ao enviar e-mail:', emailError);
            }
          }
        }
      }
    }

    return Response.json({ 
      success: true, 
      notificacoes_criadas: notificacoesCriadas,
      progressos_verificados: progressosAtivos.length
    });

  } catch (error) {
    console.error("Erro ao verificar prazos:", error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});