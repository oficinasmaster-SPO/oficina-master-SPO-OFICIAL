import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const TIPOS_PADRAO = [
  { value: "diagnostico_inicial", label: "Diagnóstico Inicial" },
  { value: "acompanhamento_mensal", label: "Acompanhamento Mensal" },
  { value: "reuniao_estrategica", label: "Reunião Estratégica" },
  { value: "treinamento", label: "Treinamento" },
  { value: "auditoria", label: "Auditoria" },
  { value: "revisao_metas", label: "Revisão de Metas" },
  { value: "outros", label: "Outros" }
];

export default function TipoAtendimentoManager({ customTipos = [], onSave }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tipos, setTipos] = useState(customTipos);
  const [novoTipo, setNovoTipo] = useState("");
  const [duracaoHoras, setDuracaoHoras] = useState("");

  const addTipo = () => {
    if (!novoTipo.trim()) {
      toast.error("Digite um nome para o tipo");
      return;
    }

    if (!duracaoHoras || parseFloat(duracaoHoras) <= 0) {
      toast.error("Digite uma duração válida em horas");
      return;
    }

    const value = novoTipo.toLowerCase().replace(/\s+/g, '_');
    const exists = [...TIPOS_PADRAO, ...tipos].some(t => t.value === value);
    
    if (exists) {
      toast.error("Tipo já existe");
      return;
    }

    const duracaoMinutos = Math.round(parseFloat(duracaoHoras) * 60);
    setTipos([...tipos, { value, label: novoTipo.trim(), duracao_minutos: duracaoMinutos }]);
    setNovoTipo("");
    setDuracaoHoras("");
    toast.success("Tipo adicionado!");
  };

  const removeTipo = (index) => {
    setTipos(tipos.filter((_, i) => i !== index));
    toast.success("Tipo removido!");
  };

  const handleSave = () => {
    onSave(tipos);
    setIsOpen(false);
    toast.success("Tipos de atendimento salvos!");
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="w-4 h-4 mr-2" />
        Gerenciar Tipos
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Tipos de Atendimento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Tipos Padrão</Label>
              <div className="mt-2 space-y-1 text-sm text-gray-600">
                {TIPOS_PADRAO.map(tipo => (
                  <div key={tipo.value}>• {tipo.label}</div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <Label>Tipos Personalizados</Label>
              <div className="mt-2 space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome do novo tipo..."
                    value={novoTipo}
                    onChange={(e) => setNovoTipo(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTipo()}
                  />
                  <Button size="sm" onClick={addTipo}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {tipos.length > 0 && (
                  <div className="space-y-2">
                    {tipos.map((tipo, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 rounded border">
                        <span className="text-sm">{tipo.label}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeTipo(idx)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}