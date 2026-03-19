import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";
import { format } from "date-fns";

export default function NextSteps({ steps = [], onChange, editable = true }) {
  const [descricao, setDescricao] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [prazo, setPrazo] = useState("");

  const handleAdd = () => {
    if (!descricao) return;
    onChange([...steps, { descricao, responsavel, prazo }]);
    setDescricao("");
    setResponsavel("");
    setPrazo("");
  };

  const handleDelete = (idOrIndex) => {
    onChange(steps.filter((_, i) => i !== idOrIndex));
  };

  return (
    <div className="space-y-4">
      {editable && (
        <div className="flex flex-col md:flex-row gap-3 items-end p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex-1 w-full">
            <Label className="text-xs mb-1">Descrição da Ação *</Label>
            <Input
              placeholder="O que deve ser feito..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <Label className="text-xs mb-1">Responsável</Label>
            <Input
              placeholder="Quem fará..."
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
            />
          </div>
          <div className="w-full md:w-40">
            <Label className="text-xs mb-1">Prazo</Label>
            <Input
              type="date"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
            />
          </div>
          <Button type="button" onClick={handleAdd} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={index} className="p-3 bg-white rounded-lg border border-gray-200 flex justify-between items-start shadow-sm">
            <div>
              <strong className="text-sm font-semibold text-gray-900">• {step.descricao}</strong>
              <div className="text-xs text-gray-600 mt-1.5 flex items-center gap-2">
                <span>Responsável: <span className="font-medium text-gray-800">{step.responsavel || "Não definido"}</span></span>
                <span className="text-gray-300">|</span>
                <span>Prazo: <span className="font-medium text-gray-800">{step.prazo ? format(new Date(step.prazo), 'dd/MM/yyyy') : "Não definido"}</span></span>
              </div>
            </div>
            {editable && (
              <Button type="button" variant="ghost" size="icon" onClick={() => handleDelete(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
        {steps.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4 border-2 border-dashed rounded-lg">
            Nenhum próximo passo definido.
          </p>
        )}
      </div>
    </div>
  );
}