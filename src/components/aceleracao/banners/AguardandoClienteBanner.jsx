/**
 * AguardandoClienteBanner — Banner de tarefa aguardando resposta/entrega do cliente
 *
 * Exibido quando tarefa.aguardando_cliente === true.
 * Mostra motivo, dias decorridos e botão para desmarcar.
 * Inclui botão "Marcar como Aguardando Cliente" quando falsa (para criador/admin/executor).
 */
import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Clock, UserCheck, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function calcularDiasAguardando(desde) {
  if (!desde) return 0;
  const diff = Date.now() - new Date(desde).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function AguardandoClienteBanner({ tarefa, podeEditar, user }) {
  const [showForm, setShowForm] = useState(false);
  const [motivo, setMotivo] = useState("");
  const queryClient = useQueryClient();

  const marcarMutation = useMutation({
    mutationFn: async () => {
      return await base44.entities.TarefaBacklog.update(tarefa.id, {
        status: 'aguardando_cliente',
        aguardando_cliente: true,
        aguardando_cliente_desde: new Date().toISOString(),
        aguardando_cliente_motivo: motivo || undefined,
        usuario_aguardo: user?.id,
      });
    },
    onSuccess: () => {
      toast.success("Tarefa marcada como aguardando cliente.");
      setShowForm(false);
      setMotivo("");
      queryClient.invalidateQueries(['tarefas-backlog']);
      queryClient.invalidateQueries(['tarefa', tarefa.id]);
    },
    onError: () => toast.error("Erro ao marcar tarefa."),
  });

  const desmarcarMutation = useMutation({
    mutationFn: async () => {
      return await base44.entities.TarefaBacklog.update(tarefa.id, {
        status: 'em_execucao',
        aguardando_cliente: false,
        aguardando_cliente_desde: null,
        aguardando_cliente_motivo: null,
        usuario_aguardo: null,
      });
    },
    onSuccess: () => {
      toast.success("Tarefa não está mais aguardando cliente.");
      queryClient.invalidateQueries(['tarefas-backlog']);
      queryClient.invalidateQueries(['tarefa', tarefa.id]);
    },
    onError: () => toast.error("Erro ao desmarcar tarefa."),
  });

  // Tarefa aguardando cliente — banner de estado ativo
  if (tarefa.aguardando_cliente) {
    const dias = calcularDiasAguardando(tarefa.aguardando_cliente_desde);
    const diasLabel = dias === 0 ? "hoje" : dias === 1 ? "há 1 dia" : `há ${dias} dias`;
    const isLongWait = dias >= 3;

    return (
      <div className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${isLongWait ? 'border-orange-300 bg-orange-50' : 'border-amber-200 bg-amber-50'}`}>
        <Clock className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isLongWait ? 'text-orange-600' : 'text-amber-600'}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${isLongWait ? 'text-orange-900' : 'text-amber-900'}`}>
            ⏳ Aguardando Cliente {isLongWait && "· demorando"}
          </p>
          {tarefa.aguardando_cliente_motivo && (
            <p className={`text-xs mt-0.5 ${isLongWait ? 'text-orange-700' : 'text-amber-700'}`}>
              {tarefa.aguardando_cliente_motivo}
            </p>
          )}
          {tarefa.aguardando_cliente_desde && (
            <p className={`text-xs mt-0.5 ${isLongWait ? 'text-orange-600' : 'text-amber-600'}`}>
              Desde {format(new Date(tarefa.aguardando_cliente_desde), "dd/MM/yyyy", { locale: ptBR })} ({diasLabel})
            </p>
          )}
        </div>
        {podeEditar && (
          <Button
            size="sm"
            variant="outline"
            className={`text-xs h-7 gap-1 whitespace-nowrap flex-shrink-0 mt-0.5 ${isLongWait ? 'border-orange-300 text-orange-700 hover:bg-orange-100' : 'border-amber-300 text-amber-700 hover:bg-amber-100'}`}
            onClick={() => desmarcarMutation.mutate()}
            disabled={desmarcarMutation.isPending}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Cliente Respondeu
          </Button>
        )}
      </div>
    );
  }

  // Tarefa não aguardando — botão para marcar (se tiver permissão)
  if (!podeEditar || tarefa.status === 'concluida') return null;

  if (showForm) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <Label className="text-sm font-semibold text-amber-900">Marcar como Aguardando Cliente</Label>
        </div>
        <Textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="O que foi solicitado ao cliente? (ex: 'Aguardando envio do layout do pátio')"
          rows={2}
          className="text-sm"
        />
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setMotivo(""); }}>
            Cancelar
          </Button>
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => marcarMutation.mutate()}
            disabled={marcarMutation.isPending}
          >
            {marcarMutation.isPending ? "Marcando..." : "Confirmar"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowForm(true)}
      className="w-full rounded-xl border border-dashed border-amber-300 bg-amber-50/50 px-4 py-2.5 flex items-center justify-center gap-2 text-sm text-amber-700 hover:bg-amber-100/50 transition-colors"
    >
      <Clock className="w-4 h-4" />
      Marcar como Aguardando Cliente
    </button>
  );
}