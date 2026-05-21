import { useEffect } from "react";
import { usePermissions } from "@/components/hooks/usePermissions";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";
import { useAuth } from "@/lib/AuthContext";
import { useAdminMode } from "@/components/hooks/useAdminMode";

/**
 * Componente de Debug de Permissões - Apenas para desenvolvimento
 * Adiciona logs detalhados no console para diagnosticar problemas de acesso
 * 
 * USO: Adicionar no Layout.jsx ou App.jsx
 * <PermissionDebugLogger pageName="DreMockup" />
 */
export default function PermissionDebugLogger({ pageName, enabled = true }) {
  const { user, isLoadingAuth } = useAuth();
  const { workshop, workshopId, isLoading: isLoadingWorkshop } = useWorkshopContext();
  const { isAdminMode } = useAdminMode();
  const { 
    profile, 
    permissions, 
    loading: loadingPermissions,
    hasPermission,
    canAccessPage,
    isOwnerOrPartner
  } = usePermissions();

  useEffect(() => {
    if (!enabled || !user) return;

    console.log("=== 🔍 DEBUG DE PERMISSÕES ===");
    console.log(`📄 Página: ${pageName || 'N/A'}`);
    console.log(`⏰ Timestamp: ${new Date().toLocaleTimeString('pt-BR')}`);
    console.log("");
    
    // Dados do Usuário
    console.group("👤 DADOS DO USUÁRIO");
    console.log("Email:", user.email);
    console.log("Role:", user.role);
    console.log("Full Name:", user.full_name);
    console.log("User ID:", user.id);
    console.log("Workshop ID (user.data):", user.data?.workshop_id);
    console.log("Profile ID:", user.profile_id);
    console.log("Custom Role ID:", user.custom_role_id);
    console.log("Job Role:", user.job_role);
    console.log("Cadastro em Andamento:", user.cadastro_em_andamento);
    console.log("First Access Completed:", user.first_access_completed);
    console.log("Profile Completed:", user.profile_completed);
    console.groupEnd();
    console.log("");

    // Dados da Consultoria
    console.group("🏢 CONSULTORIA");
    console.log("Consulting Firm ID:", user.data?.consulting_firm_id);
    console.log("Is Admin Mode:", isAdminMode);
    console.groupEnd();
    console.log("");

    // Dados do Workshop
    console.group("🔧 WORKSHOP ATUAL");
    console.log("Workshop ID (context):", workshopId);
    console.log("Workshop Name:", workshop?.name || 'N/A');
    console.log("Workshop Owner ID:", workshop?.owner_id);
    console.log("Workshop Partner IDs:", workshop?.partner_ids);
    console.log("Is Owner/Partner:", isOwnerOrPartner);
    console.log("Workshop Status:", workshop?.status);
    console.log("Workshop Plan Status:", workshop?.planStatus);
    console.log("Loading Workshop:", isLoadingWorkshop);
    console.groupEnd();
    console.log("");

    // Dados do Perfil
    if (profile) {
      console.group("📋 PERFIL DE ACESSO (UserProfile)");
      console.log("Profile ID:", profile.id);
      console.log("Profile Name:", profile.name);
      console.log("Profile Type:", profile.type);
      console.log("Permission Type:", profile.permission_type);
      console.log("Job Roles:", profile.job_roles);
      console.log("Roles:", profile.roles);
      console.log("Custom Role IDs:", profile.custom_role_ids);
      console.log("Module Permissions:", profile.module_permissions);
      console.log("Sidebar Permissions:", profile.sidebar_permissions);
      console.log("Status:", profile.status);
      console.groupEnd();
      console.log("");
    }

    // Permissões Consolidadas
    console.group("✅ PERMISSÕES CONSOLIDADAS");
    console.log("Total Permissions:", permissions.length);
    console.log("Permissions Array:", permissions);
    console.log("Loading Permissions:", loadingPermissions);
    
    if (pageName) {
      const canAccess = canAccessPage(pageName);
      const requiredPerm = getRequiredPermission(pageName);
      console.log(`Can Access "${pageName}":`, canAccess);
      console.log("Required Permission:", requiredPerm);
      if (requiredPerm) {
        console.log(`Has "${requiredPerm}":`, hasPermission(requiredPerm));
      }
    }
    console.groupEnd();
    console.log("");

    // Diagnóstico de Problemas
    console.group("🚨 DIAGNÓSTICO DE BLOQUEIOS");
    
    const issues = [];
    
    if (!user) {
      issues.push("❌ Usuário não autenticado");
    }
    
    if (isLoadingWorkshop) {
      issues.push("⏳ Workshop ainda carregando...");
    }
    
    if (!workshopId && user.role !== 'admin') {
      issues.push("❌ Usuário sem workshop selecionado");
    }
    
    if (workshop && workshop.status === 'inativo') {
      issues.push("❌ Workshop está INATIVO");
    }
    
    if (workshop && workshop.planStatus !== 'active' && workshop.planStatus !== 'trial' && user.role !== 'admin') {
      issues.push("❌ Workshop plano INATIVO/CANCELADO");
    }
    
    if (pageName && !canAccessPage(pageName)) {
      issues.push("❌ Usuário NÃO tem permissão para esta página");
      
      // Verificar se é problema de sidebar_permissions
      if (profile?.sidebar_permissions) {
        const sidebarKey = Object.keys(profile.sidebar_permissions).find(key => 
          key.toLowerCase().includes('dre') || key.toLowerCase().includes('tcmp')
        );
        if (sidebarKey) {
          console.log(`  ↳ Sidebar Permission encontrada: "${sidebarKey}"`);
          console.log(`  ↳ Permissões:`, profile.sidebar_permissions[sidebarKey]);
        } else {
          issues.push("  ↳ Nenhuma sidebar_permission de DRE/TCMP encontrada!");
        }
      }
    }
    
    if (issues.length === 0) {
      console.log("✅ Nenhum bloqueio identificado");
    } else {
      issues.forEach(issue => console.log(issue));
    }
    
    console.groupEnd();
    console.log("");
    console.log("=== 🏁 FIM DO DEBUG ===");
    console.log("");

  }, [
    user, 
    workshop, 
    workshopId, 
    profile, 
    permissions, 
    isAdminMode, 
    pageName, 
    enabled,
    isLoadingWorkshop,
    loadingPermissions,
    isOwnerOrPartner
  ]);

  return null;
}

// Helper para buscar permissão requerida da página
function getRequiredPermission(pageName) {
  const pagePermMap = {
    'DreMockup': 'financeiro.view',
    'DRETCMP2': 'financeiro.view',
    'DashboardFinanceiro': 'financeiro.view',
    'ConsolidadoMensal': 'financeiro.view',
    'GerenciarSubcategorias': 'admin',
    'RelatoriosAnuais': 'financeiro.view',
  };
  return pagePermMap[pageName] || null;
}