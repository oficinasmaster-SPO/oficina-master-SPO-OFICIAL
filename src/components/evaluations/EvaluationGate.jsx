import React, { useState, useEffect } from 'react';
import { useEvaluationPermissions } from '../hooks/useEvaluationPermissions';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function EvaluationGate({ selectedEmployee, onSelectEmployee }) {
  const { evaluableEmployees, isLeader, currentUserEmployee, loading } = useEvaluationPermissions();
  const [evaluationType, setEvaluationType] = useState("");
  
  useEffect(() => {
    if (!loading && evaluableEmployees.length === 1 && !isLeader) {
      if (!selectedEmployee) {
        onSelectEmployee(evaluableEmployees[0].id);
      }
      setEvaluationType("self");
    }
  }, [loading, evaluableEmployees, isLeader, selectedEmployee]);
  
  if (loading) return <div className="flex items-center gap-2 text-gray-500 py-4"><Loader2 className="w-4 h-4 animate-spin"/> Carregando permissões...</div>;
  
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
          <Select 
            value={selectedEmployee} 
            onValueChange={onSelectEmployee}
            disabled={!isLeader && evaluableEmployees.length <= 1}
          >
            <SelectTrigger>
              <SelectValue placeholder="Escolha um colaborador..." />
            </SelectTrigger>
            <SelectContent>
              {evaluableEmployees.length === 0 ? (
                <SelectItem value="none" disabled>
                  Nenhum colaborador disponível
                </SelectItem>
              ) : (
                evaluableEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name} - {emp.position}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
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