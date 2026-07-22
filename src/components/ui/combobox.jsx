import React, { useState, useRef, useEffect, useMemo } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function Combobox({
  options = [],
  value,
  onChange,
  placeholder = "Selecione...",
  searchPlaceholder = "Pesquisar...",
  emptyText = "Nenhum resultado encontrado.",
  className,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef(null);
  const selected = options.find((o) => o.value === value);

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...options].sort((a, b) =>
      a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" })
    );
    if (!q) return sorted;
    return sorted.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
    if (!open) {
      setSearch("");
    }
  }, [open]);

  const displayText = selected ? selected.label : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
          <input
            ref={inputRef}
            type="text"
            value={open ? search : displayText}
            placeholder={selected ? "" : searchPlaceholder}
            onFocus={() => setOpen(true)}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "w-full h-10 pl-9 pr-9 rounded-md border border-input bg-background text-sm",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0",
              "placeholder:text-muted-foreground cursor-pointer",
              !selected && !open && "text-muted-foreground",
              className
            )}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setOpen(!open)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-sm transition-colors"
          >
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </button>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value === value ? "" : option.value);
                    setOpen(false);
                  }}
                  className="border-b border-border/40 justify-between [&:last-child]:border-b-0"
                >
                  <span className="flex items-center gap-2">
                    <Check
                      className={cn("h-4 w-4", option.value === value ? "opacity-100" : "opacity-0")}
                    />
                    {option.label.replace(/\s*\([^)]*\)\s*$/, "")}
                  </span>
                  {(option.label.match(/\(([^)]+)\)/) || [])[1] && (
                    <span className="text-xs text-muted-foreground font-normal">
                      {(option.label.match(/\(([^)]+)\)/))[1]}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}