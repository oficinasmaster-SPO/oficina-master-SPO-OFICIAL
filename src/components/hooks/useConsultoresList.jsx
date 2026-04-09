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

      employees
        .filter(e => e.user_id && ['consultor', 'mentor', 'acelerador'].includes(e.job_role))
        .forEach(e => {
          consultoresMap.set(e.user_id, e.full_name);
        });

      if (user?.id) {
        consultoresMap.set(user.id, user.full_name);
      }

      return Array.from(consultoresMap.entries()).map(([id, full_name]) => ({
        id,
        full_name
      }));
    },
    enabled: !!user
  });
}