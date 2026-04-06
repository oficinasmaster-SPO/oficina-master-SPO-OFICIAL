import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

export default function MeetingAgendaCard({ formData, setFormData, pautaRef }) {
  const addPauta = () => {
    setFormData({
      ...formData,
      pauta: [...formData.pauta, { titulo: '', descricao: '', tempo_estimado: 15 }]
    });
  };

  const removePauta = (index) => {
    const newPauta = formData.pauta.filter((_, i) => i !== index);
    setFormData({ ...formData, pauta: newPauta });
  };

  return (
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
                  onChange={(e) => {
                    const newP = [...formData.pauta];
                    newP[idx].titulo = e.target.value;
                    setFormData({ ...formData, pauta: newP });
                  }}
                />
                <Textarea
                  placeholder="Descrição"
                  value={p.descricao}
                  onChange={(e) => {
                    const newP = [...formData.pauta];
                    newP[idx].descricao = e.target.value;
                    setFormData({ ...formData, pauta: newP });
                  }}
                  rows={2}
                />
              </div>
              <Input
                type="number"
                placeholder="Tempo (min)"
                className="w-24"
                value={p.tempo_estimado}
                onChange={(e) => {
                  const newP = [...formData.pauta];
                  newP[idx].tempo_estimado = parseInt(e.target.value);
                  setFormData({ ...formData, pauta: newP });
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removePauta(idx)}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}