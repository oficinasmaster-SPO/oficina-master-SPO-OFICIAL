import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Mapeamento de páginas para códigos de funcionalidade/módulo
const PAGE_TO_MODULE_MAP = {
  // Diagnósticos
  '/Questionario': 'DIAG',
  '/DiagnosticoEmpresario': 'EMPR',
  '/DiagnosticoDISC': 'DISC',
  '/DiagnosticoMaturidade': 'MAT',
  '/DiagnosticoProducao': 'PROD',
  '/DiagnosticoDesempenho': 'DESEMP',
  '/PesquisaClima': 'CLIMA',
  '/DiagnosticoOS': 'TCMP2',
  
  // Implementações
  '/GestaoOficina': 'CADAS',
  '/DRETCMP2': 'DRE',
  '/Tarefas': 'TAREFAS',
  '/DesdobramentoMeta': 'DESM',
  '/RegistroDiario': 'REGDIA',
  '/MissaoVisaoValores': 'MVV',
  '/CulturaOrganizacional': 'CULT',
  '/MeusProcessos': 'MAPS',
  '/RituaisAculturamento': 'RITUAL',
  '/GerenciarTreinamentos': 'TREN',
  '/Colaboradores': 'COLAB',
  '/CDCList': 'CDC',
  '/COEXList': 'COEX',
  
  // Fase 4
  '/Dashboard': 'RANKING',
  '/DashboardOverview': 'DASHOV',
  '/IAAnalytics': 'AUTOM',
  '/HistoricoMetas': 'HMETRIC',
  '/Gamificacao': 'CERT'
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workshop_id, page_path } = await req.json();

    if (!workshop_id || !page_path) {
      return Response.json({ error: 'workshop_id e page_path são obrigatórios' }, { status: 400 });
    }

    const module_code = PAGE_TO_MODULE_MAP[page_path];
    
    // Se a página não está mapeada, ignorar
    if (!module_code) {
      return Response.json({ success: true, message: 'Página não rastreada' });
    }

    // Buscar item existente no cronograma
    const existingItems = await base44.asServiceRole.entities.CronogramaImplementacao.filter({
      workshop_id,
      item_id: module_code
    });

    const hoje = new Date();
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    // Se não existe, criar novo registro
    if (!existingItems || existingItems.length === 0) {
      const created = await base44.asServiceRole.entities.CronogramaImplementacao.create({
        workshop_id,
        item_id: module_code,
        item_nome: page_path.replace('/', '').replace(/([A-Z])/g, ' $1').trim(),
        item_tipo: 'funcionalidade',
        status: 'em_andamento',
        data_inicio_previsto: hoje.toISOString().split('T')[0],
        data_inicio_real: amanha.toISOString().split('T')[0],
        data_termino_previsto: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        progresso_percentual: 0,
        historico_alteracoes: [{
          data_alteracao: new Date().toISOString(),
          campo_alterado: 'acesso_inicial',
          valor_anterior: '',
          valor_novo: 'Página acessada pela primeira vez',
          usuario_id: user.id,
          usuario_nome: user.full_name
        }]
      });

      return Response.json({ 
        success: true, 
        action: 'created',
        item: created 
      });
    }

    // Se já existe, atualizar status para em_andamento se estiver a_fazer
    const item = existingItems[0];
    const historicoAtualizado = [...(item.historico_alteracoes || []), {
      data_alteracao: new Date().toISOString(),
      campo_alterado: 'acesso',
      valor_anterior: '',
      valor_novo: 'Página acessada novamente',
      usuario_id: user.id,
      usuario_nome: user.full_name
    }];

    const updateData = {
      historico_alteracoes: historicoAtualizado
    };

    // Se o item está "a_fazer", mudar para "em_andamento" no acesso
    if (item.status === 'a_fazer') {
      updateData.status = 'em_andamento';
      updateData.data_inicio_real = new Date().toISOString().split('T')[0];
      historicoAtualizado.push({
        data_alteracao: new Date().toISOString(),
        campo_alterado: 'status',
        valor_anterior: 'a_fazer',
        valor_novo: 'em_andamento',
        usuario_id: user.id,
        usuario_nome: user.full_name
      });
    }

    await base44.asServiceRole.entities.CronogramaImplementacao.update(item.id, updateData);

    return Response.json({ 
      success: true,
      action: 'updated',
      item: item
    });

  } catch (error) {
    console.error('Erro ao rastrear acesso ao módulo:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});