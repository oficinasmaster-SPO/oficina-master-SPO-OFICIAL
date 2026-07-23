import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, CalendarPlus, Inbox, Loader2, Search, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatDateTimeBR } from "@/utils/timezone";

export default function BucketPanel({ workshopId, followUp, onClose }) {
  const queryClient = useQueryClient();
  const [agendarDialog, setAgendarDialog] = useState({ open: false, item: null });
  const [agendarForm, setAgendarForm] = useState({ data: '', hora: '', consultor_id: '' });
  const [search, setSearch] = useState("");

  // Fetch consultores (admins)
  const { data: consultores = [] } = useQuery({
    queryKey: ['consultores-list'],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ role: 'admin' }, 'full_name', 100);
      return users || [];
    },
    staleTime: 5 * 60 * 1000
  });

  // Fetch pending ContractAttendances APENAS deste workshop
  const { data: bucketItems = [], isLoading } = useQuery({
    queryKey: ['bucket-atendimentos', workshopId],
    queryFn: async () => {
      if (!workshopId) return [];
      const items = await base44.entities.ContractAttendance.filter(
        { workshop_id: workshopId, status: 'pendente' },
        'scheduled_date',
        100
      );
      return items.filter(i => !i.consultoria_atendimento_id);
    },
    enabled: !!workshopId,
    staleTime: 2 * 60 * 1000
  });

  const agendarMutation = useMutation({
    mutationFn: async ({ bucketItem, data, hora, consultor_id }) => {
      const consultor = consultores?.find(c => c.id === consultor_id);
      const dataHora = new Date(`${data}T${hora}:00`).toISOString();
      
      // Create ConsultoriaAtendimento
      const atendimento = await base44.entities.ConsultoriaAtendimento.create({
        workshop_id: bucketItem.workshop_id,
        tipo_atendimento: bucketItem.attendance_type_name || 'acompanhamento_mensal',
        status: 'agendado',
        consultor_id,
        consultor_nome: consultor?.full_name || followUp?.consultor_nome || '',
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
      queryClient.invalidateQueries({ queryKey: ['bucket-atendimentos', workshopId] });
      queryClient.invalidateQueries({ queryKey: ['atendimentos-acelerador'] });
      setAgendarDialog({ open: false, item: null });
      setAgendarForm({ data: '', hora: '', consultor_id: '' });
    },
    onError: (err) => toast.error("Erro: " + err.message)
  });

  const openAgendar = (item) => {
    const preDate = item.scheduled_date ? new Date(item.scheduled_date).toISOString().split('T')[0] : '';
    setAgendarForm({ data: preDate, hora: '09:00', consultor_id: followUp?.consultor_id || '' });
    setAgendarDialog({ open: true, item });
  };

  const filteredItems = search.trim()
    ? bucketItems.filter(item => {
        const typeLabel = (item.attendance_type_name || '').replace(/_/g, ' ').toLowerCase();
        return typeLabel.includes(search.toLowerCase());
      })
    : bucketItems;

  return (
    <div className="px-3 py-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Inbox className="w-4 h-4 text-indigo-600" />
          <p className="text-sm font-semibold text-gray-800">Bucket deste cliente</p>
        </div>
        <Badge className="bg-indigo-100 text-indigo-800 text-xs px-2 py-0.5">
          {bucketItems.length} pendente{bucketItems.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Busca por tipo de atendimento */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <Input
          placeholder="Buscar tipo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 pr-7 text-xs"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-l-4 border-l-indigo-200">
              <CardContent className="py-3 flex items-center justify-between gap-3">
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
                <Skeleton className="h-7 w-20 rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Nenhum atendimento pendente</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Atendimentos são gerados automaticamente ao ativar contratos</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
          {filteredItems.map((item) => (
            <Card key={item.id} className="border-l-4 border-l-indigo-500 hover:shadow-sm transition-shadow">
              <CardContent className="py-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-900 truncate">
                      {item.attendance_type_name?.replace(/_/g, ' ') || 'Tipo não definido'}
                    </span>
                    {item.sequence_number && (
                      <Badge variant="outline" className="text-[9px] shrink-0 px-1 py-0 h-4">
                        #{item.sequence_number}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      {item.scheduled_date ? formatDateTimeBR(item.scheduled_date) : 'Sem data'}
                    </span>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  className="bg-indigo-600 hover:bg-indigo-700 shrink-0 h-7 text-xs px-2.5" 
                  onClick={() => openAgendar(item)}
                >
                  <CalendarPlus className="w-3 h-3 mr-1" />
                  Agendar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
              <div className="text-xs bg-indigo-50 border border-indigo-200 rounded-lg p-2.5">
                <p className="font-medium text-gray-900">
                  {agendarDialog.item.attendance_type_name?.replace(/_/g, ' ')}
                </p>
                {agendarDialog.item.sequence_number && (
                  <p className="text-indigo-700 mt-0.5">Sessão #{agendarDialog.item.sequence_number}</p>
                )}
              </div>
            )}
            <div>
              <Label className="text-xs">Data *</Label>
              <Input type="date" value={agendarForm.data} onChange={(e) => setAgendarForm(f => ({ ...f, data: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Horário *</Label>
              <Input type="time" value={agendarForm.hora} onChange={(e) => setAgendarForm(f => ({ ...f, hora: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Consultor *</Label>
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
            <Button variant="outline" size="sm" onClick={() => setAgendarDialog({ open: false, item: null })}>Cancelar</Button>
            <Button
              size="sm"
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