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

import { Popover, PopoverContent } from "@/components/ui/popover";

export default function Combobox({
  options = [],
  value,
  onChange,
  placeholder = "Pesquisar...",
  emptyText = "Nenhum resultado encontrado.",
  className,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const selected = useMemo(
    () => options.find((item) => item.value === value),
    [options, value]
  );

  useEffect(() => {
    if (!open) {
      setSearch(selected?.label ?? "");
    }
  }, [selected, open]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...options]
      .sort((a, b) =>
        a.label.localeCompare(b.label, "pt-BR", {
          sensitivity: "base",
        })
      )
      .filter((item) =>
        item.label.toLowerCase().includes(query)
      );
  }, [options, search]);

  function handleChange(e) {
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

    requestAnimationFrame(() => {
      inputRef.current?.blur();
    });
  }

  return (
    <Popover open={open}>
      <div ref={wrapperRef} className="relative w-full">

        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />

        <input
          ref={inputRef}
          value={search}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={handleChange}
          className={cn(
            "w-full h-10 rounded-md border border-input bg-background",
            "pl-9 pr-10 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-ring",
            className
          )}
        />

        <button
          type="button"
          onClick={() => {
            setOpen((o) => !o);

            if (!open) {
              requestAnimationFrame(() => {
                inputRef.current?.focus();
              });
            }
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-muted"
        >
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
        </button>

        <PopoverContent
          align="start"
          sideOffset={4}
          className="w-full p-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command shouldFilter={false}>
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>

              <CommandGroup>
                {filteredOptions.map((option) => {
                  const match = option.label.match(/\(([^)]+)\)/);

                  return (
                    <CommandItem
                      key={option.value}
                      value={option.label}
                      onSelect={() => handleSelect(option)}
                      className="flex justify-between"
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

                        <span>
                          {option.label.replace(/\s*\([^)]*\)\s*$/, "")}
                        </span>
                      </div>

                      {match && (
                        <span className="text-xs text-muted-foreground">
                          {match[1]}
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>

      </div>
    </Popover>
  );
}