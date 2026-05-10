import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

// Bug #4 fix: SelectItem não aceita value={null} — usar string vazia como sentinela
export default function Filtros({ filters, onChange }) {
  const { data: consultores = [] } = useQuery({
    queryKey: ['consultoresRelatorio'],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ role: 'admin' }, '-created_date', 50);
      return (Array.isArray(users) ? users : []).filter(u => u.full_name && u.id);
    },
    staleTime: 10 * 60 * 1000
  });

  const hasActiveFilters = filters.consultor || filters.canal || (filters.status && filters.status !== 'todos');

  const handleClearFilters = () => {
    onChange({ consultor: null, canal: null, status: 'todos' });
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Consultor */}
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-2">Consultor</label>
          <Select
            value={filters.consultor || '__todos__'}
            onValueChange={(val) => onChange({ ...filters, consultor: val === '__todos__' ? null : val })}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Todos os consultores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__todos__">Todos os consultores</SelectItem>
              {consultores.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Canal */}
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-2">Canal</label>
          <Select
            value={filters.canal || '__todos__'}
            onValueChange={(val) => onChange({ ...filters, canal: val === '__todos__' ? null : val })}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Todos os canais" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__todos__">Todos os canais</SelectItem>
              <SelectItem value="ligacao">Ligação</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="video">Vídeo</SelectItem>
              <SelectItem value="presencial">Presencial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-2">Status</label>
          <Select
            value={filters.status || 'todos'}
            onValueChange={(val) => onChange({ ...filters, status: val })}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="realizado">✓ Realizados</SelectItem>
              <SelectItem value="pendente">⏳ Pendentes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasActiveFilters && (
        <Button variant="outline" size="sm" onClick={handleClearFilters} className="w-full">
          <X className="w-4 h-4 mr-2" />
          Limpar Filtros
        </Button>
      )}
    </div>
  );
}