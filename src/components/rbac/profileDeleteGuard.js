import { base44 } from "@/api/base44Client";

/**
 * Guarda de exclusão de UserProfile (Etapa 2 — proteção anti-referência-órfã).
 *
 * Um perfil referenciado por TenantMembership.profile_id ou Employee.profile_id
 * NÃO pode ser excluído fisicamente: a referência restante faz o
 * PermissionsContext resolver para 0 permissões e o usuário perde o acesso
 * (exatamente o incidente do perfil 695a8c3c... deletado com 3 memberships
 * apontando para ele).
 *
 * Não remove referências, não migra nada — apenas BLOQUEIA o delete e informa.
 */
export async function getProfileReferences(profileId) {
  if (!profileId) return { memberships: 0, employees: 0, total: 0 };
  const [memberships, employees] = await Promise.all([
    base44.entities.TenantMembership.filter({ profile_id: profileId }, "created_date", 500).catch(() => []),
    base44.entities.Employee.filter({ profile_id: profileId }, "created_date", 500).catch(() => []),
  ]);
  return {
    memberships: (memberships || []).length,
    employees: (employees || []).length,
    total: (memberships || []).length + (employees || []).length,
  };
}

/**
 * Lança erro (bloqueando o delete) se o perfil ainda for referenciado.
 * Retorna true se o perfil puder ser excluído com segurança.
 */
export async function assertProfileDeletable(profileId) {
  const refs = await getProfileReferences(profileId);
  if (refs.total > 0) {
    throw new Error(
      `Este perfil não pode ser excluído porque ainda está sendo utilizado por usuários ou registros do sistema ` +
      `(${refs.memberships} membership(s), ${refs.employees} colaborador(es)). ` +
      `Migre as referências para outro perfil ou desative o perfil.`
    );
  }
  return true;
}