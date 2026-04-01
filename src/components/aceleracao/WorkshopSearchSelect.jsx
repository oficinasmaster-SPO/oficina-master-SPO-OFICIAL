import React, { useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function WorkshopSearchSelect({ workshops, value, onValueChange, disabled }) {
  const [open, setOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  
  const selectedWorkshop = workshops?.find(w => w.id === value);

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
        <Command>
          <CommandInput placeholder="Buscar oficina..." />
          <CommandEmpty>Nenhuma oficina encontrada.</CommandEmpty>
          <div className="max-h-64 overflow-auto border-b">
            <CommandGroup>
              {workshops?.map((workshop) => (
                <CommandItem
                  key={workshop.id}
                  value={`${workshop.name} ${workshop.city} ${workshop.state} ${workshop.cnpj || ''}`}
                  onSelect={() => {
                    onValueChange(workshop.id);
                    setOpen(false);
                  }}
                  onMouseEnter={() => setHoveredId(workshop.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    backgroundColor: hoveredId === workshop.id ? '#dc2626' : 'transparent',
                    color: hoveredId === workshop.id ? 'white' : 'black',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === workshop.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{workshop.name}</span>
                    <span className="text-xs" style={{color: hoveredId === workshop.id ? 'rgba(255,255,255,0.7)' : '#9ca3af'}}>
                      {workshop.city}/{workshop.state} • {workshop.planoAtual}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
          <div className="px-2 py-1.5 text-xs text-gray-500 bg-gray-50">Todas Oficinas</div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}