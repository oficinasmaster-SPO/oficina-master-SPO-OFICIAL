import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function FrequenciaSelector({ value, onChange, disabled = false }) {
  return (
    <div>
      <Label>Frequência do Lançamento</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="mt-1">
          <SelectValue placeholder="Selecione a frequência" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unico">Único (uma vez)</SelectItem>
          <SelectItem value="mensal">Mensal</SelectItem>
          <SelectItem value="quinzenal">Quinzenal</SelectItem>
          <SelectItem value="semanal">Semana</SelectItem>
          <SelectItem value="anual">Anual</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-xs text-gray-500 mt-1">
        {value === 'unico' && 'Lançamento único, sem repetição'}
        {value === 'mensal' && 'Repete todo mês na mesma data'}
        {value === 'quinzenal' && 'Repete a cada 15 dias'}
        {value === 'semanal' && 'Repete toda semana'}
        {value === 'anual' && 'Repete uma vez por ano'}
      </p>
    </div>
  );
}