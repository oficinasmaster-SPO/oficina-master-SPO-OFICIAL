import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Lista de consultores (Employee da Oficinas Master com user_id) enriquecida com
 * o flag `ativo` proveniente da entidade ConsultorCapacity.
 *
 * Retorna: [{ id, full_name, ativo }] — ativo defaulta p/ true quando não há
 * registro de capacidade (consultor considerado habilitado por ausência de bloqueio).
 */
export default function useConsultoresList(user) {
  return useQuery({
    queryKey: ['consultores-list'],
    queryFn: async () => {
      const consultoresMap = new Map();

      const OFICINAS_MASTER_WORKSHOP_ID = '695408b3ed74bfeb60d708c0';

      const [employees, capacities] = await Promise.all([
        base44.entities.Employee.filter({
          workshop_id: OFICINAS_MASTER_WORKSHOP_ID,
          status: 'ativo'
        }, null, 500),
        base44.entities.ConsultorCapacity.filter({}, null, 500).catch(() => []),
      ]);

      const capacityMap = new Map();
      (capacities || []).forEach((cap) => {
        if (cap?.user_id) capacityMap.set(cap.user_id, cap.ativo !== false);
      });

      const resolveAtivo = (userId) => (capacityMap.has(userId) ? capacityMap.get(userId) : true);

      // Listar todos os colaboradores da Oficinas Master com user_id vinculado
      employees
        .filter((e) => e.user_id)
        .forEach((e) => {
          consultoresMap.set(e.user_id, {
            full_name: e.full_name,
            ativo: resolveAtivo(e.user_id),
          });
        });

      // Garante que o usuário logado aparece se for da Oficinas Master
      if (user?.id && !consultoresMap.has(user.id)) {
        const employeeByEmail = employees.find((e) => e.email === user.email);
        if (employeeByEmail) {
          consultoresMap.set(user.id, {
            full_name: employeeByEmail.full_name,
            ativo: resolveAtivo(user.id),
          });
        }
      }

      return Array.from(consultoresMap.entries()).map(([id, info]) => ({
        id,
        full_name: info.full_name,
        ativo: info.ativo,
      }));
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
    retry: false,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000)
  });
}