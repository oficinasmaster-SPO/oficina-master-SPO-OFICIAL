import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GripVertical, Plus, Trash2, Save, Sparkles, Info, Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function SequenciaEntregaTab({ planId, planName }) {
  const queryClient = useQueryClient();
  const [sequencia, setSequencia] = useState(null); // null = não carregado ainda
  const [regraId, setRegraId] = useState(null);
  const [dirty, setDirty] = useState(false);

  // Busca tipos de atendimento ativos
  const { data: tiposAtendimento = [], isLoading: loadingTipos } = useQuery({
    queryKey: ["tipos-atendimento-consultoria"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getAttendanceTypes", { workshop_id: null });
      return res?.data?.types || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Busca regra existente para este plano
  const { isLoading: loadingRegra } = useQuery({
    queryKey: ["regra-agendamento", planId],
    queryFn: async () => {
      const regras = await base44.entities.RegraAgendamento.filter({ plan_id: planId, ativo: true });
      const regra = regras[0] || null;
      if (regra) {
        setRegraId(regra.id);
        const seq = [...(regra.sequencia || [])].sort((a, b) => a.ordem - b.ordem);
        setSequencia(seq);
      } else {
        setSequencia([]);
      }
      return regra;
    },
    enabled: !!planId,
    staleTime: 0,
  });

  // Salvar/criar regra
  const saveMutation = useMutation({
    mutationFn: async (seq) => {
      const data = {
        plan_id: planId,
        nome: `Sequência ${planName}`,
        sequencia: seq.map((item, i) => ({ ...item, ordem: i + 1 })),
        ativo: true,
      };
      if (regraId) {
        return base44.entities.RegraAgendamento.update(regraId, data);
      } else {
        return base44.entities.RegraAgendamento.create(data);
      }
    },
    onSuccess: (result) => {
      if (!regraId) setRegraId(result.id);
      queryClient.invalidateQueries({ queryKey: ["regra-agendamento", planId] });
      setDirty(false);
      toast.success("Sequência salva! A Agenda Inteligente já usa essa configuração.");
    },
    onError: () => toast.error("Erro ao salvar sequência"),
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(sequencia);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setSequencia(items.map((item, i) => ({ ...item, ordem: i + 1 })));
    setDirty(true);
  };

  const adicionarTipo = (tipoId) => {
    const tipo = tiposAtendimento.find((t) => t.id === tipoId);
    if (!tipo) return;
    if (sequencia.some((s) => s.tipo_atendimento_id === tipoId)) {
      toast.error("Este tipo já está na sequência");
      return;
    }
    const novo = {
      ordem: sequencia.length + 1,
      tipo_atendimento_id: tipoId,
      nome: tipo.label || tipo.nome,
      prazo_dias_apos_inicio: 0,
      intervalo_minimo_dias: 0,
      obrigatorio: true,
    };
    setSequencia([...sequencia, novo]);
    setDirty(true);
  };

  const removerItem = (idx) => {
    const atualizado = sequencia.filter((_, i) => i !== idx).map((item, i) => ({ ...item, ordem: i + 1 }));
    setSequencia(atualizado);
    setDirty(true);
  };

  // IDs já na sequência para não mostrar no select
  const tiposNaSequencia = new Set((sequencia || []).map((s) => s.tipo_atendimento_id));
  const tiposDisponiveis = tiposAtendimento.filter((t) => !tiposNaSequencia.has(t.id));

  if (loadingTipos || loadingRegra) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header info */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-indigo-900">Sequência de Entrega — {planName}</p>
          <p className="text-xs text-indigo-700 mt-1">
            Define a <strong>ordem sugerida</strong> dos atendimentos para clientes deste plano.
            A <strong>Agenda Inteligente</strong> usa essa sequência para sugerir o próximo tipo correto,
            verificando quais já foram realizados pelo cliente.
            Arraste para reordenar.
          </p>
        </div>
      </div>

      {/* Sequência com drag and drop */}
      {sequencia && sequencia.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-10 text-center">
            <Info className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhuma sequência configurada</p>
            <p className="text-sm text-gray-400 mt-1">
              Adicione os tipos de atendimento abaixo para criar a jornada do plano {planName}
            </p>
          </CardContent>
        </Card>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="sequencia">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                {(sequencia || []).map((item, idx) => (
                  <Draggable key={item.tipo_atendimento_id} draggableId={item.tipo_atendimento_id} index={idx}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex items-center gap-3 bg-white border rounded-lg px-3 py-3 transition-shadow ${
                          snapshot.isDragging ? "shadow-lg border-indigo-300" : "border-gray-200"
                        }`}
                      >
                        {/* Drag handle */}
                        <div {...provided.dragHandleProps} className="text-gray-300 hover:text-gray-500 cursor-grab">
                          <GripVertical className="w-4 h-4" />
                        </div>

                        {/* Ordem */}
                        <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>

                        {/* Seta (para todos exceto o último) */}
                        {idx < sequencia.length - 1 && (
                          <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0 hidden sm:block" />
                        )}

                        {/* Nome */}
                        <span className="flex-1 text-sm font-medium text-gray-800">{item.nome}</span>

                        {/* Badge obrigatório */}
                        <Badge variant="outline" className="text-xs shrink-0">
                          {item.obrigatorio ? "Obrigatório" : "Opcional"}
                        </Badge>

                        {/* Toggle obrigatório */}
                        <button
                          onClick={() => {
                            const updated = [...sequencia];
                            updated[idx] = { ...updated[idx], obrigatorio: !updated[idx].obrigatorio };
                            setSequencia(updated);
                            setDirty(true);
                          }}
                          className="text-xs text-gray-400 hover:text-indigo-600 transition-colors shrink-0"
                          title="Alternar obrigatório/opcional"
                        >
                          {item.obrigatorio ? "✓" : "○"}
                        </button>

                        {/* Remover */}
                        <button
                          onClick={() => removerItem(idx)}
                          className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Adicionar tipo */}
      {tiposDisponiveis.length > 0 && (
        <div className="flex items-center gap-2">
          <Select onValueChange={adicionarTipo}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="+ Adicionar tipo de atendimento à sequência..." />
            </SelectTrigger>
            <SelectContent>
              {tiposDisponiveis.map((tipo) => (
                <SelectItem key={tipo.id} value={tipo.id}>
                  {tipo.label || tipo.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Plus className="w-4 h-4 text-gray-400 shrink-0" />
        </div>
      )}

      {/* Legenda */}
      {sequencia && sequencia.length > 0 && (
        <div className="text-xs text-gray-500 flex items-start gap-2 bg-gray-50 rounded-lg p-3">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            <strong>Obrigatório</strong> = a engine só avança para o próximo quando este for realizado.
            <strong> Opcional</strong> = se não realizado, a engine pode pular e sugerir o próximo.
            Clique em ✓/○ para alternar.
          </span>
        </div>
      )}

      {/* Botão salvar */}
      <div className="flex items-center justify-between pt-2 border-t">
        {regraId ? (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Sequência ativa — Agenda Inteligente sincronizada
          </span>
        ) : (
          <span className="text-xs text-gray-400">Sem sequência configurada ainda</span>
        )}
        <Button
          onClick={() => saveMutation.mutate(sequencia)}
          disabled={!dirty || saveMutation.isPending || !sequencia || sequencia.length === 0}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar Sequência
        </Button>
      </div>
    </div>
  );
}