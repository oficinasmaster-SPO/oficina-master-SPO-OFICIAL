import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Clock, Plus, Trash2, GripVertical, User, CalendarDays, ChevronUp, ChevronDown, Settings, Check } from "lucide-react";
import { toast } from "sonner";

const DIAS_SEMANA = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
];

const DIA_LABELS_SHORT = { 0: "Dom", 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb" };

export default function GradeHorariosTab({ consultores = [], user }) {
  const queryClient = useQueryClient();
  const [consultorSelecionado, setConsultorSelecionado] = useState(user?.id || "");
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editandoSlot, setEditandoSlot] = useState(null); // { diaRegistro, slot }
  const [diaEditando, setDiaEditando] = useState(null); // dia_semana number
  const [novoHorario, setNovoHorario] = useState({ hora: "09:00" });

  // Buscar tipos de atendimento disponíveis
  const { data: tiposAtendimento = [] } = useQuery({
    queryKey: ['tipos-atendimento'],
    queryFn: () => base44.entities.TipoAtendimentoConsultoria?.list?.() || [],
  });

  // Buscar grade do consultor selecionado
  const { data: grade = [], isLoading } = useQuery({
    queryKey: ["horarios-disponiveis", consultorSelecionado],
    queryFn: () =>
      consultorSelecionado
        ? base44.entities.HorarioDisponivel.filter({ consultor_id: consultorSelecionado })
        : [],
    enabled: !!consultorSelecionado,
  });

  const consultorAtual = consultores.find((c) => c.id === consultorSelecionado);

  // Garante que todos os dias da semana apareçam
  const gradeCompleta = DIAS_SEMANA.map((dia) => {
    const existente = grade.find((g) => g.dia_semana === dia.value);
    return (
      existente || {
        _novo: true,
        consultor_id: consultorSelecionado,
        consultor_nome: consultorAtual?.full_name || "",
        dia_semana: dia.value,
        horarios: [],
        ativo: true,
      }
    );
  });

  // Salvar/criar registro de um dia
  const salvarMutation = useMutation({
    mutationFn: async (registro) => {
      if (registro.id) {
        return base44.entities.HorarioDisponivel.update(registro.id, registro);
      } else {
        const { _novo, ...dados } = registro;
        return base44.entities.HorarioDisponivel.create(dados);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["horarios-disponiveis", consultorSelecionado] });
      toast.success("Grade salva!");
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  const adicionarHorario = (diaRegistro) => {
    // BUG-FIX #1: Verificar duplicata de horário no mesmo dia
    const jaExiste = diaRegistro.horarios?.some(h => h.hora === novoHorario.hora);
    if (jaExiste) {
      toast.error(`Horário ${novoHorario.hora} já existe neste dia.`);
      return;
    }
    // Adiciona no final mantendo prioridade manual — não reordena por hora
    // (admin pode querer 14h como P1 e 11h como P2)
    const horariosAtualizados = [
      ...(diaRegistro.horarios || []),
      {
        hora: novoHorario.hora,
        prioridade: (diaRegistro.horarios?.length || 0) + 1,
        tipo_atendimento_ids: [],
        ativo: true,
      },
    ];

    salvarMutation.mutate({ ...diaRegistro, horarios: horariosAtualizados });
    setDialogAberto(false);
    setNovoHorario({ hora: "09:00" });
  };

  const removerHorario = (diaRegistro, slotHora, slotPrioridade) => {
    // BUG-FIX #2: usar hora+prioridade como chave composta em vez de idx
    // (idx do array sorted ≠ idx do array original após .slice().sort())
    const atualizados = diaRegistro.horarios
      .filter(h => !(h.hora === slotHora && h.prioridade === slotPrioridade))
      .map((h, i) => ({ ...h, prioridade: i + 1 }));
    salvarMutation.mutate({ ...diaRegistro, horarios: atualizados });
  };

  const moverPrioridade = (diaRegistro, slotHora, slotPrioridade, direcao) => {
    // BUG-FIX #3: operar sobre o array JÁ ordenado por prioridade (o que o usuário vê)
    const arr = [...diaRegistro.horarios].sort((a, b) => a.prioridade - b.prioridade);
    const idx = arr.findIndex(h => h.hora === slotHora && h.prioridade === slotPrioridade);
    const outro = idx + direcao;
    if (outro < 0 || outro >= arr.length) return;
    [arr[idx], arr[outro]] = [arr[outro], arr[idx]];
    const atualizados = arr.map((h, i) => ({ ...h, prioridade: i + 1 }));
    salvarMutation.mutate({ ...diaRegistro, horarios: atualizados });
  };

  const toggleSlot = (diaRegistro, slotHora, slotPrioridade) => {
    // BUG-FIX #4: mesma correção de chave composta para toggle
    const atualizados = diaRegistro.horarios.map(h =>
      h.hora === slotHora && h.prioridade === slotPrioridade ? { ...h, ativo: !h.ativo } : h
    );
    salvarMutation.mutate({ ...diaRegistro, horarios: atualizados });
  };

  const toggleDia = (diaRegistro) => {
    salvarMutation.mutate({ ...diaRegistro, ativo: !diaRegistro.ativo });
  };

  if (!consultorSelecionado) {
    return (
      <div className="space-y-4">
        <SeletorConsultor consultores={consultores} value={consultorSelecionado} onChange={setConsultorSelecionado} />
        <div className="text-center py-16 text-gray-400">
          <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Selecione um consultor para configurar a grade de horários</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header com seletor */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
            Grade de Horários
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Defina os slots disponíveis por dia da semana e a ordem de prioridade
          </p>
        </div>
        <SeletorConsultor consultores={consultores} value={consultorSelecionado} onChange={setConsultorSelecionado} />
      </div>

      {/* Info de prioridade */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-start gap-2 text-sm text-blue-800">
        <GripVertical className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          A <strong>prioridade</strong> define a ordem em que os horários são oferecidos ao cliente.
          Use as setas ↑↓ para reordenar. O horário <strong>P1</strong> é sempre o primeiro exibido.
        </span>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {DIAS_SEMANA.map((d) => (
            <Card key={d.value} className="animate-pulse">
              <CardHeader className="pb-3"><div className="h-5 w-24 bg-gray-200 rounded" /></CardHeader>
              <CardContent><div className="h-16 bg-gray-100 rounded" /></CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {gradeCompleta.map((diaRegistro) => {
            const diaLabel = DIAS_SEMANA.find((d) => d.value === diaRegistro.dia_semana)?.label;
            const horariosAtivos = diaRegistro.horarios?.filter((h) => h.ativo) || [];
            const horariosInativos = diaRegistro.horarios?.filter((h) => !h.ativo) || [];

            return (
              <Card
                key={diaRegistro.dia_semana}
                className={`border-2 transition-all ${diaRegistro.ativo ? "border-indigo-200" : "border-gray-200 opacity-60"}`}
              >
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        diaRegistro.ativo
                          ? "bg-indigo-100 text-indigo-800 text-xs px-2"
                          : "bg-gray-100 text-gray-500 text-xs px-2"
                      }
                    >
                      {DIA_LABELS_SHORT[diaRegistro.dia_semana]}
                    </Badge>
                    <span className="font-semibold text-gray-800 text-sm">{diaLabel}</span>
                    {horariosAtivos.length > 0 && (
                      <span className="text-xs text-gray-400">({horariosAtivos.length} slot{horariosAtivos.length !== 1 ? "s" : ""})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={diaRegistro.ativo}
                      onCheckedChange={() => toggleDia(diaRegistro)}
                      className="scale-75"
                    />
                  </div>
                </CardHeader>

                <CardContent className="pt-0 space-y-2">
                  {diaRegistro.horarios?.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-3 border border-dashed rounded-md">
                      Nenhum horário cadastrado
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {diaRegistro.horarios
                        .slice()
                        .sort((a, b) => a.prioridade - b.prioridade)
                        .map((slot, idx) => (
                          <div
                             key={idx}
                             className={`flex flex-col rounded-md px-2 py-1.5 text-sm border gap-1 ${
                               slot.ativo
                                 ? "bg-white border-gray-200"
                                 : "bg-gray-50 border-gray-100 opacity-50"
                             }`}
                           >
                             <div className="flex items-center gap-2">
                               {/* Prioridade */}
                               <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                                 {slot.prioridade}
                               </span>

                               {/* Hora */}
                               <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                               <span className="font-mono font-medium text-gray-800 flex-1">{slot.hora}</span>

                               {/* Ativo toggle */}
                               <Switch
                                 checked={slot.ativo}
                                 onCheckedChange={() => toggleSlot(diaRegistro, slot.hora, slot.prioridade)}
                                 className="scale-[0.65]"
                               />

                               {/* Mover prioridade */}
                               <div className="flex flex-col gap-0">
                                 <button
                                   onClick={() => moverPrioridade(diaRegistro, slot.hora, slot.prioridade, -1)}
                                   className="text-gray-300 hover:text-indigo-500 transition-colors"
                                   title="Aumentar prioridade"
                                 >
                                   <ChevronUp className="w-3.5 h-3.5" />
                                 </button>
                                 <button
                                   onClick={() => moverPrioridade(diaRegistro, slot.hora, slot.prioridade, 1)}
                                   className="text-gray-300 hover:text-indigo-500 transition-colors"
                                   title="Diminuir prioridade"
                                 >
                                   <ChevronDown className="w-3.5 h-3.5" />
                                 </button>
                               </div>

                               {/* Editar tipos */}
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 className="h-6 px-2 text-xs text-indigo-600 hover:bg-indigo-50"
                                 onClick={() => setEditandoSlot({ diaRegistro, slot })}
                               >
                                 <Settings className="w-3 h-3" />
                               </Button>

                               {/* Remover */}
                               <button
                                 onClick={() => removerHorario(diaRegistro, slot.hora, slot.prioridade)}
                                 className="text-gray-300 hover:text-red-500 transition-colors"
                                 title="Remover horário"
                               >
                                 <Trash2 className="w-3.5 h-3.5" />
                               </button>
                             </div>

                             {/* Tipos de atendimento */}
                             {slot.tipo_atendimento_ids?.length > 0 && (
                               <div className="flex flex-wrap gap-1 pl-8">
                                 {slot.tipo_atendimento_ids.map((id) => {
                                   const tipo = tiposAtendimento.find(t => t.id === id);
                                   return (
                                     <Badge key={id} variant="outline" className="text-xs">
                                       {tipo?.nome || id}
                                     </Badge>
                                   );
                                 })}
                               </div>
                             )}
                           </div>
                        ))}
                    </div>
                  )}

                  {/* Botão adicionar */}
                  {diaRegistro.ativo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-indigo-600 hover:bg-indigo-50 border border-dashed border-indigo-200 mt-1 h-8 text-xs"
                      onClick={() => {
                        setDiaEditando(diaRegistro);
                        setDialogAberto(true);
                      }}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Adicionar horário
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Resumo rápido */}
      {grade.length > 0 && (
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="py-3">
            <div className="flex items-center gap-3 flex-wrap text-sm text-gray-600">
              <Settings className="w-4 h-4 text-gray-400" />
              <span className="font-medium">Resumo da grade:</span>
              {gradeCompleta
                .filter((d) => d.ativo && d.horarios?.some((h) => h.ativo))
                .map((d) => (
                  <span key={d.dia_semana} className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">
                      {DIA_LABELS_SHORT[d.dia_semana]}
                    </Badge>
                    {d.horarios.filter((h) => h.ativo).map((h) => h.hora).join(", ")}
                  </span>
                ))}
              {gradeCompleta.every((d) => !d.ativo || !d.horarios?.some((h) => h.ativo)) && (
                <span className="text-gray-400 italic">Nenhum horário ativo configurado</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog: adicionar novo horário */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Novo horário —{" "}
              {DIAS_SEMANA.find((d) => d.value === diaEditando?.dia_semana)?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Horário</Label>
              <Input
                type="time"
                value={novoHorario.hora}
                onChange={(e) => setNovoHorario({ hora: e.target.value })}
                className="mt-1"
              />
            </div>
            <p className="text-xs text-gray-500">
              A prioridade será atribuída automaticamente (último na ordem).
              Use as setas ↑↓ para reordenar depois.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={!novoHorario.hora || salvarMutation.isPending}
              onClick={() => adicionarHorario(diaEditando)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: editar tipos de atendimento do slot */}
      <Dialog open={!!editandoSlot} onOpenChange={() => setEditandoSlot(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-600" />
              Tipos de Atendimento — {editandoSlot?.slot.hora}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Selecione os tipos de atendimento permitidos:</Label>
              <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                {tiposAtendimento.map((tipo) => (
                  <label key={tipo.id} className="flex items-center gap-2 p-2 hover:bg-white rounded transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(editandoSlot?.slot.tipo_atendimento_ids || []).includes(tipo.id)}
                      onChange={(e) => {
                        const ids = editandoSlot?.slot.tipo_atendimento_ids || [];
                        const updated = e.target.checked
                          ? [...ids, tipo.id]
                          : ids.filter(id => id !== tipo.id);
                        setEditandoSlot({
                          ...editandoSlot,
                          slot: { ...editandoSlot.slot, tipo_atendimento_ids: updated }
                        });
                      }}
                      className="cursor-pointer"
                    />
                    <span className="text-sm">{tipo.nome}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Se vazio, o slot atende <strong>qualquer tipo</strong> de atendimento.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditandoSlot(null)}>
              Cancelar
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={salvarMutation.isPending}
              onClick={() => {
                const diaAtualizado = {
                  ...editandoSlot.diaRegistro,
                  horarios: editandoSlot.diaRegistro.horarios.map(h =>
                    h.hora === editandoSlot.slot.hora && h.prioridade === editandoSlot.slot.prioridade
                      ? editandoSlot.slot
                      : h
                  )
                };
                salvarMutation.mutate(diaAtualizado);
                setEditandoSlot(null);
              }}
            >
              <Check className="w-4 h-4 mr-1" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SeletorConsultor({ consultores, value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <User className="w-4 h-4 text-gray-400 shrink-0" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Selecionar consultor..." />
        </SelectTrigger>
        <SelectContent>
          {consultores.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}