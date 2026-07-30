import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * useDisplayName — resolve o nome de exibição canônico do usuário logado.
 *
 * User.full_name é um campo built-in protegido pela plataforma e, para contas
 * criadas via provedor Google, pode conter o nome da conta Google (ex:
 * "Aceleradora Oficinas Master") em vez do nome real da pessoa.
 *
 * O nome real vive em Employee.full_name (vinculado ao User via user_id).
 * Este hook busca APENAS o Employee do usuário logado (1 query leve por user_id,
 * evitando listagens em massa que estouram o teto de leitura 429) e retorna:
 *
 *   Employee.full_name || User.full_name || User.email
 *
 * Uso:
 *   const { displayName, employee } = useDisplayName(user);
 */
export default function useDisplayName(user) {
  const { data, isLoading } = useQuery({
    queryKey: ["display-name", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        const employees = await base44.entities.Employee.filter(
          { user_id: user.id },
          undefined,
          1
        );
        return Array.isArray(employees) && employees.length > 0 ? employees[0] : null;
      } catch {
        return null;
      }
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  const displayName =
    data?.full_name || user?.full_name || user?.email || "";

  return { displayName, employee: data, isLoading };
}