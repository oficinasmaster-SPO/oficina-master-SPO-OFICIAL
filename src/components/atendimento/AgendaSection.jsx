import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

export default function AgendaSection({ formData, setFormData, pautaRef }) {
  const addPauta = () => {
    setFormData(prev => ({
      ...prev,
      pauta: [...prev.pauta, { titulo: "", descricao: "", tempo_estimado: 15 }]
    }));
  };

  const removePauta = (index) => {
    setFormData(prev => ({
      ...prev,
      pauta: prev.pauta.filter((_, i) => i !== index)
    }));
  };

  const updatePauta = (index, field, value) => {
    setFormData(prev => {
      const newP = [...prev.pauta];
      newP[index] = { ...newP[index], [field]: field === 'tempo_estimado' ? parseInt(value, 10) : value };
      return { ...prev, pauta: newP };
    });
  };

  const addObjetivo = () => {
    setFormData(prev => ({ ...prev, objetivos: [...prev.objetivos, ""] }));
  };

  return (
    <>
      {/* Pauta */}
      <Card ref={pautaRef}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pauta da Reunião</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addPauta}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Tópico
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.pauta.map((p, idx) => (
            <div key={idx} className="space-y-2 border-b pb-4">
              <div className="flex gap-3 items-start">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Título do tópico"
                    value={p.titulo}
                    onChange={(e) => updatePauta(idx, 'titulo', e.target.value)}
                  />
                  <Textarea
                    placeholder="Descrição"
                    value={p.descricao}
                    onChange={(e) => updatePauta(idx, 'descricao', e.target.value)}
                    rows={2}
                  />
                </div>
                <Input
                  type="number"
                  placeholder="Tempo (min)"
                  className="w-24"
                  value={p.tempo_estimado}
                  onChange={(e) => updatePauta(idx, 'tempo_estimado', e.target.value)}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => removePauta(idx)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Objetivos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Objetivos do Atendimento</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addObjetivo}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {formData.objetivos.map((obj, idx) => (
            <Input
              key={idx}
              placeholder={`Objetivo ${idx + 1}`}
              value={obj}
              onChange={(e) => {
                setFormData(prev => {
                  const newObj = [...prev.objetivos];
                  newObj[idx] = e.target.value;
                  return { ...prev, objetivos: newObj };
                });
              }}
            />
          ))}
        </CardContent>
      </Card>
    </>
  );
}