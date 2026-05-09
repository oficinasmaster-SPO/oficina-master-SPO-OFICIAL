import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CheckCircle2, Clock, AlertCircle, Pencil, History, X, Save, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUS_COLOR = {
  a_fazer:      "bg-gray-100 text-gray-800",
  em_andamento: "bg-blue-100 text-blue-800",
  concluido:    "bg-green-100 text-green-800",
};

const STATUS_LABEL = {
  a_fazer:      "A fazer",
  em_andamento: "Em andamento",
  concluido:    "Concluído",
};

function getIcon(status) {
  if (status === 'concluido')    return <CheckCircle2 className="w-4 h-4 text-green-600" />;
  if (status === 'em_andamento') return <Clock className="w-4 h-4 text-blue-600" />;
  return <Clock className="w-4 h-4 text-gray-400" />;
}

// ─── Modal de Edição ──────────────────────────────────────────────────────────
function EditarItemModal({ item, onClose, onSaved, user }) {
  const [status, setStatus]                     = useState(item.status || 'a_fazer');
  const [progresso, setProgresso]               = useState(item.progresso_percentual || 0);
  const [observacoes, setObservacoes]           = useState(item.observacoes || '');
  const [dataTerminoReal, setDataTerminoReal]   = useState(
    item.data_termino_real ? item.data_termino_real.split('T')[0] : ''
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const agora = new Date().toISOString();
    const historico = [...(item.historico_alteracoes || [])];

    // Registrar cada campo alterado
    const campos = [
      { campo: 'status',              anterior: item.status,               novo: status },
      { campo: 'progresso_percentual',anterior: String(item.progresso_percentual || 0), novo: String(progresso) },
      { campo: 'observacoes',         anterior: item.observacoes || '',    novo: observacoes },
      { campo: 'data_termino_real',   anterior: item.data_termino_real || '', novo: dataTerminoReal },
    ];
    campos.forEach(({ campo, anterior, novo }) => {
      if (String(anterior) !== String(novo)) {
        historico.push({
          data_alteracao: agora,
          campo_alterado: campo,
          valor_anterior: String(anterior),
          valor_novo:     String(novo),
          usuario_id:     user?.id || '',
          usuario_nome:   user?.full_name || user?.email || 'Usuário',
        });
      }
    });

    const updates = {
      status,
      progresso_percentual: Number(progresso),
      observacoes,
      historico_alteracoes: historico,
    };

    // Setar data_inicio_real na primeira vez que sai de a_fazer
    if (item.status === 'a_fazer' && status !== 'a_fazer' && !item.data_inicio_real) {
      updates.data_inicio_real = agora;
    }

    if (dataTerminoReal) {
      updates.data_termino_real = new Date(dataTerminoReal).toISOString();
    } else if (status === 'concluido' && !item.data_termino_real) {
      updates.data_termino_real = agora;
    }

    if (status === 'concluido') {
      updates.progresso_percentual = 100;
    }

    await base44.entities.CronogramaImplementacao.update(item.id, updates);
    toast.success("Item atualizado com sucesso!");
    onSaved();
    onClose();
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            <span className="font-semibold text-sm">Editar Item</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Item</p>
            <p className="text-sm font-semibold text-gray-900">{item.item_nome}</p>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a_fazer">A fazer</SelectItem>
                <SelectItem value="em_andamento">Em andamento</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Progresso */}
          {status !== 'concluido' && (
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">
                Progresso: {progresso}%
              </label>
              <input
                type="range"
                min="0" max="100" step="5"
                value={progresso}
                onChange={e => setProgresso(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>0%</span><span>50%</span><span>100%</span>
              </div>
            </div>
          )}

          {/* Data conclusão real */}
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">
              Data de conclusão real
            </label>
            <Input
              type="date"
              value={dataTerminoReal}
              onChange={e => setDataTerminoReal(e.target.value)}
              className="text-sm"
            />
          </div>

          {/* Observações */}
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">Observações</label>
            <Textarea
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              placeholder="Adicione observações sobre este item..."
              className="text-sm min-h-20 resize-none"
            />
          </div>

          {/* Botões */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 text-sm" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button className="flex-1 text-sm bg-gray-900 hover:bg-gray-800 text-white gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal de Histórico ───────────────────────────────────────────────────────
function HistoricoModal({ item, onClose }) {
  const historico = [...(item.historico_alteracoes || [])].reverse();

  const CAMPO_LABEL = {
    status:               'Status',
    progresso_percentual: 'Progresso',
    observacoes:          'Observações',
    data_termino_real:    'Data de conclusão',
    data_inicio_real:     'Data de início',
  };

  const formatValor = (campo, valor) => {
    if (!valor) return '—';
    if (campo === 'status') return STATUS_LABEL[valor] || valor;
    if (campo === 'progresso_percentual') return `${valor}%`;
    if (campo.includes('data') && valor.includes('T')) {
      return format(new Date(valor), 'dd/MM/yyyy HH:mm');
    }
    return valor.length > 60 ? valor.substring(0, 60) + '…' : valor;
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="bg-gray-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4" />
            <span className="font-semibold text-sm">Histórico de Alterações</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          <p className="text-xs font-semibold text-gray-700 mb-3 truncate">{item.item_nome}</p>

          {historico.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhuma alteração registrada.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1 scrollbar-thin">
              {historico.map((h, idx) => (
                <div key={idx} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-gray-700">
                      {CAMPO_LABEL[h.campo_alterado] || h.campo_alterado}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {h.data_alteracao ? format(new Date(h.data_alteracao), 'dd/MM/yy HH:mm') : '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="bg-red-50 text-red-700 border border-red-200 rounded px-1.5 py-0.5 line-through opacity-70">
                      {formatValor(h.campo_alterado, h.valor_anterior)}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="bg-green-50 text-green-700 border border-green-200 rounded px-1.5 py-0.5 font-medium">
                      {formatValor(h.campo_alterado, h.valor_novo)}
                    </span>
                  </div>
                  {h.usuario_nome && (
                    <p className="text-[10px] text-gray-400 mt-1.5">por {h.usuario_nome}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function CronogramaTab({ workshopId }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem]     = useState(null);
  const [historicoItem, setHistoricoItem] = useState(null);
  const [gerando, setGerando]             = useState(false);

  const { data: cronograma = [], isLoading } = useQuery({
    queryKey: ['cronograma-implementacao', workshopId],
    queryFn: () =>
      base44.entities.CronogramaImplementacao.filter(
        { workshop_id: workshopId },
        'ordem'
      ),
    enabled: !!workshopId,
    staleTime: 2 * 60 * 1000,
  });

  const progresso = cronograma.length === 0
    ? 0
    : Math.round((cronograma.filter(i => i.status === 'concluido').length / cronograma.length) * 100);

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['cronograma-implementacao', workshopId] });
  };

  const handleGerarItens = async () => {
    setGerando(true);
    try {
      const res = await base44.functions.invoke('generateFullCronograma', { workshop_id: workshopId });
      const data = res?.data;
      if (data?.items_created === 0) {
        toast.info('Todos os itens já estavam gerados. Nenhum novo item criado.');
      } else {
        toast.success(`${data?.items_created || 0} item(s) criado(s) com sucesso!`);
      }
      queryClient.invalidateQueries({ queryKey: ['cronograma-implementacao', workshopId] });
    } catch (err) {
      toast.error('Erro ao gerar itens: ' + err.message);
    } finally {
      setGerando(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
        <p className="text-gray-500 mt-3 text-sm">Carregando cronograma...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Progresso Geral */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Progresso do Plano</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Progresso Total</span>
                <span className="font-semibold">{progresso}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progresso}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{cronograma.filter(i => i.status === 'concluido').length} concluídos</span>
                <span>{cronograma.filter(i => i.status === 'em_andamento').length} em andamento</span>
                <span>{cronograma.filter(i => i.status === 'a_fazer').length} a fazer</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de itens */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Itens do Cronograma</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={handleGerarItens}
                disabled={gerando}
                className="h-7 text-xs gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                {gerando ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                {gerando ? 'Gerando...' : 'Gerar itens faltantes'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {cronograma.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Nenhum cronograma gerado ainda.</p>
                <p className="text-xs mt-1">Será criado automaticamente após a ativação do plano.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cronograma.map((item, index) => (
                  <div key={item.id} className="border rounded-lg p-3 hover:shadow-sm transition-shadow">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 flex-shrink-0">{getIcon(item.status)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900 leading-tight">
                            {index + 1}. {item.item_nome}
                          </span>
                          {/* Ações */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => setHistoricoItem(item)}
                              title="Histórico de alterações"
                              className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingItem(item)}
                              title="Editar item"
                              className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`text-xs ${STATUS_COLOR[item.status] || STATUS_COLOR.a_fazer}`}>
                            {STATUS_LABEL[item.status] || item.status}
                          </Badge>
                          {item.fase && (
                            <Badge variant="outline" className="text-[10px]">{item.fase}</Badge>
                          )}
                          {(item.historico_alteracoes?.length > 0) && (
                            <span className="text-[10px] text-gray-400">
                              {item.historico_alteracoes.length} alteraç{item.historico_alteracoes.length === 1 ? 'ão' : 'ões'}
                            </span>
                          )}
                        </div>

                        {item.progresso_percentual > 0 && item.status === 'em_andamento' && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>Progresso</span><span>{item.progresso_percentual}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${item.progresso_percentual}%` }} />
                            </div>
                          </div>
                        )}

                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500">
                          {item.data_inicio_real && (
                            <div><span className="font-medium">Iniciado:</span>{" "}{new Date(item.data_inicio_real).toLocaleDateString('pt-BR')}</div>
                          )}
                          {item.data_termino_previsto && (
                            <div><span className="font-medium">Prev. conclusão:</span>{" "}{new Date(item.data_termino_previsto).toLocaleDateString('pt-BR')}</div>
                          )}
                          {item.data_termino_real && (
                            <div><span className="font-medium">Concluído em:</span>{" "}{new Date(item.data_termino_real).toLocaleDateString('pt-BR')}</div>
                          )}
                        </div>

                        {item.observacoes && (
                          <p className="text-xs text-gray-500 mt-1 italic line-clamp-2">{item.observacoes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      {editingItem && (
        <EditarItemModal
          item={editingItem}
          user={user}
          onClose={() => setEditingItem(null)}
          onSaved={handleSaved}
        />
      )}
      {historicoItem && (
        <HistoricoModal
          item={historicoItem}
          onClose={() => setHistoricoItem(null)}
        />
      )}
    </>
  );
}