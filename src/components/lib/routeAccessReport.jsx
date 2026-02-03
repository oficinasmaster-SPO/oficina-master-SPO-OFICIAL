/**
 * Relatório de Acesso a Rotas - Sistema RBAC
 * 
 * Este arquivo gera um relatório completo de todas as rotas do sistema,
 * suas permissões necessárias, e quem pode acessá-las.
 */

import { routePermissionMap } from "./menuVisibilityGate";

/**
 * Gera relatório completo de rotas e permissões
 */
export function generateFullRouteReport() {
  const routes = Object.keys(routePermissionMap).map(pageName => {
    const config = routePermissionMap[pageName];
    
    return {
      pageName,
      permissionKey: config.key || "Nenhuma",
      type: config.type,
      module: config.module || "N/A",
      visibleTo: getVisibilityDescription(config),
      status: getRouteStatus(config)
    };
  });
  
  // Ordenar por módulo e depois por nome
  routes.sort((a, b) => {
    if (a.module !== b.module) {
      return (a.module || "").localeCompare(b.module || "");
    }
    return a.pageName.localeCompare(b.pageName);
  });
  
  return routes;
}

function getVisibilityDescription(config) {
  if (config.type === "public") {
    return "Todos (público)";
  }
  if (config.type === "admin") {
    return "Apenas Admin";
  }
  if (config.type === "interno") {
    return "Admin + Internos (consultores/aceleradores)";
  }
  return "Admin + Externos + Internos (com permissão de módulo)";
}

function getRouteStatus(config) {
  if (config.type === "public") {
    return "Público";
  }
  if (config.type === "admin") {
    return "Restrito (Admin)";
  }
  if (config.type === "interno") {
    return "Restrito (Interno)";
  }
  return "Protegido (RBAC)";
}

/**
 * Gera relatório agrupado por módulo
 */
export function generateModuleReport() {
  const routes = generateFullRouteReport();
  const grouped = {};
  
  routes.forEach(route => {
    const module = route.module || "Sem Módulo";
    if (!grouped[module]) {
      grouped[module] = [];
    }
    grouped[module].push(route);
  });
  
  return grouped;
}

/**
 * Gera estatísticas de acesso
 */
export function generateAccessStats() {
  const routes = generateFullRouteReport();
  
  const stats = {
    total: routes.length,
    public: routes.filter(r => r.type === "public").length,
    adminOnly: routes.filter(r => r.type === "admin").length,
    internoOnly: routes.filter(r => r.type === "interno").length,
    rbacProtected: routes.filter(r => r.type === "all").length,
    byModule: {}
  };
  
  routes.forEach(route => {
    const module = route.module || "Sem Módulo";
    stats.byModule[module] = (stats.byModule[module] || 0) + 1;
  });
  
  return stats;
}

/**
 * Imprime relatório no console (para debugging)
 */
export function printRouteReport() {
  console.log("\n=== RELATÓRIO DE ROTAS E PERMISSÕES ===\n");
  
  const stats = generateAccessStats();
  console.log("📊 ESTATÍSTICAS:");
  console.log(`- Total de Rotas: ${stats.total}`);
  console.log(`- Públicas: ${stats.public}`);
  console.log(`- Admin Only: ${stats.adminOnly}`);
  console.log(`- Interno Only: ${stats.internoOnly}`);
  console.log(`- Protegidas RBAC: ${stats.rbacProtected}`);
  
  console.log("\n📦 POR MÓDULO:");
  Object.keys(stats.byModule).sort().forEach(module => {
    console.log(`  ${module}: ${stats.byModule[module]} rotas`);
  });
  
  console.log("\n📋 ROTAS DETALHADAS:\n");
  
  const grouped = generateModuleReport();
  Object.keys(grouped).sort().forEach(module => {
    console.log(`\n🔹 ${module.toUpperCase()}`);
    grouped[module].forEach(route => {
      console.log(`  - ${route.pageName}`);
      console.log(`    Permissão: ${route.permissionKey}`);
      console.log(`    Visível: ${route.visibleTo}`);
      console.log(`    Status: ${route.status}`);
    });
  });
  
  console.log("\n=== FIM DO RELATÓRIO ===\n");
}

/**
 * Exporta relatório como JSON
 */
export function exportRouteReportJSON() {
  return {
    generatedAt: new Date().toISOString(),
    stats: generateAccessStats(),
    routesByModule: generateModuleReport(),
    allRoutes: generateFullRouteReport()
  };
}