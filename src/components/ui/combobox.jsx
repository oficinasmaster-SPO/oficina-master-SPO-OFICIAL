import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Command as CommandPrimitive } from "cmdk";

import { cn } from "@/lib/utils";

export default function Combobox({
  options = [],
  value,
  onChange,
  placeholder = "Pesquisar...",
  searchPlaceholder,
  emptyText = "Nenhum resultado encontrado.",
  className,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selected = useMemo(
    () => options.find((item) => item.value === value),
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    const sorted = [...options].sort((a, b) =>
      a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }),
    );
    if (!query) return sorted;
    return sorted.filter((item) => item.label.toLowerCase().includes(query));
  }, [options, search]);

  const openDropdown = useCallback(() => {
    setOpen(true);
    setSearch("");
  }, []);

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setSearch("");
  }, []);

  useEffect(() => {
    function onPointerDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        closeDropdown();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [closeDropdown]);

  function handleInputChange(e) {
    setSearch(e.target.value);
    if (!open) setOpen(true);
  }

  function handleSelect(option) {
    onChange(option.value === value ? "" : option.value);
    closeDropdown();
    inputRef.current?.blur();
  }

  function handleClear(e) {
    e.stopPropagation();
    onChange("");
    closeDropdown();
    inputRef.current?.blur();
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      closeDropdown();
      inputRef.current?.blur();
    }
    if (e.key === "ArrowDown" && !open) {
      openDropdown();
    }
  }

  const displayValue = open ? search : (selected?.label ?? "");

  return (
    <div ref={containerRef} className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />

      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        value={displayValue}
        placeholder={searchPlaceholder || placeholder}
        onFocus={openDropdown}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full h-10 rounded-md border border-input bg-background",
          "pl-9 pr-16 text-sm",
          "focus:outline-none focus:ring-2 focus:ring-ring",
          "placeholder:text-muted-foreground",
          className,
        )}
      />

      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
        {selected && !open && (
          <button
            type="button"
            tabIndex={-1}
            onClick={handleClear}
            className="rounded p-1 hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            if (open) {
              closeDropdown();
            } else {
              openDropdown();
              requestAnimationFrame(() => inputRef.current?.focus());
            }
          }}
          className="rounded p-1 hover:bg-muted transition-colors"
        >
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {open && (
        <div
          className={cn(
            "absolute z-[150] mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2",
          )}
        >
          <CommandPrimitive shouldFilter={false} loop>
            <CommandPrimitive.List className="max-h-[250px] overflow-y-auto overflow-x-hidden p-1">
              <CommandPrimitive.Empty className="py-6 text-center text-sm text-muted-foreground">
                {emptyText}
              </CommandPrimitive.Empty>

              {filteredOptions.map((option) => {
                const match = option.label.match(/\(([^)]+)\)/);
                const isSelected = option.value === value;

                return (
                  <CommandPrimitive.Item
                    key={option.value}
                    value={option.label}
                    onSelect={() => handleSelect(option)}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center justify-between",
                      "rounded-sm px-2 py-1.5 text-sm outline-none",
                      "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {option.label.replace(/\s*\([^)]*\)\s*$/, "")}
                    </span>

                    {match && (
                      <span className="text-xs text-muted-foreground">
                        {match[1]}
                      </span>
                    )}
                  </CommandPrimitive.Item>
                );
              })}
            </CommandPrimitive.List>
          </CommandPrimitive>
        </div>
      )}
    </div>
  );
}
