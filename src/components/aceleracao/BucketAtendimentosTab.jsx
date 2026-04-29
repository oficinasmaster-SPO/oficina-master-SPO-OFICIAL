import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Inbox, Loader2, CalendarPlus, Search, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatDateTimeBR } from "@/utils/timezone";

const ITEMS_PER_PAGE = 15;

export default function BucketAtendimentosTab({ state }) {
  const { workshops, workshopMap, consultores, user } = state;
  const queryClient = useQueryClient();
  const [agendarDialog, setAgendarDialog] = useState({ open: false, item: null });
  const [agendarForm, setAgendarForm] = useState({ data: '', hora: '', consultor_id: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");

  // Fetch pending ContractAttendances (bucket items)
  const { data: bucketItems = [], isLoading } = useQuery({
    queryKey: ['bucket-atendimentos'],
    queryFn: async () => {
      const items = await base44.entities.ContractAttendance.filter(
        { status: 'pendente' },
        'scheduled_date',
        500
      );
      return items.filter(i => !i.consultoria_atendimento_id);
    },
    staleTime: 2 * 60 * 1000
  });

  const agendarMutation = useMutation({
    mutationFn: async ({ bucketItem, data, hora, consultor_id }) => {
      const consultor = consultores?.find(c => c.id === consultor_id);
      const dataHora = `${data}T${hora}:00`;
      // Create ConsultoriaAtendimento
      const atendimento = await base44.entities.ConsultoriaAtendimento.create({
        workshop_id: bucketItem.workshop_id,
        tipo_atendimento: bucketItem.attendance_type_name || 'acompanhamento_mensal',
        status: 'agendado',
        consultor_id,
        consultor_nome: consultor?.full_name || user?.full_name || '',
        data_agendada: dataHora,
        duracao_minutos: 60,
        participantes: [],
        pauta: [],
        objetivos: []
      });
      // Link ContractAttendance
      await base44.entities.ContractAttendance.update(bucketItem.id, {
        consultoria_atendimento_id: atendimento.id,
        status: 'agendado'
      });
      return atendimento;
    },
    onSuccess: () => {
      toast.success("Atendimento agendado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['bucket-atendimentos'] });
      queryClient.invalidateQueries({ queryKey: ['atendimentos-acelerador'] });
      setAgendarDialog({ open: false, item: null });
      setAgendarForm({ data: '', hora: '', consultor_id: '' });
      setCurrentPage(1);
    },
    onError: (err) => toast.error("Erro: " + err.message)
  });

  const openAgendar = (item) => {
    const preDate = item.scheduled_date ? new Date(item.scheduled_date).toISOString().split('T')[0] : '';
    setAgendarForm({ data: preDate, hora: '09:00', consultor_id: user?.id || '' });
    setAgendarDialog({ open: true, item });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Inbox className="w-5 h-5 text-indigo-600" />
            Bucket de Atendimentos
          </h3>
          <p className="text-sm text-gray-500">Atendimentos gerados automaticamente aguardando agendamento por um consultor</p>
        </div>
        <Badge className="bg-indigo-100 text-indigo-800 text-sm px-3 py-1">
          {bucketItems.length} pendente{bucketItems.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Busca por cliente */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar por cliente..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          className="pl-9 pr-8"
        />
        {search && (
          <button onClick={() => { setSearch(""); setCurrentPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-l-4 border-l-indigo-200">
              <CardContent className="py-4 flex items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-8 rounded-full" />
                  </div>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-8 w-24 rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : bucketItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum atendimento pendente no bucket</p>
            <p className="text-sm text-gray-400">Atendimentos são gerados automaticamente ao ativar contratos com regras de frequência</p>
          </CardContent>
        </Card>
      ) : (() => {
        const filtered = search.trim()
          ? bucketItems.filter(item => {
              const name = workshopMap?.[item.workshop_id]?.name || '';
              return name.toLowerCase().includes(search.toLowerCase());
            })
          : bucketItems;
        const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
        const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
        return (
          <>
            {filtered.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <Search className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">Nenhum cliente encontrado para "{search}"</p>
                </CardContent>
              </Card>
            )}
            <div className="grid gap-3">
              {paginated.map((item) => {
                const workshop = workshopMap?.[item.workshop_id];
                return (
                  <Card key={item.id} className="border-l-4 border-l-indigo-500 hover:shadow-md transition-shadow">
                    <CardContent className="py-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900 truncate">{workshop?.name || 'Oficina'}</span>
                          <Badge variant="outline" className="text-xs shrink-0">#{item.sequence_number || '-'}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {item.scheduled_date ? formatDateTimeBR(item.scheduled_date) : 'Sem data prevista'}
                          </span>
                          <span className="capitalize">{item.attendance_type_name?.replace(/_/g, ' ') || 'Tipo não definido'}</span>
                        </div>
                      </div>
                      <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 shrink-0" onClick={() => openAgendar(item)}>
                        <CalendarPlus className="w-4 h-4 mr-1.5" />
                        Agendar
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} de {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                    Anterior
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      className={`w-8 h-8 p-0 ${page === currentPage ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* Agendar Dialog */}
      <Dialog open={agendarDialog.open} onOpenChange={(o) => setAgendarDialog({ open: o, item: o ? agendarDialog.item : null })}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="w-5 h-5 text-indigo-600" />
              Agendar Atendimento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {agendarDialog.item && (
              <div className="text-sm bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                <p className="font-medium">{workshopMap?.[agendarDialog.item.workshop_id]?.name}</p>
                <p className="text-indigo-700">{agendarDialog.item.attendance_type_name?.replace(/_/g, ' ')}</p>
              </div>
            )}
            <div>
              <Label>Data *</Label>
              <Input type="date" value={agendarForm.data} onChange={(e) => setAgendarForm(f => ({ ...f, data: e.target.value }))} />
            </div>
            <div>
              <Label>Horário *</Label>
              <Input type="time" value={agendarForm.hora} onChange={(e) => setAgendarForm(f => ({ ...f, hora: e.target.value }))} />
            </div>
            <div>
              <Label>Consultor *</Label>
              <Select value={agendarForm.consultor_id} onValueChange={(v) => setAgendarForm(f => ({ ...f, consultor_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {consultores?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAgendarDialog({ open: false, item: null })}>Cancelar</Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={agendarMutation.isPending || !agendarForm.data || !agendarForm.hora || !agendarForm.consultor_id}
              onClick={() => agendarMutation.mutate({ bucketItem: agendarDialog.item, ...agendarForm })}
            >
              {agendarMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}