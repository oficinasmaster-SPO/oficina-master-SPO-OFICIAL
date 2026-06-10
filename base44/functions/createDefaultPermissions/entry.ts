import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// === DEPRECATED 2026-06-10 ===
// UserPermission.modules_access não é mais consumido pelo PermissionsContext.
// A fonte canônica é Employee.profile_id → UserProfile.roles.
// Esta função criava dados órfãos (UserPermission) que nunca eram lidos para autorização.
// Mantida como stub para não quebrar chamadores — apenas loga e retorna sucesso vazio.

// Define permissões padrão por job_role (mantido para referência histórica)
const DEFAULT_PERMISSIONS = {
  // SÓCIO - Acesso completo
  socio: {
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

  socio_interno: {
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
      admin: { users: true, permissions: true, settings: true }
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
  try {
    const { user_id, workshop_id, job_role } = await req.json();
    
    console.warn('⚠️ createDefaultPermissions está depreciada (2026-06-10).');
    console.warn('   UserPermission.modules_access não é mais fonte de autorização.');
    console.warn('   A fonte canônica é Employee.profile_id → UserProfile.roles.');
    console.warn(`   Chamada recebida: user=${user_id} workshop=${workshop_id} role=${job_role} — ignorada.`);
    
    return Response.json({ 
      success: true, 
      deprecated: true,
      message: 'Função depreciada. UserProfile.roles é a fonte canônica de permissões.',
      permission_level: 'n/a'
    });
  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});