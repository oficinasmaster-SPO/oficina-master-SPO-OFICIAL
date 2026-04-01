import React, { useState } from "react";
import { CommandInput } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function WorkshopSearchSelect({ workshops, value, onValueChange, disabled }) {
  const [open, setOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const selectedWorkshop = workshops?.find(w => w.id === value);
  
  const filtered = workshops?.filter(w => 
    `${w.name} ${w.city} ${w.state} ${w.cnpj || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className="truncate">
            {selectedWorkshop 
              ? `${selectedWorkshop.name} - ${selectedWorkshop.city}/${selectedWorkshop.state}`
              : "Selecione a oficina..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0">
        <div className="border-b">
          <CommandInput 
            placeholder="Pesquisar oficina..." 
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
        </div>
        
        <div className="border-b px-3 py-2 text-xs text-gray-600 bg-gray-50 font-medium">
          Todas Oficinas
        </div>

        <div className="max-h-64 overflow-y-auto pr-2" style={{ scrollbarGutter: 'stable' }}>
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-gray-500">
              Nenhuma oficina encontrada
            </div>
          ) : (
            filtered.map((workshop) => (
              <div
                key={workshop.id}
                onClick={() => {
                  onValueChange(workshop.id);
                  setOpen(false);
                  setSearchTerm("");
                }}
                onMouseEnter={() => setHoveredId(workshop.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  backgroundColor: hoveredId === workshop.id ? '#dc2626' : 'transparent',
                  color: hoveredId === workshop.id ? 'white' : 'black',
                  cursor: 'pointer',
                  padding: '8px 12px',
                  transition: 'background-color 0.15s ease-out'
                }}
              >
                <div className="flex items-start gap-2">
                  <Check
                    className={cn(
                      "h-4 w-4 mt-0.5 flex-shrink-0",
                      value === workshop.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium text-sm">{workshop.name}</span>
                    <span className="text-xs" style={{opacity: hoveredId === workshop.id ? 0.7 : 1, color: hoveredId === workshop.id ? 'white' : '#9ca3af'}}>
                      {workshop.city}/{workshop.state} • {workshop.planoAtual}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}