import React, { useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Package } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProcessSearchSelect({ processos, selectedIds, onAdd }) {
  const [open, setOpen] = useState(false);

  const availableProcessos = processos?.filter(p => !selectedIds.includes(p.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between"
        >
          <span className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Buscar processo por nome ou ID...
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0">
        <Command>
          <CommandInput placeholder="Digite nome do processo ou ID..." />
          <CommandEmpty>Nenhum processo encontrado.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {availableProcessos?.map((processo) => (
              <CommandItem
                key={processo.id}
                value={`${processo.title} ${processo.category} ${processo.id}`}
                onSelect={() => {
                  onAdd(processo.id);
                  setOpen(false);
                }}
              >
                <div className="flex flex-col flex-1">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">{processo.title}</span>
                  </div>
                  <span className="text-xs text-gray-500 ml-6">
                    {processo.category} • ID: {processo.id.substring(0, 8)}
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