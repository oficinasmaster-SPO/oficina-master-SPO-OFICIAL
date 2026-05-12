import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, AlertTriangle, FilePlus, Play, StopCircle, CalendarClock, FileText, CheckCircle, Trash2, Clock, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ATENDIMENTO_STATUS, ATENDIMENTO_STATUS_COLORS, ATENDIMENTO_STATUS_LABELS } from "@/components/lib/ataConstants";
import { formatDateTimeBR } from "@/utils/timezone";
import { useAttendanceValidation } from "@/hooks/useAttendanceValidation";
import { toast } from "sonner";

export default function AtendimentoRow({
  atendimento, workshop, ataVinculada, consultores,
  onOpenDetails, onOpenVisualizar, onIniciar, verificarRascunho,
  onReagendar, onCancelar, onFaltou, onConcluir, onEditar,
  onVerAta, onGerarAta, onDeleteConfirm, queryClient
}) {
  const validation = useAttendanceValidation(
    atendimento.workshop_id,
    atendimento.tipo_atendimento,
    atendimento.data_agendada
  );

  const hasValidationIssues = validation.warnings && validation.warnings.length > 0;
  const rowBgClass = hasValidationIssues
    ? (validation.warnings.some(w => w.severity === 'error') ? 'bg-red-50' : 'bg-yellow-50')
    : '';

  const handleRowClick = () => {
    if (hasValidationIssues) {
      onOpenDetails(atendimento, validation);
    } else {
      onOpenVisualizar(atendimento.id);
    }
  };

  return (
    <tr
      className={`hover:opacity-80 transition-colors cursor-pointer ${rowBgClass}`}
      onClick={handleRowClick}
    >
      <td className="py-3 px-3 text-sm text-gray-700 border-r border-gray-100 font-medium truncate" title={workshop?.name || '-'}>
        {workshop?.name || '-'}
        {hasValidationIssues && (
          <span className="ml-1 text-[10px] text-red-600 font-semibold">⚠️</span>
        )}
      </td>
      <td className="py-3 px-3 border-r border-gray-100">
        {workshop?.planoAtual ? (
          <span className={`text-[11px] font-semibold px-2 py-1 rounded uppercase tracking-wide ${
            workshop.planoAtual === 'GOLD' || workshop.planoAtual === 'IOM' || workshop.planoAtual === 'MILLIONS'
              ? 'bg-yellow-100 text-yellow-800'
              : workshop.planoAtual === 'PRATA'
              ? 'bg-gray-100 text-gray-700'
              : workshop.planoAtual === 'BRONZE'
              ? 'bg-orange-100 text-orange-700'
              : workshop.planoAtual === 'START'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-500'
          }`}>
            {workshop.planoAtual}
          </span>
        ) : (
          <span className="text-[11px] text-gray-400">—</span>
        )}
      </td>
      <td className="py-3 px-3 text-sm text-gray-600 border-r border-gray-100 capitalize truncate" title={atendimento.tipo_atendimento?.replace(/_/g, ' ') || '-'}>
        {atendimento.tipo_atendimento?.replace(/_/g, ' ') || '-'}
      </td>
      <td className="py-3 px-3 text-sm text-gray-700 border-r border-gray-100 font-medium truncate" title={atendimento.consultor_nome || '-'}>
        {atendimento.consultor_nome || '-'}
      </td>
      <td className="py-3 px-3 border-r border-gray-100">
        {atendimento.created_by?.startsWith('service+') || atendimento.created_by?.startsWith('service_') ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded bg-violet-50 text-violet-700 border border-violet-200 whitespace-nowrap">
            ⚙️ Sistema (auto)
          </span>
        ) : (
          <span className="text-sm text-gray-600 truncate block max-w-[110px]" title={atendimento.created_by || '-'}>
            {consultores.find(c => c.email === atendimento.created_by)?.full_name || atendimento.created_by?.split('@')[0] || '-'}
          </span>
        )}
      </td>
      <td className="py-3 px-3 text-sm text-gray-600 border-r border-gray-100 whitespace-nowrap">
        {formatDateTimeBR(atendimento.data_agendada)}
      </td>
      <td className="py-3 px-3 text-sm text-gray-500 border-r border-gray-100 whitespace-nowrap">
        {atendimento.created_date ? formatDateTimeBR(atendimento.created_date) : '-'}
      </td>
      <td className="py-3 px-3 text-sm text-gray-600 border-r border-gray-100">
        <div className="flex items-center justify-center">
          {ataVinculada?.code ? (
            <span className="font-mono text-[11px] bg-blue-50 px-2 py-1.5 rounded border border-blue-200 whitespace-nowrap inline-flex items-center justify-center">
              {ataVinculada.code.replace('IT.', 'AT.')}
            </span>
          ) : (
            <span className="inline-flex items-center justify-center gap-1 text-amber-600 bg-amber-50 px-2 py-1.5 rounded border border-amber-200 text-[11px] font-medium whitespace-nowrap">
              <Clock className="w-3 h-3" />
              Pendente
            </span>
          )}
        </div>
      </td>
      <td className="py-3 px-3 text-sm text-gray-600 border-r border-gray-100">
        <Badge className={`${ATENDIMENTO_STATUS_COLORS[atendimento.status] || 'bg-gray-100 text-gray-800 border-gray-300'} text-[11px] px-2 py-1 inline-flex items-center justify-center min-w-[100px]`}>
          {atendimento.status === ATENDIMENTO_STATUS.ATRASADO && <AlertTriangle className="w-3 h-3 mr-1" />}
          {atendimento.status === ATENDIMENTO_STATUS.REALIZADO && <AlertTriangle className="w-3 h-3 mr-1" />}
          {ATENDIMENTO_STATUS_LABELS[atendimento.status] || atendimento.status || 'Indefinido'}
        </Badge>
      </td>
      <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-8 w-8 p-0 border-gray-200 bg-white hover:bg-gray-50 shadow-sm transition-colors">
                <span className="sr-only">Abrir menu</span>
                <MoreVertical className="h-4 w-4 text-gray-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {(atendimento.status === ATENDIMENTO_STATUS.AGENDADO || atendimento.status === ATENDIMENTO_STATUS.REAGENDADO) && (
                <DropdownMenuItem onClick={async () => {
                  await base44.entities.ConsultoriaAtendimento.update(atendimento.id, { status: 'confirmado' });
                  toast.success('Status confirmado');
                  queryClient.invalidateQueries({ queryKey: ['atendimentos-acelerador'] });
                }} className="cursor-pointer">
                  <CheckCircle className="mr-2 h-4 w-4 text-yellow-600" />
                  <span>Confirmar</span>
                </DropdownMenuItem>
              )}

              {(atendimento.status === ATENDIMENTO_STATUS.AGENDADO ||
                atendimento.status === ATENDIMENTO_STATUS.CONFIRMADO ||
                atendimento.status === ATENDIMENTO_STATUS.REAGENDADO ||
                atendimento.status === ATENDIMENTO_STATUS.ATRASADO ||
                !atendimento.status) && (
                <>
                  {(() => {
                    const rascunho = verificarRascunho(atendimento.id);
                    return (
                      <DropdownMenuItem
                        onClick={() => onIniciar(atendimento.id)}
                        className={`cursor-pointer ${rascunho ? 'bg-cyan-50 focus:bg-cyan-100' : ''}`}
                      >
                        <Play className={`mr-2 h-4 w-4 ${rascunho ? 'text-cyan-600' : 'text-blue-600'}`} />
                        <span className={rascunho ? 'text-cyan-700 font-semibold' : ''}>{rascunho ? 'Retomar Atendimento' : 'Iniciar Atendimento'}</span>
                      </DropdownMenuItem>
                    );
                  })()}
                  <DropdownMenuItem onClick={() => onReagendar(atendimento)} className="cursor-pointer">
                    <CalendarClock className="mr-2 h-4 w-4 text-purple-600" />
                    <span>Reagendar</span>
                  </DropdownMenuItem>
                </>
              )}

              {atendimento.status === ATENDIMENTO_STATUS.REALIZADO && (
                <DropdownMenuItem onClick={() => onConcluir(atendimento)} className="cursor-pointer">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                  <span>Concluir Atendimento</span>
                </DropdownMenuItem>
              )}

              {!['cancelado', 'faltou', 'concluido'].includes(atendimento.status) && (
                <DropdownMenuItem onClick={() => onCancelar(atendimento)} className="cursor-pointer">
                  <StopCircle className="mr-2 h-4 w-4 text-red-600" />
                  <span>Cancelar</span>
                </DropdownMenuItem>
              )}

              {atendimento.status === ATENDIMENTO_STATUS.ATRASADO && (
                <DropdownMenuItem onClick={() => onFaltou(atendimento)} className="cursor-pointer">
                  <AlertTriangle className="mr-2 h-4 w-4 text-orange-600" />
                  <span>Faltou</span>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem onClick={() => onEditar(atendimento.id)} className="cursor-pointer">
                <Edit className="mr-2 h-4 w-4 text-gray-600" />
                <span>Editar</span>
              </DropdownMenuItem>

              {atendimento.ata_id && (
                <DropdownMenuItem onClick={() => {
                  if (ataVinculada) onVerAta(ataVinculada);
                  else toast.error("ATA não encontrada");
                }} className="cursor-pointer">
                  <FileText className="mr-2 h-4 w-4 text-green-600" />
                  <span>Ver/Finalizar ATA</span>
                </DropdownMenuItem>
              )}

              {!atendimento.ata_id && (atendimento.status === ATENDIMENTO_STATUS.REALIZADO || atendimento.status === ATENDIMENTO_STATUS.CONCLUIDO) && (
                <DropdownMenuItem onClick={() => onGerarAta(atendimento)} className="cursor-pointer">
                  <FilePlus className="mr-2 h-4 w-4 text-blue-600" />
                  <span>Gerar ATA</span>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {atendimento.ata_id && (
                <DropdownMenuItem className="text-orange-600 focus:text-orange-600 focus:bg-orange-50 cursor-pointer" onClick={() => onDeleteConfirm({ type: 'ata', atendimento })}>
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Excluir apenas a ATA</span>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer" onClick={() => onDeleteConfirm({ type: 'atendimento', atendimento })}>
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Excluir Atendimento</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
}