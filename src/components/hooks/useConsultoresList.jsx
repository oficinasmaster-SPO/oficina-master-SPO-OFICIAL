import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function useConsultoresList(user) {
  return useQuery({
    queryKey: ['consultores-list'],
    queryFn: async () => {
      const consultoresMap = new Map();

      const employees = await base44.entities.Employee.filter({
        tipo_vinculo: 'interno',
        status: 'ativo'
      }, null, 1000);

      // Consultores reais: tipo_vinculo interno e SEM workshop_id (pertencem à firma, não a uma oficina cliente)
      employees
        .filter(e => e.user_id && !e.workshop_id)
        .forEach(e => {
          consultoresMap.set(e.user_id, e.full_name);
        });

      // Garante que o usuário logado aparece se for consultor da firma (sem workshop_id)
      if (user?.id && !consultoresMap.has(user.id)) {
        const employeeByEmail = employees.find(e => e.email === user.email && !e.workshop_id);
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