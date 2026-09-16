import React, { useState, useEffect } from 'react';
import { useEvaluationPermissions } from '../hooks/useEvaluationPermissions';
import { Label } from '../ui/label';
import Combobox from '../ui/combobox';
import { AlertCircle } from 'lucide-react';

export default function EvaluationGate({
  employees,
  selectedEmployee,
  onSelectEmployee,
  // Sprint 4: tipo de avaliação controlado pela página — usado na submissão,
  // eliminando a inferência frágil por comparação de IDs
  evaluationType,
  onEvaluationTypeChange,
}) {
  const { isLeader, currentUserEmployee } = useEvaluationPermissions();
  const [internalType, setInternalType] = useState("");
  const safeEmployees = Array.isArray(employees) ? employees : [];
  const type = evaluationType ?? internalType;
  const setType = onEvaluationTypeChange ?? setInternalType;

  useEffect(() => {
    if (safeEmployees.length === 1 && !isLeader) {
      if (!selectedEmployee) {
        onSelectEmployee(safeEmployees[0].id);
      }
      setType("self");
    }
  }, [safeEmployees, isLeader, selectedEmployee]);

  // "Eu mesmo" só é oferecido quando existe um Employee vinculado ao usuário.
  // Sem ele não há employee_id para submeter — era a causa do "seleciono e nada
  // acontece" (o onSelectEmployee nunca era chamado para admins/internos).
  const typeOptions = [
    ...(currentUserEmployee ? [{ value: 'self', label: 'Autoavaliação (Eu mesmo)' }] : []),
    { value: 'manager', label: 'Avaliação de Colaborador (Gestor)' },
  ];

  const handleTypeChange = (val) => {
    const nextType = val || 'manager';
    setType(nextType);
    if (nextType === 'self' && currentUserEmployee) {
      onSelectEmployee(currentUserEmployee.id);
    } else {
      onSelectEmployee('');
    }
  };

  return (
    <div className="space-y-4">
      {isLeader && (
        <div>
          <Label>Tipo de Avaliação</Label>
          <Combobox
            options={typeOptions}
            value={type}
            onChange={handleTypeChange}
            getOptionLabel={(o) => o.label}
            getOptionValue={(o) => o.value}
            placeholder="Selecione o tipo..."
            searchPlaceholder="Buscar tipo de avaliação..."
            emptyText="Nenhum tipo encontrado."
            className="mt-1"
          />
          {!currentUserEmployee && (
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Autoavaliação indisponível: não há perfil de colaborador vinculado à sua conta.
            </p>
          )}
        </div>
      )}

      {(!isLeader || type === 'manager') && (
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