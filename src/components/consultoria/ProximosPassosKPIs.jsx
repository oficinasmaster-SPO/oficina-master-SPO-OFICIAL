import { AlertTriangle, Clock, CheckCircle2, TrendingUp, Users } from "lucide-react";

function KPICard({ icon: IconComponent, label, value, color, bg }) {
  const Icon = IconComponent;
  return (
    <div className={`${bg} rounded-xl p-4 flex items-center gap-3`}>
      <div className={`w-10 h-10 rounded-lg ${color} bg-white/60 flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-600">{label}</p>
      </div>
    </div>
  );
}

export default function ProximosPassosKPIs({ passos }) {
  const total = passos.length;
  const atrasados = passos.filter((p) => p.status === "atrasado").length;
  const finalizadosSemana = passos.filter((p) => {
    if (p.status !== "finalizado" || !p.data_finalizacao) return false;
    const diff = (Date.now() - new Date(p.data_finalizacao).getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  }).length;
  const emAndamento = passos.filter((p) => p.status === "em_andamento").length;
  const clientesCriticos = new Set(
    passos.filter((p) => p.status === "atrasado").map((p) => p.workshop_id)
  ).size;
  const mediaExecucao =
    total > 0
      ? Math.round(passos.reduce((acc, p) => acc + (p.percentual_execucao || 0), 0) / total)
      : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <KPICard icon={Clock} label="Total pendentes" value={total - passos.filter(p => p.status === "finalizado").length} color="text-blue-600" bg="bg-blue-50" />
      <KPICard icon={AlertTriangle} label="Atrasados" value={atrasados} color="text-red-600" bg={atrasados > 0 ? "bg-red-50" : "bg-gray-50"} />
      <KPICard icon={CheckCircle2} label="Finalizados (7d)" value={finalizadosSemana} color="text-green-600" bg="bg-green-50" />
      <KPICard icon={TrendingUp} label="Execução média" value={`${mediaExecucao}%`} color="text-purple-600" bg="bg-purple-50" />
      <KPICard icon={Users} label="Clientes críticos" value={clientesCriticos} color="text-orange-600" bg={clientesCriticos > 0 ? "bg-orange-50" : "bg-gray-50"} />
    </div>
  );
}