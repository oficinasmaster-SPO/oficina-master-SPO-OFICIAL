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
import { base44 } from "@/api/base44Client";

export default function useEmployeeResolver() {
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees-resolver"],
    queryFn: async () => {
      const all = await base44.entities.Employee.list("full_name", 500);
      return (all || []).filter((e) => e.user_id);
    },
    staleTime: 5 * 60 * 1000, // cache 5 min
  });

  // Map user_id → Employee
  const byUserId = {};
  employees.forEach((e) => {
    if (e.user_id) byUserId[e.user_id] = e;
  });

  // Map email → Employee (fallback)
  const byEmail = {};
  employees.forEach((e) => {
    if (e.email) byEmail[e.email.toLowerCase()] = e;
  });

  /**
   * Resolve o nome real de um usuário.
   * Tenta: user_id → Employee.full_name → fallback
   */
  const getName = (userId, fallbackName) => {
    if (userId && byUserId[userId]) return byUserId[userId].full_name;
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
  };

  /**
   * Resolve a foto de perfil.
   */
  const getPhoto = (userId) => {
    if (userId && byUserId[userId]) return byUserId[userId].profile_picture_url || null;
    return null;
  };

  /**
   * Resolve Employee completo.
   */
  const getEmployee = (userId) => {
    return userId ? byUserId[userId] || null : null;
  };

  return { getName, getPhoto, getEmployee, isLoading, employees };
}
