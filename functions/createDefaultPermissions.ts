import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Define permissões padrão por job_role
const DEFAULT_PERMISSIONS = {
  // DIRETORIA - Acesso completo
  diretor: {
    permission_level: "admin",
    modules_access: {
      dashboard: { view: true, edit: true },
      cadastros: { view: true, edit: true, delete: true },
      patio: { view: true, edit: true },
      resultados: { view: true, edit: true },
      pessoas: { view: true, edit: true, delete: true },
      diagnosticos: { view: true, create: true },
      processos: { view: true, edit: true },
      documentos: { view: true, upload: true, delete: true },
      cultura: { view: true, edit: true },
      treinamentos: { view: true, create: true, manage: true },
      gestao: { view: true, edit: true },
      admin: { users: true, permissions: true, settings: true }
    }
  },

  // SUPERVISOR - Quase completo, sem admin
  supervisor_loja: {
    permission_level: "editor",
    modules_access: {
      dashboard: { view: true, edit: true },
      cadastros: { view: true, edit: true, delete: false },
      patio: { view: true, edit: true },
      resultados: { view: true, edit: true },
      pessoas: { view: true, edit: true, delete: false },
      diagnosticos: { view: true, create: true },
      processos: { view: true, edit: true },
      documentos: { view: true, upload: true, delete: false },
      cultura: { view: true, edit: true },
      treinamentos: { view: true, create: true, manage: true },
      gestao: { view: true, edit: true },
      admin: { users: false, permissions: false, settings: false }
    }
  },

  // GERENTE - Acesso gerencial
  gerente: {
    permission_level: "editor",
    modules_access: {
      dashboard: { view: true, edit: false },
      cadastros: { view: true, edit: true, delete: false },
      patio: { view: true, edit: true },
      resultados: { view: true, edit: false },
      pessoas: { view: true, edit: true, delete: false },
      diagnosticos: { view: true, create: true },
      processos: { view: true, edit: false },
      documentos: { view: true, upload: true, delete: false },
      cultura: { view: true, edit: false },
      treinamentos: { view: true, create: false, manage: true },
      gestao: { view: true, edit: false },
      admin: { users: false, permissions: false, settings: false }
    }
  },

  // LÍDER TÉCNICO - Foco operacional + gerenciamento de equipe
  lider_tecnico: {
    permission_level: "personalizado",
    modules_access: {
      dashboard: { view: true, edit: false },
      cadastros: { view: false, edit: false, delete: false },
      patio: { view: true, edit: true },
      resultados: { view: true, edit: false },
      pessoas: { view: true, edit: false, delete: false },
      diagnosticos: { view: true, create: false },
      processos: { view: true, edit: false },
      documentos: { view: true, upload: false, delete: false },
      cultura: { view: true, edit: false },
      treinamentos: { view: true, create: false, manage: false },
      gestao: { view: false, edit: false },
      admin: { users: false, permissions: false, settings: false }
    }
  },

  // TÉCNICO - Apenas operacional
  tecnico: {
    permission_level: "personalizado",
    modules_access: {
      dashboard: { view: true, edit: false },
      cadastros: { view: false, edit: false, delete: false },
      patio: { view: true, edit: true },
      resultados: { view: false, edit: false },
      pessoas: { view: false, edit: false, delete: false },
      diagnosticos: { view: false, create: false },
      processos: { view: true, edit: false },
      documentos: { view: true, upload: false, delete: false },
      cultura: { view: true, edit: false },
      treinamentos: { view: true, create: false, manage: false },
      gestao: { view: false, edit: false },
      admin: { users: false, permissions: false, settings: false }
    }
  },

  // COMERCIAL / CONSULTOR VENDAS - Foco em vendas
  comercial: {
    permission_level: "personalizado",
    modules_access: {
      dashboard: { view: true, edit: false },
      cadastros: { view: false, edit: false, delete: false },
      patio: { view: true, edit: false },
      resultados: { view: true, edit: false },
      pessoas: { view: false, edit: false, delete: false },
      diagnosticos: { view: true, create: false },
      processos: { view: true, edit: false },
      documentos: { view: true, upload: false, delete: false },
      cultura: { view: true, edit: false },
      treinamentos: { view: true, create: false, manage: false },
      gestao: { view: false, edit: false },
      admin: { users: false, permissions: false, settings: false }
    }
  },

  consultor_vendas: {
    permission_level: "personalizado",
    modules_access: {
      dashboard: { view: true, edit: false },
      cadastros: { view: false, edit: false, delete: false },
      patio: { view: true, edit: false },
      resultados: { view: true, edit: false },
      pessoas: { view: false, edit: false, delete: false },
      diagnosticos: { view: true, create: false },
      processos: { view: true, edit: false },
      documentos: { view: true, upload: false, delete: false },
      cultura: { view: true, edit: false },
      treinamentos: { view: true, create: false, manage: false },
      gestao: { view: false, edit: false },
      admin: { users: false, permissions: false, settings: false }
    }
  },

  // MARKETING
  marketing: {
    permission_level: "personalizado",
    modules_access: {
      dashboard: { view: true, edit: false },
      cadastros: { view: false, edit: false, delete: false },
      patio: { view: true, edit: false },
      resultados: { view: true, edit: false },
      pessoas: { view: false, edit: false, delete: false },
      diagnosticos: { view: true, create: false },
      processos: { view: true, edit: false },
      documentos: { view: true, upload: true, delete: false },
      cultura: { view: true, edit: false },
      treinamentos: { view: true, create: false, manage: false },
      gestao: { view: false, edit: false },
      admin: { users: false, permissions: false, settings: false }
    }
  },

  // CLOSER - Foco em fechamento
  closer: {
    permission_level: "personalizado",
    modules_access: {
      dashboard: { view: true, edit: false },
      cadastros: { view: false, edit: false, delete: false },
      patio: { view: true, edit: false },
      resultados: { view: true, edit: false },
      pessoas: { view: false, edit: false, delete: false },
      diagnosticos: { view: true, create: true },
      processos: { view: true, edit: false },
      documentos: { view: true, upload: true, delete: true }, // Closer pode precisar deletar contratos errados
      cultura: { view: true, edit: false },
      treinamentos: { view: true, create: false, manage: false },
      gestao: { view: false, edit: false },
      admin: { users: false, permissions: false, settings: false }
    }
  },

  // FINANCEIRO - Acesso a resultados
  financeiro: {
    permission_level: "personalizado",
    modules_access: {
      dashboard: { view: true, edit: false },
      cadastros: { view: true, edit: false, delete: false },
      patio: { view: false, edit: false },
      resultados: { view: true, edit: true },
      pessoas: { view: true, edit: false, delete: false },
      diagnosticos: { view: true, create: false },
      processos: { view: true, edit: false },
      documentos: { view: true, upload: true, delete: false },
      cultura: { view: true, edit: false },
      treinamentos: { view: true, create: false, manage: false },
      gestao: { view: true, edit: false },
      admin: { users: false, permissions: false, settings: false }
    }
  },

  // RH
  rh: {
    permission_level: "personalizado",
    modules_access: {
      dashboard: { view: true, edit: false },
      cadastros: { view: true, edit: true, delete: false },
      patio: { view: false, edit: false },
      resultados: { view: true, edit: false },
      pessoas: { view: true, edit: true, delete: false },
      diagnosticos: { view: true, create: true },
      processos: { view: true, edit: true },
      documentos: { view: true, upload: true, delete: false },
      cultura: { view: true, edit: true },
      treinamentos: { view: true, create: true, manage: true },
      gestao: { view: true, edit: false },
      admin: { users: false, permissions: false, settings: false }
    }
  },

  // FUNILARIA/PINTURA - Similar a técnico
  funilaria_pintura: {
    permission_level: "personalizado",
    modules_access: {
      dashboard: { view: true, edit: false },
      cadastros: { view: false, edit: false, delete: false },
      patio: { view: true, edit: true },
      resultados: { view: false, edit: false },
      pessoas: { view: false, edit: false, delete: false },
      diagnosticos: { view: false, create: false },
      processos: { view: true, edit: false },
      documentos: { view: true, upload: false, delete: false },
      cultura: { view: true, edit: false },
      treinamentos: { view: true, create: false, manage: false },
      gestao: { view: false, edit: false },
      admin: { users: false, permissions: false, settings: false }
    }
  },

  // ESTOQUE
  estoque: {
    permission_level: "personalizado",
    modules_access: {
      dashboard: { view: true, edit: false },
      cadastros: { view: false, edit: false, delete: false },
      patio: { view: true, edit: false },
      resultados: { view: false, edit: false },
      pessoas: { view: false, edit: false, delete: false },
      diagnosticos: { view: false, create: false },
      processos: { view: true, edit: false },
      documentos: { view: true, upload: false, delete: false },
      cultura: { view: true, edit: false },
      treinamentos: { view: true, create: false, manage: false },
      gestao: { view: false, edit: false },
      admin: { users: false, permissions: false, settings: false }
    }
  },

  // ADMINISTRATIVO
  administrativo: {
    permission_level: "personalizado",
    modules_access: {
      dashboard: { view: true, edit: false },
      cadastros: { view: true, edit: false, delete: false },
      patio: { view: true, edit: false },
      resultados: { view: true, edit: false },
      pessoas: { view: true, edit: false, delete: false },
      diagnosticos: { view: true, create: false },
      processos: { view: true, edit: false },
      documentos: { view: true, upload: true, delete: false },
      cultura: { view: true, edit: false },
      treinamentos: { view: true, create: false, manage: false },
      gestao: { view: true, edit: false },
      admin: { users: false, permissions: false, settings: false }
    }
  },

  // MOTOBOY, LAVADOR - Acesso mínimo
  motoboy: {
    permission_level: "visualizador",
    modules_access: {
      dashboard: { view: true, edit: false },
      cadastros: { view: false, edit: false, delete: false },
      patio: { view: true, edit: false },
      resultados: { view: false, edit: false },
      pessoas: { view: false, edit: false, delete: false },
      diagnosticos: { view: false, create: false },
      processos: { view: true, edit: false },
      documentos: { view: false, upload: false, delete: false },
      cultura: { view: true, edit: false },
      treinamentos: { view: true, create: false, manage: false },
      gestao: { view: false, edit: false },
      admin: { users: false, permissions: false, settings: false }
    }
  },

  lavador: {
    permission_level: "visualizador",
    modules_access: {
      dashboard: { view: true, edit: false },
      cadastros: { view: false, edit: false, delete: false },
      patio: { view: true, edit: false },
      resultados: { view: false, edit: false },
      pessoas: { view: false, edit: false, delete: false },
      diagnosticos: { view: false, create: false },
      processos: { view: true, edit: false },
      documentos: { view: false, upload: false, delete: false },
      cultura: { view: true, edit: false },
      treinamentos: { view: true, create: false, manage: false },
      gestao: { view: false, edit: false },
      admin: { users: false, permissions: false, settings: false }
    }
  },

  // OUTROS - Padrão básico
  outros: {
    permission_level: "visualizador",
    modules_access: {
      dashboard: { view: true, edit: false },
      cadastros: { view: false, edit: false, delete: false },
      patio: { view: true, edit: false },
      resultados: { view: false, edit: false },
      pessoas: { view: false, edit: false, delete: false },
      diagnosticos: { view: false, create: false },
      processos: { view: true, edit: false },
      documentos: { view: true, upload: false, delete: false },
      cultura: { view: true, edit: false },
      treinamentos: { view: true, create: false, manage: false },
      gestao: { view: false, edit: false },
      admin: { users: false, permissions: false, settings: false }
    }
  },

  // PROPRIETÁRIO/OWNER - Acesso completo igual a diretor
  owner: {
    permission_level: "admin",
    modules_access: {
      dashboard: { view: true, edit: true },
      cadastros: { view: true, edit: true, delete: true },
      patio: { view: true, edit: true },
      resultados: { view: true, edit: true },
      pessoas: { view: true, edit: true, delete: true },
      diagnosticos: { view: true, create: true },
      processos: { view: true, edit: true },
      documentos: { view: true, upload: true, delete: true },
      cultura: { view: true, edit: true },
      treinamentos: { view: true, create: true, manage: true },
      gestao: { view: true, edit: true },
      admin: { users: true, permissions: true, settings: true }
    }
  }
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const { user_id, workshop_id, job_role } = await req.json();

    if (!user_id || !workshop_id || !job_role) {
      return Response.json({ 
        success: false, 
        error: 'user_id, workshop_id e job_role são obrigatórios' 
      }, { status: 400 });
    }

    // Buscar permissões padrão para o job_role
    const defaultPerms = DEFAULT_PERMISSIONS[job_role] || DEFAULT_PERMISSIONS.outros;

    console.log("🔧 Criando permissões para:", job_role);
    console.log("📋 Permissões aplicadas:", defaultPerms.permission_level);

    // Verificar se já existe permissão para este usuário
    const existing = await base44.asServiceRole.entities.UserPermission.filter({ 
      user_id: user_id,
      workshop_id: workshop_id
    });

    let permission;
    if (existing && existing.length > 0) {
      // Atualizar existente
      permission = await base44.asServiceRole.entities.UserPermission.update(existing[0].id, {
        ...defaultPerms,
        is_active: true
      });
      console.log("✅ Permissões atualizadas para user:", user_id);
    } else {
      // Criar nova
      permission = await base44.asServiceRole.entities.UserPermission.create({
        user_id: user_id,
        workshop_id: workshop_id,
        ...defaultPerms,
        is_active: true
      });
      console.log("✅ Permissões criadas para user:", user_id);
    }

    return Response.json({ 
      success: true, 
      permission_id: permission.id,
      permission_level: defaultPerms.permission_level
    });

  } catch (error) {
    console.error('❌ Erro ao criar permissões:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});