import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import OpenAI from 'npm:openai';

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY")
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cargo, area, workshop_id } = await req.json();

    if (!cargo || !area) {
      return Response.json({ 
        error: 'Cargo e área são obrigatórios' 
      }, { status: 400 });
    }

    // Buscar colaboradores existentes para aprendizado
    const allEmployees = await base44.asServiceRole.entities.Employee.list();
    const similarEmployees = allEmployees
      .filter(e => e.workshop_id === workshop_id || !workshop_id)
      .filter(e => e.position && e.job_role && e.area)
      .slice(0, 20); // Limitar para não exceder token limit

    // Buscar perfis de usuário disponíveis
    const userProfiles = await base44.asServiceRole.entities.UserProfile.list();
    const activeProfiles = (userProfiles || []).filter(p => p.status === 'ativo');

    // Preparar contexto para a IA
    const historicalData = similarEmployees.map(e => ({
      cargo: e.position,
      area: e.area,
      job_role: e.job_role
    }));

    const availableJobRoles = [
      "socio", "diretor", "supervisor_loja", "gerente", "lider_tecnico",
      "financeiro", "rh", "tecnico", "funilaria_pintura", "comercial",
      "consultor_vendas", "marketing", "estoque", "administrativo",
      "motoboy", "lavador", "acelerador", "consultor", "outros"
    ];

    const availableProfiles = activeProfiles.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      job_roles: p.job_roles || []
    }));

    const prompt = `Você é um especialista em RH e gestão de pessoas para oficinas automotivas.

Analise o seguinte perfil de novo colaborador:
- Cargo: ${cargo}
- Área: ${area}

Histórico de colaboradores similares na empresa:
${JSON.stringify(historicalData, null, 2)}

Funções (job_role) disponíveis:
${availableJobRoles.join(', ')}

Perfis de acesso disponíveis:
${JSON.stringify(availableProfiles, null, 2)}

Com base nisso, sugira:
1. O job_role mais adequado
2. O perfil de acesso mais adequado (se houver match)
3. Lista de recursos/módulos que esse colaborador provavelmente precisará:
   - Dashboard, Colaboradores, Tarefas, Metas, Diagnósticos, Processos, Documentos, Cultura, Treinamentos, etc.

Retorne APENAS um JSON válido no formato:
{
  "job_role": "string",
  "job_role_confidence": "number (0-100)",
  "job_role_reasoning": "string explicando o motivo",
  "suggested_profile_id": "string ou null",
  "suggested_profile_name": "string ou null",
  "recommended_modules": ["string"],
  "onboarding_tips": ["string com 3-5 dicas práticas para o gestor"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Você é um especialista em RH para oficinas automotivas. Retorne apenas JSON válido, sem markdown."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const suggestion = JSON.parse(response.choices[0].message.content);

    return Response.json({
      success: true,
      suggestion,
      historical_data_used: historicalData.length,
      profiles_available: availableProfiles.length
    });

  } catch (error) {
    console.error("Error in suggestEmployeeProfile:", error);
    return Response.json({ 
      error: error.message || 'Erro ao gerar sugestões' 
    }, { status: 500 });
  }
});