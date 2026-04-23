import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function useConsultoresList(user) {
  return useQuery({
    queryKey: ['consultores-list'],
    queryFn: async () => {
      const consultoresMap = new Map();

      const OFICINAS_MASTER_WORKSHOP_ID = '695408b3ed74bfeb60d708c0';

      const employees = await base44.entities.Employee.filter({
        workshop_id: OFICINAS_MASTER_WORKSHOP_ID,
        status: 'ativo'
      }, null, 1000);

      // Listar todos os colaboradores da Oficinas Master com user_id vinculado
      employees
        .filter(e => e.user_id)
        .forEach(e => {
          consultoresMap.set(e.user_id, e.full_name);
        });

      // Garante que o usuário logado aparece se for da Oficinas Master
      if (user?.id && !consultoresMap.has(user.id)) {
        const employeeByEmail = employees.find(e => e.email === user.email);
        if (employeeByEmail) {
          consultoresMap.set(user.id, employeeByEmail.full_name);
        }
      }

      return Array.from(consultoresMap.entries()).map(([id, full_name]) => ({
        id,
        full_name
      }));
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000)
  });
}