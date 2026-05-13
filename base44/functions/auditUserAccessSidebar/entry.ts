import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const adminUser = await base44.auth.me();

    if (!adminUser || adminUser.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email required' }, { status: 400 });
    }

    // 1. Buscar usuário por email
    const users = await base44.entities.User.filter({ email }, '-created_date', 1);
    if (!users || users.length === 0) {
      return Response.json({
        status: 'ERROR',
        message: 'Usuário não encontrado',
        email
      }, { status: 404 });
    }

    const user = users[0];

    // 2. Buscar workshops do usuário
    const workshops = await base44.entities.Workshop.filter(
      { owner_id: user.id },
      '-created_date',
      10
    );

    // 3. Se tiver workshop, buscar Employee records
    let employeeCount = 0;
    let employeeAccessCheck = null;

    if (workshops && workshops.length > 0) {
      try {
        const employees = await base44.entities.Employee.filter(
          { workshop_id: workshops[0].id },
          '-created_date',
          500
        );
        employeeCount = employees ? employees.length : 0;
        employeeAccessCheck = 'SUCCESS';
      } catch (employeeError) {
        employeeAccessCheck = `ERROR: ${employeeError.message}`;
      }
    }

    // 4. Verificar permissões no User
    const userPermissions = user.permissions || [];
    const hasColaboradorPermission = userPermissions.some(p => 
      p.includes('colaborador') || 
      p.includes('employee') || 
      p.includes('Colaboradores')
    );

    // 5. Resumo de Acesso
    const auditReport = {
      status: 'ANALYSIS_COMPLETE',
      timestamp: new Date().toISOString(),
      usuario: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        workshop_id: user.data?.workshop_id || user.workshop_id,
        is_proprietario: user.role === 'admin' || user.data?.profile === 'Sócio/Proprietário'
      },
      workshops: {
        count: workshops ? workshops.length : 0,
        lista: workshops ? workshops.map(w => ({
          id: w.id,
          name: w.name,
          status: w.status,
          owner_id: w.owner_id,
          is_owner: w.owner_id === user.id
        })) : []
      },
      colaboradores: {
        count: employeeCount,
        access_check: employeeAccessCheck
      },
      permissions: {
        user_permissions_count: userPermissions.length,
        has_colaborador_permission: hasColaboradorPermission,
        full_permissions: userPermissions
      },
      possivel_problema: {
        'Não tem workshop associado': workshops && workshops.length === 0,
        'Não tem permissão de Colaboradores': !hasColaboradorPermission,
        'Erro ao acessar Employee': employeeAccessCheck && employeeAccessCheck.includes('ERROR')
      },
      recomendacoes: gerarRecomendacoes(
        workshops,
        hasColaboradorPermission,
        employeeAccessCheck,
        user
      )
    };

    return Response.json(auditReport);

  } catch (error) {
    console.error('Erro na auditoria:', error);
    return Response.json(
      { error: error.message, status: 'AUDIT_FAILED' },
      { status: 500 }
    );
  }
});

function gerarRecomendacoes(workshops, hasPermission, employeeCheck, user) {
  const recomendacoes = [];

  if (!workshops || workshops.length === 0) {
    recomendacoes.push('🔴 CRÍTICO: Usuário não tem workshop vinculado. Verificar se owner_id está correto no Workshop.');
  }

  if (!hasPermission) {
    recomendacoes.push('🔴 CRÍTICO: Usuário não tem permissão "Colaboradores". Sync de permissões pode estar quebrado.');
  }

  if (employeeCheck && employeeCheck.includes('ERROR')) {
    recomendacoes.push(`🔴 CRÍTICO: Erro ao acessar Employee records - ${employeeCheck}`);
  }

  if (hasPermission && employeeCheck === 'SUCCESS') {
    recomendacoes.push('✅ Permissões OK. Problema pode ser no frontend/sidebar render.');
  }

  recomendacoes.push('🔧 AÇÃO: Verifique sidebar structure rules em /components/lib/sidebarStructure');
  
  return recomendacoes;
}