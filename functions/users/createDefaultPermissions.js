import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Define permissões padrão por job_role
const DEFAULT_PERMISSIONS = {
  // DIRETORIA / SÓCIO - Admin total
  diretor: {
    permission_level: "admin",
    modules_access: {
      dashboard: { view, edit },
      cadastros: { view, edit, delete },
      patio: { view, edit },
      resultados: { view, edit },
      pessoas: { view, edit, delete },
      diagnosticos: { view, create },
      processos: { view, edit },
      documentos: { view, upload, delete },
      cultura: { view, edit },
      treinamentos: { view, create, manage },
      gestao: { view, edit },
      admin: { users, permissions, settings }
    }
  },

  socio: {
    permission_level: "admin",
    modules_access: {
      dashboard: { view, edit },
      cadastros: { view, edit, delete },
      patio: { view, edit },
      resultados: { view, edit },
      pessoas: { view, edit, delete },
      diagnosticos: { view, create },
      processos: { view, edit },
      documentos: { view, upload, delete },
      cultura: { view, edit },
      treinamentos: { view, create, manage },
      gestao: { view, edit },
      admin: { users, permissions, settings }
    }
  },

  // SUPERVISOR / GERENTE - Gestão operacional sem admin do sistema
  supervisor_loja: {
    permission_level: "editor",
    modules_access: {
      dashboard: { view, edit },
      cadastros: { view, edit, delete },
      patio: { view, edit },
      resultados: { view, edit },
      pessoas: { view, edit, delete },
      diagnosticos: { view, create },
      processos: { view, edit },
      documentos: { view, upload, delete },
      cultura: { view, edit },
      treinamentos: { view, create, manage },
      gestao: { view, edit },
      admin: { users, permissions, settings }
    }
  },

  gerente: {
    permission_level: "editor",
    modules_access: {
      dashboard: { view, edit },
      cadastros: { view, edit, delete },
      patio: { view, edit },
      resultados: { view, edit },
      pessoas: { view, edit, delete },
      diagnosticos: { view, create },
      processos: { view, edit },
      documentos: { view, upload, delete },
      cultura: { view, edit },
      treinamentos: { view, create, manage },
      gestao: { view, edit },
      admin: { users, permissions, settings }
    }
  },

  // FINANCEIRO - Foco em DRE e Resultados
  financeiro: {
    permission_level: "personalizado",
    modules_access: {
      dashboard: { view, edit },
      cadastros: { view, edit, delete },
      patio: { view, edit },
      resultados: { view, edit },
      pessoas: { view, edit, delete },
      diagnosticos: { view, create },
      processos: { view, edit },
      documentos: { view, upload, delete },
      cultura: { view, edit },
      treinamentos: { view, create, manage },
      gestao: { view, edit },
      admin: { users, permissions, settings }
    }
  },

  // RH
  rh: {
    permission_level: "personalizado",
    modules_access: {
      dashboard: { view, edit },
      cadastros: { view, edit, delete },
      patio: { view, edit },
      resultados: { view, edit },
      pessoas: { view, edit, delete },
      diagnosticos: { view, create },
      processos: { view, edit },
      documentos: { view, upload, delete },
      cultura: { view, edit },
      treinamentos: { view, create, manage },
      gestao: { view, edit },
      admin: { users, permissions, settings }
    }
  },

  // LÍDER TÉCNICO - Operacional + Gestão leve
  lider_tecnico: {
    permission_level: "personalizado",
    modules_access: {
      dashboard: { view, edit },
      cadastros: { view, edit, delete },
      patio: { view, edit },
      resultados: { view, edit },
      pessoas: { view, edit, delete },
      diagnosticos: { view, create },
      processos: { view, edit },
      documentos: { view, upload, delete },
      cultura: { view, edit },
      treinamentos: { view, create, manage },
      gestao: { view, edit },
      admin: { users, permissions, settings }
    }
  },

  // TÉCNICO / FUNILARIA / PINTURA - Operacional
  tecnico: {
    permission_level: "personalizado",
    modules_access: {
      dashboard: { view, edit },
      cadastros: { view, edit, delete },
      patio: { view, edit },
      resultados: { view, edit },
      pessoas: { view, edit, delete },
      diagnosticos: { view, create },
      processos: { view, edit },
      documentos: { view, upload, delete },
      cultura: { view, edit },
      treinamentos: { view, create, manage },
      gestao: { view, edit },
      admin: { users, permissions, settings }
    }
  },

  funilaria_pintura: {
    permission_level: "personalizado",
    modules_access: {
      dashboard: { view, edit },
      cadastros: { view, edit, delete },
      patio: { view, edit },
      resultados: { view, edit },
      pessoas: { view, edit, delete },
      diagnosticos: { view, create },
      processos: { view, edit },
      documentos: { view, upload, delete },
      cultura: { view, edit },
      treinamentos: { view, create, manage },
      gestao: { view, edit },
      admin: { users, permissions, settings }
    }
  },

  // COMERCIAL / VENDAS
  comercial: {
    permission_level: "personalizado",
    modules_access: {
      dashboard: { view, edit },
      cadastros: { view, edit, delete },
      patio: { view, edit },
      resultados: { view, edit },
      pessoas: { view, edit, delete },
      diagnosticos: { view, create },
      processos: { view, edit },
      documentos: { view, upload, delete },
      cultura: { view, edit },
      treinamentos: { view, create, manage },
      gestao: { view, edit },
      admin: { users, permissions, settings }
    }
  },

  consultor_vendas: {
    permission_level: "personalizado",
    modules_access: {
      dashboard: { view, edit },
      cadastros: { view, edit, delete },
      patio: { view, edit },
      resultados: { view, edit },
      pessoas: { view, edit, delete },
      diagnosticos: { view, create },
      processos: { view, edit },
      documentos: { view, upload, delete },
      cultura: { view, edit },
      treinamentos: { view, create, manage },
      gestao: { view, edit },
      admin: { users, permissions, settings }
    }
  },

  // CLOSER - Foco em fechamento
  closer: {
    permission_level: "personalizado",
    modules_access: {
      dashboard: { view, edit },
      cadastros: { view, edit, delete },
      patio: { view, edit },
      resultados: { view, edit },
      pessoas: { view, edit, delete },
      diagnosticos: { view, create },
      processos: { view, edit },
      documentos: { view, upload, delete }, // Closer pode precisar deletar contratos errados
      cultura: { view, edit },
      treinamentos: { view, create, manage },
      gestao: { view, edit },
      admin: { users, permissions, settings }
    }
  },

  // EXTRAPOLADOS / APOIO - Visualização básica
  estoque: {
    permission_level: "personalizado",
    modules_access: {
      dashboard: { view, edit },
      cadastros: { view, edit, delete },
      patio: { view, edit },
      resultados: { view, edit },
      pessoas: { view, edit, delete },
      diagnosticos: { view, create },
      processos: { view, edit },
      documentos: { view, upload, delete },
      cultura: { view, edit },
      treinamentos: { view, create, manage },
      gestao: { view, edit },
      admin: { users, permissions, settings }
    }
  },

  motoboy: {
    permission_level: "visualizador",
    modules_access: {
      dashboard: { view, edit },
      cadastros: { view, edit, delete },
      patio: { view, edit },
      resultados: { view, edit },
      pessoas: { view, edit, delete },
      diagnosticos: { view, create },
      processos: { view, edit },
      documentos: { view, upload, delete },
      cultura: { view, edit },
      treinamentos: { view, create, manage },
      gestao: { view, edit },
      admin: { users, permissions, settings }
    }
  },

  lavador: {
    permission_level: "visualizador",
    modules_access: {
      dashboard: { view, edit },
      cadastros: { view, edit, delete },
      patio: { view, edit },
      resultados: { view, edit },
      pessoas: { view, edit, delete },
      diagnosticos: { view, create },
      processos: { view, edit },
      documentos: { view, upload, delete },
      cultura: { view, edit },
      treinamentos: { view, create, manage },
      gestao: { view, edit },
      admin: { users, permissions, settings }
    }
  },

  // OWNER - Acesso completo
  owner: {
    permission_level: "admin",
    modules_access: {
      dashboard: { view, edit },
      cadastros: { view, edit, delete },
      patio: { view, edit },
      resultados: { view, edit },
      pessoas: { view, edit, delete },
      diagnosticos: { view, create },
      processos: { view, edit },
      documentos: { view, upload, delete },
      cultura: { view, edit },
      treinamentos: { view, create, manage },
      gestao: { view, edit },
      admin: { users, permissions, settings }
    }
  },

  // OUTROS
  outros: {
    permission_level: "visualizador",
    modules_access: {
      dashboard: { view, edit },
      cadastros: { view, edit, delete },
      patio: { view, edit },
      resultados: { view, edit },
      pessoas: { view, edit, delete },
      diagnosticos: { view, create },
      processos: { view, edit },
      documentos: { view, upload, delete },
      cultura: { view, edit },
      treinamentos: { view, create, manage },
      gestao: { view, edit },
      admin: { users, permissions, settings }
    }
  }
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const { user_id, workshop_id, job_role } = await req.json();

    if (!user_id || !workshop_id || !job_role) {
      return Response.json({
        success,
        error: 'user_id, workshop_id e job_role são obrigatórios'
      }, { status: 400 });
    }

    // Buscar permissões padrão para o job_role
    const defaultPerms = DEFAULT_PERMISSIONS[job_role] || DEFAULT_PERMISSIONS.outros;

    console.log("🔧 Criando permissões para:", job_role);
    console.log("📋 Permissões aplicadas:", defaultPerms.permission_level);

    // Verificar se já existe permissão para este usuário
    const existing = await base44.asServiceRole.entities.UserPermission.filter({
      user_id,
      workshop_id
    });

    let permission;
    if (existing && existing.length > 0) {
      // Atualizar existente
      permission = await base44.asServiceRole.entities.UserPermission.update(existing[0].id, {
        ...defaultPerms,
        is_active
      });
      console.log("✅ Permissões atualizadas para user:", user_id);
    } else {
      // Criar nova
      permission = await base44.asServiceRole.entities.UserPermission.create({
        user_id,
        workshop_id,
        ...defaultPerms,
        is_active
      });
      console.log("✅ Permissões criadas para user:", user_id);
    }

    return Response.json({
      success,
      permission_id.id,
      permission_level.permission_level
    });

  } catch (error) {
    console.error('❌ Erro ao criar permissões:', error);
    return Response.json({
      success,
      error instanceof Error ? error.message (error)
    }, { status: 500 });
  }
});
