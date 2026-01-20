import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Inicializa permissões granulares do sistema para roles de sócios e gestores
 * Execute uma única vez ou quando precisar resetar permissões
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Apenas admin pode executar' }, { status: 403 });
    }

    console.log("🔧 Configurando permissões granulares do sistema...");

    // Definição de permissões granulares por job_role
    const granularPermissions = {
      socio: {
        label: "Sócio",
        resources: {
          employees: { actions: ['read', 'create', 'update', 'delete'] },
          workshop: { actions: ['read', 'manage_goals'] },
          financeiro: { actions: ['read'] },
          diagnostics: { actions: ['read', 'create'] },
          processes: { actions: ['read', 'create'] },
          culture: { actions: ['read', 'edit', 'manage_rituals'] },
          training: { actions: ['read', 'manage'] },
          operations: { actions: ['view_qgp', 'manage_tasks'] },
        }
      },
      diretor: {
        label: "Diretor",
        resources: {
          employees: { actions: ['read', 'create', 'update'] },
          workshop: { actions: ['read', 'manage_goals'] },
          financeiro: { actions: ['read'] },
          diagnostics: { actions: ['read', 'create'] },
          processes: { actions: ['read', 'create'] },
          operations: { actions: ['view_qgp', 'manage_tasks'] },
        }
      },
      gerente: {
        label: "Gerente",
        resources: {
          employees: { actions: ['read', 'create'] },
          workshop: { actions: ['read'] },
          diagnostics: { actions: ['read', 'create'] },
          processes: { actions: ['read'] },
          operations: { actions: ['view_qgp', 'manage_tasks'] },
        }
      },
      administrativo: {
        label: "Administrativo",
        resources: {
          employees: { actions: ['read', 'create', 'update'] },
          workshop: { actions: ['read'] },
          diagnostics: { actions: ['read'] },
        }
      },
      rh: {
        label: "RH",
        resources: {
          employees: { actions: ['read', 'create', 'update', 'delete'] },
          diagnostics: { actions: ['read', 'create'] },
          culture: { actions: ['read', 'edit', 'manage_rituals'] },
          training: { actions: ['read', 'manage'] },
        }
      }
    };

    // Atualizar SystemSetting com configurações
    try {
      const settings = await base44.asServiceRole.entities.SystemSetting.filter({ 
        key: 'granular_permissions' 
      });

      if (settings && settings.length > 0) {
        await base44.asServiceRole.entities.SystemSetting.update(settings[0].id, {
          value: JSON.stringify(granularPermissions),
          updated_at: new Date().toISOString()
        });
        console.log("✅ SystemSetting atualizada");
      } else {
        await base44.asServiceRole.entities.SystemSetting.create({
          key: 'granular_permissions',
          value: JSON.stringify(granularPermissions),
          description: 'Configuração de permissões granulares por job_role'
        });
        console.log("✅ SystemSetting criada");
      }
    } catch (settingsError) {
      console.error("⚠️ Erro ao atualizar SystemSetting:", settingsError.message);
    }

    return Response.json({ 
      success: true,
      message: 'Permissões granulares configuradas',
      roles_configured: Object.keys(granularPermissions)
    });

  } catch (error) {
    console.error("❌ Erro:", error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});