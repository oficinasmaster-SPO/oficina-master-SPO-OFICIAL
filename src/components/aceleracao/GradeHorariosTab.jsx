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
import { Clock, Plus, Trash2, GripVertical, User, CalendarDays, ChevronUp, ChevronDown, Settings } from "lucide-react";
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
  const [diaEditando, setDiaEditando] = useState(null); // dia_semana number
  const [novoHorario, setNovoHorario] = useState({ hora: "09:00" });

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
    const horariosAtualizados = [
      ...(diaRegistro.horarios || []),
      {
        hora: novoHorario.hora,
        prioridade: (diaRegistro.horarios?.length || 0) + 1,
        tipo_atendimento_ids: [],
        ativo: true,
      },
    ].sort((a, b) => a.hora.localeCompare(b.hora))
     .map((h, idx) => ({ ...h, prioridade: idx + 1 }));

    salvarMutation.mutate({ ...diaRegistro, horarios: horariosAtualizados });
    setDialogAberto(false);
    setNovoHorario({ hora: "09:00" });
  };

  const removerHorario = (diaRegistro, idx) => {
    const atualizados = diaRegistro.horarios
      .filter((_, i) => i !== idx)
      .map((h, i) => ({ ...h, prioridade: i + 1 }));
    salvarMutation.mutate({ ...diaRegistro, horarios: atualizados });
  };

  const moverPrioridade = (diaRegistro, idx, direcao) => {
    const arr = [...diaRegistro.horarios];
    const outro = idx + direcao;
    if (outro < 0 || outro >= arr.length) return;
    [arr[idx], arr[outro]] = [arr[outro], arr[idx]];
    const atualizados = arr.map((h, i) => ({ ...h, prioridade: i + 1 }));
    salvarMutation.mutate({ ...diaRegistro, horarios: atualizados });
  };

  const toggleSlot = (diaRegistro, idx) => {
    const atualizados = diaRegistro.horarios.map((h, i) =>
      i === idx ? { ...h, ativo: !h.ativo } : h
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
                            className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm border ${
                              slot.ativo
                                ? "bg-white border-gray-200"
                                : "bg-gray-50 border-gray-100 opacity-50"
                            }`}
                          >
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
                              onCheckedChange={() => toggleSlot(diaRegistro, diaRegistro.horarios.findIndex(h => h.hora === slot.hora && h.prioridade === slot.prioridade))}
                              className="scale-[0.65]"
                            />

                            {/* Mover prioridade */}
                            <div className="flex flex-col gap-0">
                              <button
                                onClick={() => moverPrioridade(diaRegistro, diaRegistro.horarios.findIndex(h => h.hora === slot.hora && h.prioridade === slot.prioridade), -1)}
                                className="text-gray-300 hover:text-indigo-500 transition-colors"
                                title="Aumentar prioridade"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => moverPrioridade(diaRegistro, diaRegistro.horarios.findIndex(h => h.hora === slot.hora && h.prioridade === slot.prioridade), 1)}
                                className="text-gray-300 hover:text-indigo-500 transition-colors"
                                title="Diminuir prioridade"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Remover */}
                            <button
                              onClick={() => removerHorario(diaRegistro, diaRegistro.horarios.findIndex(h => h.hora === slot.hora && h.prioridade === slot.prioridade))}
                              className="text-gray-300 hover:text-red-500 transition-colors"
                              title="Remover horário"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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