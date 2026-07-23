import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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

  const selected = useMemo(
    () => options.find((item) => item.value === value),
    [options, value]
  );

  useEffect(() => {
    if (selected && !open) {
      setSearch(selected.label);
    }

    if (!selected && !open) {
      setSearch("");
    }
  }, [selected, open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [open]);

  const filteredOptions = useMemo(() => {
    const ordered = [...options].sort((a, b) =>
      a.label.localeCompare(b.label, "pt-BR", {
        sensitivity: "base",
      })
    );

    if (!search.trim()) return ordered;

    return ordered.filter((item) =>
      item.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search]);

  function handleInputChange(e) {
    const text = e.target.value;

    setSearch(text);

    if (!open) {
      setOpen(true);
    }

    if (!text) {
      onChange("");
    }
  }

  function handleSelect(option) {
    onChange(option.value);
    setSearch(option.label);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />

          <input
            ref={inputRef}
            value={search}
            placeholder={placeholder || searchPlaceholder}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onChange={handleInputChange}
            className={cn(
              "w-full h-10 rounded-md border border-input bg-background",
              "pl-9 pr-10 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-ring",
              "placeholder:text-muted-foreground",
              className
            )}
          />

          <button
            type="button"
            tabIndex={-1}
            onClick={() => setOpen((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-muted"
          >
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>

            <CommandGroup>
              {filteredOptions.map((option) => {
                const match = option.label.match(/\(([^)]+)\)/);

                const secondary = match?.[1];

                const label = option.label.replace(
                  /\s*\([^)]*\)\s*$/,
                  ""
                );

                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => handleSelect(option)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Check
                        className={cn(
                          "h-4 w-4",
                          option.value === value
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />

                      <span>{label}</span>
                    </div>

                    {secondary && (
                      <span className="text-xs text-muted-foreground">
                        {secondary}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}