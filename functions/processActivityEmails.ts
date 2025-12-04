import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default async function(req) {
  const base44 = createClientFromRequest(req);
  
  console.log("[ProcessActivityEmails] Iniciando execução...");

  try {
    // Get request body
    let body = {};
    try { body = await req.json(); } catch (e) {}
    
    const { workshop_id, is_test_run } = body;
    
    // Obter usuário atual para enviar relatório de teste
    let currentUser = null;
    try {
        currentUser = await base44.auth.me();
    } catch (e) {
        console.log("[ProcessActivityEmails] Aviso: Não foi possível identificar usuário atual para relatório.");
    }

    let workshops = [];
    if (workshop_id) {
      const ws = await base44.asServiceRole.entities.Workshop.get(workshop_id);
      if (ws) workshops = [ws];
    } else {
      workshops = await base44.asServiceRole.entities.Workshop.list();
    }

    console.log(`[ProcessActivityEmails] Processando ${workshops.length} oficinas.`);

    const results = {
      processed_workshops: 0,
      emails_sent: 0,
      inactivity_alerts: 0,
      weekly_digests: 0,
      details_log: [], // Para o relatório de teste
      errors: []
    };

    for (const workshop of workshops) {
      console.log(`[ProcessActivityEmails] Analisando oficina: ${workshop.name} (${workshop.id})`);
      
      const settings = workshop.notification_settings || {};
      const emailEnabled = settings.email_enabled !== false;
      const inactivityEnabled = settings.inactivity_alert_enabled !== false;
      const digestEnabled = settings.weekly_digest_enabled !== false;
      
      if (!emailEnabled) {
          console.log(`[ProcessActivityEmails] E-mails desativados para oficina ${workshop.name}`);
          results.details_log.push(`Oficina ${workshop.name}: E-mails desativados nas configurações.`);
          continue;
      }

      const inactivityThreshold = settings.inactivity_threshold_days || 7;
      
      try {
        // Buscar colaboradores ativos
        const employees = await base44.asServiceRole.entities.Employee.filter({ 
          workshop_id: workshop.id,
          status: 'ativo'
        });
        
        console.log(`[ProcessActivityEmails] Encontrados ${employees.length} colaboradores ativos.`);
        
        if (!employees || employees.length === 0) {
            results.details_log.push(`Oficina ${workshop.name}: Nenhum colaborador ativo encontrado.`);
            continue;
        }
        
        // Otimização: Buscar apenas UserProgress relevantes se possível, ou listar todos
        const allProgress = await base44.asServiceRole.entities.UserProgress.list();
        const allUsers = await base44.asServiceRole.entities.User.list();
        
        for (const emp of employees) {
          if (!emp.email) {
              console.log(`[ProcessActivityEmails] Colaborador ${emp.full_name} sem e-mail cadastrado.`);
              continue;
          }
          
          // Tenta encontrar o User correspondente
          const user = allUsers.find(u => u.email === emp.email);
          
          if (!user) {
              console.log(`[ProcessActivityEmails] Usuário não encontrado para o e-mail ${emp.email} (Colaborador: ${emp.full_name})`);
              // Se não tem usuário, não tem como ter logado.
              // Opcional: Enviar convite de "Ative sua conta"? Por enquanto ignoramos.
              continue; 
          }
          
          // Encontrar progresso
          const progress = allProgress.find(p => p.user_id === user.id);
          
          // Se não tem progresso ou last_login_date, nunca logou ou erro de dados
          if (!progress || !progress.last_login_date) {
              console.log(`[ProcessActivityEmails] Sem registro de login para ${emp.full_name}`);
              continue;
          }
          
          const lastLogin = new Date(progress.last_login_date);
          const now = new Date();
          const diffTime = Math.abs(now - lastLogin);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          console.log(`[ProcessActivityEmails] ${emp.full_name}: Último login há ${diffDays} dias.`);

          // Lógica de envio
          let actionTaken = null;

          // 1. Alerta de Inatividade
          if (inactivityEnabled && diffDays >= inactivityThreshold) {
             console.log(`[ProcessActivityEmails] Disparando alerta de inatividade para ${emp.full_name}`);
             await sendInactivityEmail(base44, emp, workshop, diffDays);
             results.inactivity_alerts++;
             results.emails_sent++;
             actionTaken = `Alerta de inatividade enviado (${diffDays} dias sem acesso)`;
          }
          
          // 2. Resumo Semanal (apenas se não estiver inativo)
          // Em modo de teste, forçamos o envio se não caiu na inatividade
          else if (digestEnabled && (is_test_run || isWeeklyDigestDay())) {
            console.log(`[ProcessActivityEmails] Disparando resumo semanal para ${emp.full_name}`);
            await sendWeeklyDigest(base44, emp, workshop);
            results.weekly_digests++;
            results.emails_sent++;
            actionTaken = "Resumo semanal enviado";
          }

          if (actionTaken && is_test_run) {
              results.details_log.push(`${emp.full_name}: ${actionTaken}`);
          }
        }
        
        results.processed_workshops++;
        
      } catch (wsError) {
        console.error(`[ProcessActivityEmails] Erro ao processar oficina ${workshop.name}:`, wsError);
        results.errors.push({ workshop: workshop.name, error: wsError.message });
      }
    }

    // Se for teste, enviar relatório para o admin
    if (is_test_run && currentUser) {
        console.log("[ProcessActivityEmails] Enviando relatório de teste para admin...");
        await sendTestReport(base44, currentUser, results);
    }

    console.log("[ProcessActivityEmails] Concluído.", results);
    return Response.json({ success: true, results });

  } catch (error) {
    console.error("[ProcessActivityEmails] Erro Fatal:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
};

function isWeeklyDigestDay() {
    // Retorna true se for Segunda-feira (dia 1)
    return new Date().getDay() === 1;
}

async function sendInactivityEmail(base44, employee, workshop, days) {
  const subject = `Sentimos sua falta na ${workshop.name}`;
  const body = `
Olá ${employee.full_name.split(' ')[0]},

Percebemos que você não acessa o Portal do Colaborador da ${workshop.name} há ${days} dias.

Acesse agora para verificar suas metas, treinamentos pendentes e novidades da oficina.

Sua evolução é muito importante para nós!

Acesse aqui: https://app.base44.com/Login

Atenciosamente,
Equipe Oficinas Master
  `;
  
  try {
      await base44.integrations.Core.SendEmail({
        to: employee.email,
        subject: subject,
        body: body
      });
  } catch (e) {
      console.error(`Erro ao enviar email para ${employee.email}:`, e);
      throw e;
  }
}

async function sendWeeklyDigest(base44, employee, workshop) {
  const subject = `Resumo Semanal - ${workshop.name}`;
  const body = `
Olá ${employee.full_name.split(' ')[0]},

Aqui está o resumo da sua semana na ${workshop.name}:

- Acesse o portal para ver suas novas tarefas.
- Verifique se há novos treinamentos disponíveis.
- Acompanhe seu progresso nas metas mensais.

Mantenha o ritmo!

Acesse aqui: https://app.base44.com/Login

Atenciosamente,
Equipe Oficinas Master
  `;
  
  try {
      await base44.integrations.Core.SendEmail({
        to: employee.email,
        subject: subject,
        body: body
      });
  } catch (e) {
      console.error(`Erro ao enviar email para ${employee.email}:`, e);
      throw e;
  }
}

async function sendTestReport(base44, user, results) {
    const subject = `Relatório de Teste de Notificações - Oficinas Master`;
    const logContent = results.details_log.length > 0 
        ? results.details_log.join('\n') 
        : "Nenhuma ação foi necessária para os colaboradores atuais (todos podem ter acessado recentemente ou não atendem aos critérios de teste).";

    const body = `
Olá ${user.full_name},

O teste de envio de notificações foi executado com sucesso. Isso confirma que o sistema de e-mails está operando.

Resumo da Execução:
- Oficinas processadas: ${results.processed_workshops}
- Total de e-mails enviados: ${results.emails_sent}
- Alertas de inatividade: ${results.inactivity_alerts}
- Resumos semanais: ${results.weekly_digests}
- Erros: ${results.errors.length}

Detalhes:
${logContent}

Se você recebeu este e-mail, o serviço de envio está funcionando corretamente.

Atenciosamente,
Sistema Oficinas Master
    `;

    await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: subject,
        body: body
    });
}