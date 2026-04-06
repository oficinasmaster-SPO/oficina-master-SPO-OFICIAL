import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

export default function ParticipantsCard({ formData, setFormData, colaboradores, colaboradoresInternos }) {
  const addParticipante = () => {
    setFormData({
      ...formData,
      participantes: [...formData.participantes, { nome: '', cargo: '', email: '' }]
    });
  };

  const removeParticipante = (index) => {
    const newParticipantes = formData.participantes.filter((_, i) => i !== index);
    setFormData({ ...formData, participantes: newParticipantes });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Participantes</CardTitle>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addParticipante}>
              <Plus className="w-4 h-4 mr-2" />
              Manual
            </Button>
            {colaboradores && colaboradores.length > 0 && (
              <Select onValueChange={(value) => {
                const colab = colaboradores.find(c => c.id === value);
                if (colab) {
                  setFormData({
                    ...formData,
                    participantes: [...formData.participantes, {
                      nome: colab.full_name,
                      cargo: colab.position,
                      email: colab.email
                    }]
                  });
                }
              }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Da oficina" />
                </SelectTrigger>
                <SelectContent>
                  {colaboradores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name} - {c.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {colaboradoresInternos && colaboradoresInternos.length > 0 && (
              <Select onValueChange={(value) => {
                const colab = colaboradoresInternos.find(c => c.id === value);
                if (colab) {
                  setFormData({
                    ...formData,
                    participantes: [...formData.participantes, {
                      nome: colab.full_name,
                      cargo: colab.position + ' (Interno)',
                      email: colab.email
                    }]
                  });
                }
              }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Interno" />
                </SelectTrigger>
                <SelectContent>
                  {colaboradoresInternos.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name} - {c.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {formData.participantes.map((p, idx) => (
          <div key={idx} className="flex gap-3 items-start">
            <div className="flex-1 grid grid-cols-3 gap-3">
              <Input
                placeholder="Nome"
                value={p.nome}
                onChange={(e) => {
                  const newP = [...formData.participantes];
                  newP[idx].nome = e.target.value;
                  setFormData({ ...formData, participantes: newP });
                }}
              />
              <Input
                placeholder="Cargo"
                value={p.cargo}
                onChange={(e) => {
                  const newP = [...formData.participantes];
                  newP[idx].cargo = e.target.value;
                  setFormData({ ...formData, participantes: newP });
                }}
              />
              <Input
                placeholder="Email"
                type="email"
                value={p.email}
                onChange={(e) => {
                  const newP = [...formData.participantes];
                  newP[idx].email = e.target.value;
                  setFormData({ ...formData, participantes: newP });
                }}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeParticipante(idx)}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}