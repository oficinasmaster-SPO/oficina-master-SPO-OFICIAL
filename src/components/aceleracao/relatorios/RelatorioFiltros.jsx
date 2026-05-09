import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, X } from 'lucide-react';

export default function RelatorioFiltros({ filters, onChange, onPageChange }) {
  const [consultores, setConsultores] = useState([]);

  // Buscar consultores
  useEffect(() => {
    const fetchConsultores = async () => {
      try {
        const users = await base44.entities.User.filter({ role: 'admin' }, '-full_name', 50);
        setConsultores(users || []);
      } catch (error) {
        console.error('Erro ao buscar consultores:', error);
      }
    };
    fetchConsultores();
  }, []);

  const handleFilterChange = (key, value) => {
    onChange({ ...filters, [key]: value });
    onPageChange();
  };

  const handleReset = () => {
    onChange({
      periodo: filters.periodo,
      consultor: null,
      tipo: null,
      status: 'realizado'
    });
    onPageChange();
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
      <div className="flex items-center gap-4 mb-4">
        <Filter className="w-5 h-5 text-gray-600" />
        <h3 className="font-semibold text-gray-900">Filtros</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Período */}
        <Select value={filters.periodo} onValueChange={(value) => handleFilterChange('periodo', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="diario">Diário</SelectItem>
            <SelectItem value="semanal">Semanal</SelectItem>
            <SelectItem value="mensal">Mensal</SelectItem>
          </SelectContent>
        </Select>

        {/* Consultor */}
        <Select value={filters.consultor || ''} onValueChange={(value) => handleFilterChange('consultor', value || null)}>
          <SelectTrigger>
            <SelectValue placeholder="Consultor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>Todos os consultores</SelectItem>
            {consultores.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tipo */}
        <Select value={filters.tipo || ''} onValueChange={(value) => handleFilterChange('tipo', value || null)}>
          <SelectTrigger>
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>Todos os tipos</SelectItem>
            <SelectItem value="tarefa">Tarefa</SelectItem>
            <SelectItem value="followup">Follow-up</SelectItem>
            <SelectItem value="backlog">Backlog</SelectItem>
            <SelectItem value="pedido">Pedido</SelectItem>
            <SelectItem value="sprint">Sprint</SelectItem>
          </SelectContent>
        </Select>

        {/* Status */}
        <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="realizado">Realizado</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Botão Reset */}
      <div className="mt-4 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Limpar filtros
        </Button>
      </div>
    </div>
  );
}