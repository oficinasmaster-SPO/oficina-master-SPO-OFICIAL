import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

export default function ParticipantsSection({ formData, setFormData, colaboradores, colaboradoresInternos }) {
  const addParticipante = () => {
    setFormData(prev => ({
      ...prev,
      participantes: [...prev.participantes, { nome: "", cargo: "", email: "" }]
    }));
  };

  const removeParticipante = (index) => {
    setFormData(prev => ({
      ...prev,
      participantes: prev.participantes.filter((_, i) => i !== index)
    }));
  };

  const updateParticipante = (index, field, value) => {
    setFormData(prev => {
      const newP = [...prev.participantes];
      newP[index] = { ...newP[index], [field]: value };
      return { ...prev, participantes: newP };
    });
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
                  setFormData(prev => ({
                    ...prev,
                    participantes: [...prev.participantes, {
                      nome: colab.full_name,
                      cargo: colab.position,
                      email: colab.email
                    }]
                  }));
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
                  setFormData(prev => ({
                    ...prev,
                    participantes: [...prev.participantes, {
                      nome: colab.full_name,
                      cargo: "Consultor (Interno)",
                      email: ""
                    }]
                  }));
                }
              }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Interno" />
                </SelectTrigger>
                <SelectContent>
                  {colaboradoresInternos.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name}
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
                onChange={(e) => updateParticipante(idx, 'nome', e.target.value)}
              />
              <Input
                placeholder="Cargo"
                value={p.cargo}
                onChange={(e) => updateParticipante(idx, 'cargo', e.target.value)}
              />
              <Input
                placeholder="Email"
                type="email"
                value={p.email}
                onChange={(e) => updateParticipante(idx, 'email', e.target.value)}
              />
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => removeParticipante(idx)}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}