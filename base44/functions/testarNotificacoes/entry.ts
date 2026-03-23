import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    // Criar 3 notificações de teste
    const notificacoes = [
      {
        user_id: user.id,
        type: 'meta_batida',
        title: '🎯 Teste: Meta Batida!',
        message: 'Esta é uma notificação de teste. Sua meta de faturamento foi atingida (105%)!',
        is_read: false
      },
      {
        user_id: user.id,
        type: 'meta_nacional_empresa',
        title: '🏆 Teste: Conquista Nacional',
        message: 'Oficina Master de São Paulo/SP bateu a meta de TCMP2! Esta é uma notificação de teste.',
        is_read: false
      },
      {
        user_id: user.id,
        type: 'processo_concluido',
        title: '✅ Teste: Processo Concluído',
        message: 'O processo "Manual de Atendimento" foi concluído. Esta é uma notificação de teste.',
        is_read: false
      }
    ];

    for (const notif of notificacoes) {
      await base44.entities.Notification.create(notif);
    }

    return Response.json({ 
      success: true, 
      message: '3 notificações de teste criadas!',
      count: 3
    });

  } catch (error) {
    console.error("Erro ao criar notificações de teste:", error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});