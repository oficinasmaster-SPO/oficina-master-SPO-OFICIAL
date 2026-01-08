import React, { useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export default function WorkshopSearchSelect({ workshops, value, onValueChange, disabled }) {
  const [open, setOpen] = useState(false);
  
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
          <CommandGroup className="max-h-64 overflow-auto">
            {workshops?.map((workshop) => (
              <CommandItem
                key={workshop.id}
                value={`${workshop.name} ${workshop.city} ${workshop.state} ${workshop.cnpj || ''}`}
                onSelect={() => {
                  onValueChange(workshop.id);
                  setOpen(false);
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
                  <span className="text-xs text-gray-500">
                    {workshop.city}/{workshop.state} • {workshop.planoAtual}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}