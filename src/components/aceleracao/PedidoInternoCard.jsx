import React from "react";
import { CheckCircle, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SmartDueDate from "./SmartDueDate";

const priority = { baixa: ["Baixa", "bg-sky-50 text-sky-700 border-sky-200"], media: ["Média", "bg-amber-50 text-amber-700 border-amber-200"], alta: ["Alta", "bg-orange-50 text-orange-700 border-orange-200"], critica: ["Crítica", "bg-red-50 text-red-700 border-red-200"] };
const status = { pendente: "Pendente", em_analise: "Em análise", aprovado: "Aprovado", recusado: "Recusado", concluido: "Concluído" };
const types = { apoio_tecnico: "Apoio técnico", decisao_estrategica: "Decisão estratégica", liberacao_material: "Liberação de material", excecao_escopo: "Exceção de escopo", outros: "Outros" };
const sideTone = (p) => p.status === "concluido" ? "border-l-green-500" : p.prioridade === "critica" ? "border-l-red-500" : p.prazo && new Date(p.prazo) < new Date() ? "border-l-amber-500" : p.status === "em_analise" ? "border-l-blue-500" : "border-l-gray-300";

function PedidoInternoCard({ pedido, user, onView, onConclude }) {
  const cfg = priority[pedido.prioridade] || priority.media;
  const finished = ["concluido", "recusado"].includes(pedido.status);
  return (
    <article onClick={() => onView(pedido)} className={`group cursor-pointer rounded-2xl border border-l-4 border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md ${sideTone(pedido)}`}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(230px,3fr)]">
        <div className="min-w-0"><h3 className="truncate text-base font-semibold text-gray-950">{pedido.titulo}</h3><p className="mt-2 text-sm font-medium text-gray-700">{pedido.workshop_nome || "Cliente não informado"}</p><div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500"><span className="flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" />Responsável: {pedido.assignee_name || "—"}</span><span>Solicitante: {pedido.requester_name || "—"}</span><span>Categoria: {types[pedido.tipo] || pedido.tipo}</span></div><Badge variant="outline" className="mt-3 border-gray-200 bg-gray-50 text-[10px] font-normal text-gray-500">Pedido</Badge></div>
        <div className="border-t border-gray-100 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0"><div className="grid grid-cols-2 gap-4"><SmartDueDate date={pedido.prazo} completed={finished} /><div className="flex flex-col items-end gap-2"><Badge variant="outline" className={`text-[10px] ${cfg[1]}`}>{cfg[0]}</Badge><Badge variant="outline" className="border-slate-200 bg-slate-100 text-[10px] text-slate-700">{status[pedido.status] || pedido.status}</Badge></div></div>
          {pedido.assignee_id === user?.id && !finished && <div className="mt-4 border-t border-gray-100 pt-4 text-right"><Button size="sm" className="min-w-28 bg-green-600 shadow-sm hover:bg-green-700" onClick={(e) => { e.stopPropagation(); onConclude(pedido.id); }}><CheckCircle className="mr-2 h-4 w-4" />Concluir</Button></div>}
        </div>
      </div>
    </article>
  );
}
export default React.memo(PedidoInternoCard, (a, b) => a.pedido.updated_date === b.pedido.updated_date && a.user?.id === b.user?.id);