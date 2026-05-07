import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Função para criar templates de tarefas backlog prontos para uso
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // 3 Templates padrão
    const templates = [
      {
        titulo: "Libera\u00e7\u00e3o do curso PPR na Quizify",
        descricao: "Garantir que o cliente tenha acesso completo ao curso PPR na plataforma Quizify.",
        prioridade: "media",
        impacto: "entrega",
        passos: [
          "Validar se o acesso foi liberado corretamente",
          "Confirmar se o cliente conseguiu logar na plataforma",
          "Validar se ele est\u00e1 conseguindo navegar e utilizar 100%",
          "Solicitar um print do acesso ao curso e anexar na tarefa como evid\u00eancia",
          "Confirmar se o cliente ir\u00e1 participar do Acelera Time",
          "Orientar o cliente sobre o hor\u00e1rio de atendimento (hor\u00e1rio comercial) para suporte",
          "Refor\u00e7ar que, caso v\u00e1 reunir a equipe, deve se antecipar caso precise de ajuda"
        ]
      },
      {
        titulo: "P\u00f3s-venda \u2014 Percep\u00e7\u00e3o do cliente",
        descricao: "Entrar em contato com o cliente para entender a percep\u00e7\u00e3o dele sobre o projeto/programa e identificar oportunidades de melhoria e aumento de satisfa\u00e7\u00e3o.",
        prioridade: "alta",
        impacto: "satisfacao",
        passos: [
          "Entrar em contato com o cliente (liga\u00e7\u00e3o ou WhatsApp)",
          "Perguntar como est\u00e1 a experi\u00eancia com o programa",
          "Entender o que ele mais gostou at\u00e9 agora",
          "Identificar pontos de melhoria ou insatisfa\u00e7\u00e3o",
          "Perguntar como podemos contribuir mais com o resultado dele",
          "Registrar feedback detalhado na tarefa",
          "Sinalizar poss\u00edveis riscos ou oportunidades para o time"
        ]
      },
      {
        titulo: "Suporte da consultoria",
        descricao: "Atender o cliente de forma consultiva, entendendo profundamente sua necessidade e direcionando a melhor solu\u00e7\u00e3o.",
        prioridade: "media",
        impacto: "satisfacao",
        passos: [
          "Entrar em contato com o cliente",
          "Escutar ativamente a demanda",
          "Utilizar o Mapa 3D (Dor, D\u00favida, Desejo)",
          "Aplicar os 5 porqu\u00eas para encontrar a raiz do problema",
          "Registrar detalhadamente a necessidade",
          "\ud83d\udd27 SUPORTE DE TI: Entrar em contato via liga\u00e7\u00e3o ou WhatsApp",
          "\ud83d\udd27 Se necess\u00e1rio, realizar call via Meet",
          "\ud83d\udd27 Gravar a call",
          "\ud83d\udd27 Ajudar o cliente com acesso, plataforma ou dificuldades t\u00e9cnicas",
          "\ud83d\udcc8 SUPORTE DE TR\u00c1FEGO: Agendar reuni\u00e3o com o cliente",
          "\ud83d\udcc8 Realizar call via Meet",
          "\ud83d\udcc8 Gravar a reuni\u00e3o",
          "\ud83d\udcc8 Tirar d\u00favidas da equipe",
          "\ud83d\udcc8 Alinhar estrat\u00e9gia e execu\u00e7\u00e3o de tr\u00e1fego"
        ]
      }
    ];

    // Criar individual para garantir
    const criados = [];
    for (const template of templates) {
      try {
        const criado = await base44.entities.TemplateBacklog.create(template);
        criados.push(criado);
      } catch (err) {
        console.warn(`Template "${template.titulo}" não foi criado:`, err.message);
      }
    }
    
    return Response.json({
      success: criados.length > 0,
      message: `${criados.length}/${templates.length} templates criados`,
      criados: criados.length,
      total: templates.length
    });
  } catch (error) {
    console.error('Erro ao criar templates:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});