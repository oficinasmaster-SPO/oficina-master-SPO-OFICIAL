import React from "react";
import { Play, CheckCircle, UserRound, Clock, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SmartDueDate from "./SmartDueDate";

const priority = { baixa: ["Baixa", "bg-sky-50 text-sky-700 border-sky-200"], media: ["Média", "bg-amber-50 text-amber-700 border-amber-200"], alta: ["Alta", "bg-orange-50 text-orange-700 border-orange-200"], critica: ["Crítica", "bg-red-50 text-red-700 border-red-200"] };
const status = { aberta: "Aberta", em_execucao: "Em execução", aguardando_cliente: "Aguardando Cliente", bloqueada: "Bloqueada", concluida: "Concluída" };
const origin = { reuniao: "Reunião", contrato: "Contrato", pedido: "Pedido", diagnostico: "Diagnóstico", manual: "Manual", followup: "Follow-up", cronograma: "Cronograma", consultoria: "Consultoria", automacao: "Automação", projeto: "Projeto" };
const sideTone = (t) => t.status === "concluida" ? "border-l-green-500" : t.prioridade === "critica" ? "border-l-red-500" : t.prazo && new Date(t.prazo) < new Date() ? "border-l-amber-500" : t.status === "em_execucao" ? "border-l-blue-500" : t.status === "aguardando_cliente" ? "border-l-amber-400" : "border-l-gray-300";

function BacklogTaskCard({ tarefa, user, onView, onAction }) {
  const canAct = !user || [tarefa.criado_por_id, tarefa.consultor_id, tarefa.atribuido_para_id].includes(user.id);
  const priorityCfg = priority[tarefa.prioridade] || priority.media;
  const act = (event, data) => { event.stopPropagation(); onAction(tarefa.id, data); };
  return (
    <article onClick={() => onView(tarefa)} className={`group cursor-pointer rounded-2xl border border-l-4 border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md ${sideTone(tarefa)}`}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(230px,3fr)]">
        <div className="min-w-0"><h3 className="truncate text-base font-semibold text-gray-950">{tarefa.titulo}</h3><p className="mt-2 text-sm font-medium text-gray-700">{tarefa.workshop_nome || "Cliente não informado"}</p><div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500"><span className="flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" />{tarefa.assignee_name || "Sem consultor"}</span><span>Responsável: {tarefa.assigned_to_name || tarefa.assignee_name || "—"}</span><span>Categoria: {tarefa.categoria || tarefa.impacto || "—"}</span></div>{tarefa.origin_type && <Badge variant="outline" className="mt-3 border-gray-200 bg-gray-50 text-[10px] font-normal text-gray-500">{origin[tarefa.origin_type] || tarefa.origin_type}</Badge>}
        {tarefa.checklist_total > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            <ListChecks className="w-3.5 h-3.5 text-gray-400" />
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden max-w-32">
              <div className="h-full bg-green-500 transition-all" style={{ width: `${tarefa.checklist_total > 0 ? Math.round((tarefa.checklist_concluidos || 0) / tarefa.checklist_total * 100) : 0}%` }} />
            </div>
            <span className="text-[10px] text-gray-500">{tarefa.checklist_concluidos || 0}/{tarefa.checklist_total}</span>
          </div>
        )}</div>
        <div className="border-t border-gray-100 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0"><div className="grid grid-cols-2 gap-4"><SmartDueDate date={tarefa.prazo} completed={tarefa.status === "concluida"} /><div className="flex flex-col items-end gap-2"><Badge variant="outline" className={`text-[10px] ${priorityCfg[1]}`}>{priorityCfg[0]}</Badge>{tarefa.aguardando_cliente && <Badge variant="outline" className="border-amber-300 bg-amber-50 text-[10px] text-amber-700 flex items-center gap-1"><Clock className="h-3 w-3" />Aguardando Cliente</Badge>}
<Badge variant="outline" className="border-slate-200 bg-slate-100 text-[10px] text-slate-700">{status[tarefa.status] || tarefa.status}</Badge></div></div>
          {canAct && tarefa.status === "aberta" && <div className="mt-4 border-t border-gray-100 pt-4 text-right"><Button size="sm" className="min-w-28 bg-blue-600 shadow-sm hover:bg-blue-700" onClick={(e) => act(e, { status: "em_execucao" })}><Play className="mr-2 h-4 w-4" />Iniciar</Button></div>}
          {canAct && tarefa.status === "em_execucao" && <div className="mt-4 border-t border-gray-100 pt-4 text-right"><Button size="sm" className="min-w-28 bg-green-600 shadow-sm hover:bg-green-700" onClick={(e) => act(e, { status: "concluida", data_conclusao: new Date().toISOString() })}><CheckCircle className="mr-2 h-4 w-4" />Concluir</Button></div>}
        </div>
      </div>
    </article>
  );
}
export default React.memo(BacklogTaskCard, (a, b) => a.tarefa.updated_date === b.tarefa.updated_date && a.user?.id === b.user?.id);