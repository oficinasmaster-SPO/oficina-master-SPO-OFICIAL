/**
 * useEmployeeResolver — Resolve user_ids para nomes reais e fotos de Employee.
 *
 * O User do Base44 frequentemente tem `full_name` como email ou username.
 * O nome real e a foto de perfil estão em Employee (vinculado via user_id).
 *
 * Uso:
 *   const { getName, getPhoto, isLoading } = useEmployeeResolver();
 *   getName(userId)  → "Rafael Marrafon" (ou fallback)
 *   getPhoto(userId) → "https://..." ou null
 */
import { useQuery } from "@tanstack/react-query";
import { useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useUserType } from "@/hooks/useUserType";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";

export default function useEmployeeResolver() {
  const { canViewAllWorkshops } = useUserType();
  const { workshopId } = useWorkshopContext();

  // ── Employees ──────────────────────────────────────────────────────────
  // Admins/internos (canViewAllWorkshops): lista tudo (RLS permite leitura
  //   irrestrita via branch admin/internal).
  // Usuário comum: filtra pelo próprio workshop. Antes um Employee.list sem
  //   escopo podia 403 quando o user não caía em nenhuma branch do RLS de
  //   leitura (workshop legado não resolvido). O filter com workshop_id casiona
  //   a branch `data.workshop_id == user.workshop_id` → sem 403.
  const { data: employees = [], isLoading } = useQuery({
    queryKey: [
      "employees-resolver",
      canViewAllWorkshops ? "all" : workshopId || "none",
    ],
    queryFn: async () => {
      let all;
      if (canViewAllWorkshops) {
        all = await base44.entities.Employee.list("full_name", 500);
      } else if (workshopId) {
        all = await base44.entities.Employee.filter(
          { workshop_id: workshopId },
          "full_name",
          200
        );
      } else {
        all = [];
      }
      return (all || []).filter((e) => e.user_id);
    },
    // Só monta a query quando há contexto suficiente para não falhar.
    enabled: canViewAllWorkshops || !!workshopId,
    staleTime: 5 * 60 * 1000, // cache 5 min
    retry: false, // 403 de permissão não retenta
  });

  // REMOVIDO: fallback de User.list. A plataforma Base44 bloqueia User.list com
  // 403 "Only collaborators can view the list of users" — até para admins com
  // user_type=internal (ex: Vitor Albuquerque). Employee.list é a fonte canônica
  // de nomes (Name Resolver) e funciona para todos os colaboradores internos via
  // branch admin/internal do RLS de Employee. Zero chamadas User.list = zero 403.

  // Map user_id → Employee
  const byUserId = useMemo(() => {
    const m = {};
    employees.forEach((e) => { if (e.user_id) m[e.user_id] = e; });
    return m;
  }, [employees]);

  // Map email → Employee (fallback)
  const byEmail = useMemo(() => {
    const m = {};
    employees.forEach((e) => { if (e.email) m[e.email.toLowerCase()] = e; });
    return m;
  }, [employees]);

  /**
   * Resolve o nome real de um usuário.
   * Tenta: user_id → Employee.full_name → fallback
   */
  const getName = useCallback((userId, fallbackName) => {
    if (userId && byUserId[userId]) return byUserId[userId].full_name;
    // Fallback: tenta resolver via User
    if (userId && userById[userId]) {
      const u = userById[userId];
      return u.full_name || (u.email ? u.email.split("@")[0] : null) || fallbackName || "—";
    }
    // Tenta pelo fallback como email
    if (fallbackName && fallbackName.includes("@")) {
      const emp = byEmail[fallbackName.toLowerCase()];
      if (emp) return emp.full_name;
    }
    // Se o fallbackName parece email, tenta limpar
    if (fallbackName && fallbackName.includes("@")) {
      return fallbackName.split("@")[0];
    }
    return fallbackName || "—";
  }, [byUserId, userById, byEmail]);

  /**
   * Resolve a foto de perfil.
   */
  const getPhoto = useCallback((userId) => {
    if (userId && byUserId[userId]) return byUserId[userId].profile_picture_url || null;
    if (userId && userById[userId]) return userById[userId].photo_url || null;
    return null;
  }, [byUserId, userById]);

  /**
   * Resolve Employee completo.
   */
  const getEmployee = useCallback((userId) => {
    return userId ? byUserId[userId] || null : null;
  }, [byUserId]);

  return { getName, getPhoto, getEmployee, isLoading, employees };
}