import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import ProximosPassosFiltros from "@/components/consultoria/ProximosPassosFiltros";
import ProximosPassosKPIs from "@/components/consultoria/ProximosPassosKPIs";
import ProximosPassosTabela from "@/components/consultoria/ProximosPassosTabela";
import ProximoPassoModal from "@/components/consultoria/ProximoPassoModal";
import WheelLoader from "@/components/ui/WheelLoader";
import { isAfter, parseISO } from "date-fns";

export default function ProximosPassosConsultoria() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [filtros, setFiltros] = useState({
    status: "todos",
    prioridade: "todas",
    consultor_id: "",
    workshop_id: "",
    apenas_atrasados: false,
  });
  const [selectedPasso, setSelectedPasso] = useState(null);

  const consultingFirmId = user?.data?.consulting_firm_id;

  const { data: passos = [], isLoading } = useQuery({
    queryKey: ["proximos-passos-central", consultingFirmId],
    queryFn: async () => {
      if (!consultingFirmId && user?.role !== "admin") return [];
      const filter = user?.role === "admin" ? {} : { consulting_firm_id: consultingFirmId };
      return base44.entities.ConsultoriaProximoPasso.filter(filter, "-created_date", 500);
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!user,
  });

  // Aplica SLA automático: se prazo < hoje e não finalizado/cancelado → atrasado
  const passosComSLA = passos.map((p) => {
    if (
      p.prazo &&
      !["finalizado", "cancelado", "atrasado"].includes(p.status) &&
      isAfter(new Date(), parseISO(p.prazo))
    ) {
      return { ...p, status: "atrasado" };
    }
    return p;
  });

  // Filtros aplicados
  const passosFiltrados = passosComSLA.filter((p) => {
    if (filtros.status !== "todos" && p.status !== filtros.status) return false;
    if (filtros.prioridade !== "todas" && p.prioridade !== filtros.prioridade) return false;
    if (filtros.consultor_id && p.consultor_id !== filtros.consultor_id) return false;
    if (filtros.workshop_id && p.workshop_id !== filtros.workshop_id) return false;
    if (filtros.apenas_atrasados && p.status !== "atrasado") return false;
    return true;
  });

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["proximos-passos-central"] });
    setSelectedPasso(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <WheelLoader size="lg" text="Carregando próximos passos..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Central de Próximos Passos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Acompanhe, cobre e valide a execução de todas as ações dos seus clientes.
        </p>
      </div>

      {/* KPIs */}
      <ProximosPassosKPIs passos={passosComSLA} />

      {/* Filtros */}
      <ProximosPassosFiltros
        filtros={filtros}
        onChange={setFiltros}
        passos={passosComSLA}
      />

      {/* Tabela */}
      <ProximosPassosTabela
        passos={passosFiltrados}
        onAbrir={(p) => setSelectedPasso(p)}
      />

      {/* Modal de detalhe */}
      {selectedPasso && (
        <ProximoPassoModal
          passo={selectedPasso}
          onClose={() => setSelectedPasso(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}