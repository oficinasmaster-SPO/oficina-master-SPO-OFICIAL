import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2, X, Clock } from "lucide-react";
import { toast } from "sonner";

export default function TipoAtendimentoManager({ customTipos = [], onSave }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [tipos, setTipos] = useState([]);
  const [novoTipo, setNovoTipo] = useState("");
  const [duracaoMinutos, setDuracaoMinutos] = useState("60");

  const { data: tiposDoBank = [], isLoading: isLoadingTipos } = useQuery({
    queryKey: ['tipos-atendimento-consultoria'],
    queryFn: async () => {
      const tipos = await base44.entities.TipoAtendimentoConsultoria.filter({ ativo: true });
      return tipos || [];
    },
    staleTime: 5 * 60 * 1000
  });

  useEffect(() => {
    if (isOpen) {
      setTipos(tiposDoBank);
    }
  }, [isOpen, tiposDoBank]);

  const createTipoMutation = useMutation({
    mutationFn: (novoTipoData) => base44.entities.TipoAtendimentoConsultoria.create(novoTipoData),
    onSuccess: (novoTipoCriado) => {
      setTipos(prev => [...prev, novoTipoCriado]);
      setNovoTipo("");
      setDuracaoMinutos("60");
      toast.success("Tipo criado com sucesso!");
      queryClient.invalidateQueries(['tipos-atendimento-consultoria']);
      queryClient.invalidateQueries(['attendance-types']);
    },
    onError: (error) => {
      toast.error("Erro ao salvar tipo: " + error.message);
    }
  });

  const deleteTipoMutation = useMutation({
    mutationFn: (tipoId) => base44.entities.TipoAtendimentoConsultoria.delete(tipoId),
    onSuccess: () => {
      toast.success("Tipo removido!");
      queryClient.invalidateQueries(['tipos-atendimento-consultoria']);
      queryClient.invalidateQueries(['attendance-types']);
    },
    onError: (error) => {
      toast.error("Erro ao remover tipo: " + error.message);
    }
  });

  const addTipo = () => {
    if (!novoTipo.trim()) {
      toast.error("Digite um nome para o tipo");
      return;
    }

    const mins = parseInt(duracaoMinutos);
    if (!mins || mins < 5) {
      toast.error("Duração mínima: 5 minutos");
      return;
    }

    const value = novoTipo.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (tipos.some(t => t.value === value)) {
      toast.error("Tipo já existe");
      return;
    }

    createTipoMutation.mutate({
      value,
      label: novoTipo.trim(),
      duracao_minutos: mins,
      ativo: true
    });
  };

  const removeTipo = (index) => {
    const tipo = tipos[index];
    if (tipo.id) {
      deleteTipoMutation.mutate(tipo.id);
    }
    setTipos(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(true); }}
      >
        <Plus className="w-4 h-4 mr-2" />
        Gerenciar Tipos
      </Button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Gerenciar Tipos de Atendimento</h2>
              <button type="button" onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              {/* Adicionar novo tipo */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <Label className="text-sm font-semibold">Adicionar Novo Tipo</Label>
                <Input
                  placeholder="Ex: Mentoria Individual, Workshop Técnico..."
                  value={novoTipo}
                  onChange={(e) => setNovoTipo(e.target.value)}
                />
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-xs text-gray-500">Duração (minutos)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="5"
                        step="5"
                        placeholder="60"
                        value={duracaoMinutos}
                        onChange={(e) => setDuracaoMinutos(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTipo(); } }}
                        className="pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">min</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={(e) => { e.preventDefault(); addTipo(); }}
                    disabled={createTipoMutation.isPending}
                    className="shrink-0"
                  >
                    {createTipoMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <><Plus className="w-4 h-4 mr-1" /> Adicionar</>
                    )}
                  </Button>
                </div>
              </div>

              {/* Lista de tipos existentes */}
              <div>
                <Label className="text-sm font-semibold">Tipos Cadastrados</Label>
                {isLoadingTipos ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : tipos.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">Nenhum tipo personalizado cadastrado ainda.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {tipos.map((tipo, idx) => (
                      <div key={tipo.id || idx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                            <Clock className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{tipo.label}</p>
                            <p className="text-xs text-gray-500">{tipo.duracao_minutos || 0} minutos</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0"
                          onClick={(e) => { e.preventDefault(); removeTipo(idx); }}
                          disabled={deleteTipoMutation.isPending}
                        >
                          {deleteTipoMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-red-500" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end p-5 border-t shrink-0">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}