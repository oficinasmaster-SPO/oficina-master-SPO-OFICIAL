import React, { useState, useEffect } from 'react';
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

export default function Filtros({ filters, onChange }) {
  // Buscar consultores
  const { data: consultores = [] } = useQuery({
    queryKey: ['consultoresRelatorio'],
    queryFn: async () => {
      try {
        // Buscar usuários com role admin/consultor
        const users = await base44.entities.User.filter({
          role: 'admin'
        }, '-created_date', 100);
        return users || [];
      } catch (error) {
        console.error('Erro ao buscar consultores:', error);
        return [];
      }
    }
  });

  const handleClearFilters = () => {
    onChange({ consultor: null, tipo: null, status: 'realizado' });
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Consultor */}
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-2">Consultor</label>
          <Select value={filters.consultor || ''} onValueChange={(val) => 
            onChange({ ...filters, consultor: val || null })
          }>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Todos os consultores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Todos</SelectItem>
              {consultores.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tipo de Contato */}
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-2">Canal</label>
          <Select value={filters.tipo || ''} onValueChange={(val) => 
            onChange({ ...filters, tipo: val || null })
          }>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Todos os canais" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Todos</SelectItem>
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
          <Select value={filters.status} onValueChange={(val) => 
            onChange({ ...filters, status: val })
          }>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="realizado">Realizados</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Botão Limpar */}
      {(filters.consultor || filters.tipo) && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleClearFilters}
          className="w-full"
        >
          <X className="w-4 h-4 mr-2" />
          Limpar Filtros
        </Button>
      )}
    </div>
  );
}