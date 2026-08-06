import React, { useState, useEffect } from 'react';
import { useEvaluationPermissions } from '../hooks/useEvaluationPermissions';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import Combobox from '../ui/combobox';
import { AlertCircle } from 'lucide-react';

export default function EvaluationGate({ employees, selectedEmployee, onSelectEmployee }) {
  const { isLeader, currentUserEmployee } = useEvaluationPermissions();
  const [evaluationType, setEvaluationType] = useState("");
  const safeEmployees = Array.isArray(employees) ? employees : [];
  
  useEffect(() => {
    if (safeEmployees.length === 1 && !isLeader) {
      if (!selectedEmployee) {
        onSelectEmployee(safeEmployees[0].id);
      }
      setEvaluationType("self");
    }
  }, [safeEmployees, isLeader, selectedEmployee]);
  
  return (
    <div className="space-y-4">
      {isLeader && (
        <div>
          <Label>Tipo de Avaliação</Label>
          <Select value={evaluationType} onValueChange={(val) => {
              setEvaluationType(val);
              if (val === "self" && currentUserEmployee) {
                  onSelectEmployee(currentUserEmployee.id);
              } else {
                  onSelectEmployee("");
              }
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="self">Autoavaliação (Eu mesmo)</SelectItem>
              <SelectItem value="manager">Avaliação de Colaborador (Gestor)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      
      {(!isLeader || evaluationType === 'manager') && (
        <div>
          <Label>Quem será avaliado?</Label>
          <Combobox
            options={safeEmployees}
            value={selectedEmployee}
            onChange={onSelectEmployee}
            getOptionValue={(emp) => emp.id}
            getOptionLabel={(emp) => `${emp.full_name} - ${emp.position}`}
            placeholder="Escolha um colaborador..."
            searchPlaceholder="Buscar colaborador..."
            emptyText="Nenhum colaborador encontrado."
            className={(!isLeader && safeEmployees.length <= 1) ? 'pointer-events-none opacity-60' : ''}
          />
          {!isLeader && (
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Você só tem permissão para realizar autoavaliação.
            </p>
          )}
        </div>
      )}
    </div>
  );
}