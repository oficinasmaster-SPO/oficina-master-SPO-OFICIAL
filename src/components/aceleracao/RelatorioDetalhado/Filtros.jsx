import React from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function Filtros({ filtros, onFiltrosChange }) {
  return (
    <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
      <p className="text-sm font-medium text-gray-700">Filtros Rápidos</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-600 block mb-1">Tipo</label>
          <Select
            value={filtros.tipo}
            onValueChange={(value) =>
              onFiltrosChange({ ...filtros, tipo: value })
            }
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Todos</SelectItem>
              <SelectItem value="tarefa">Tarefa</SelectItem>
              <SelectItem value="followup">Follow-up</SelectItem>
              <SelectItem value="backlog">Backlog</SelectItem>
              <SelectItem value="pedido">Pedido</SelectItem>
              <SelectItem value="sprint">Sprint</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-gray-600 block mb-1">Canal</label>
          <Select
            value={filtros.canal}
            onValueChange={(value) =>
              onFiltrosChange({ ...filtros, canal: value })
            }
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Todos" />
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

        <div>
          <label className="text-xs text-gray-600 block mb-1">Engajamento</label>
          <Select
            value={filtros.engajamento}
            onValueChange={(value) =>
              onFiltrosChange({ ...filtros, engajamento: value })
            }
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Todos</SelectItem>
              <SelectItem value="Alto">Alto</SelectItem>
              <SelectItem value="Médio">Médio</SelectItem>
              <SelectItem value="Baixo">Baixo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}