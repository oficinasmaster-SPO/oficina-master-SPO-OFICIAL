import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Command as CommandPrimitive } from "cmdk";

import { cn } from "@/lib/utils";

const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default function Combobox({
  options = [],
  value,
  onChange,
  placeholder = "Pesquisar...",
  searchPlaceholder,
  emptyText = "Nenhum resultado encontrado.",
  clearValue = "",
  className,
  
  // Data Extractors
  getOptionLabel = (option) => option.label,
  getOptionValue = (option) => option.value,
  
  // Custom Renderers & Filters
  renderOption,
  filterOption,
  
  // Layout & Comportamento
  lazyRender = false,
  maxHeight = 250, // Nova prop flexível (aceita Número ou String)
  autoSelectOnOpen = true, // true = seleciona todo o texto ao abrir (modo busca); false = só foca (modo seletor)
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const rafRef = useRef(null);
  const isComposing = useRef(false);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const optionMap = useMemo(() => {
    const map = new Map();
    options.forEach((opt) => map.set(getOptionValue(opt), opt));
    return map;
  }, [options, getOptionValue]);

  const selected = optionMap.get(value);

  useEffect(() => {
    if (import.meta.env?.DEV !== false && value != null && options.length > 0) {
        const sampleOptionValue = getOptionValue(options[0]);
        if (typeof value !== typeof sampleOptionValue) {
          console.warn(
            `⚠️ Combobox: Incompatibilidade de tipos detectada.\n` +
            `A prop 'value' é do tipo '${typeof value}' (${value}), ` +
            `mas 'getOptionValue' retorna o tipo '${typeof sampleOptionValue}' (${sampleOptionValue}).\n` +
            `Eles devem ser estritamente iguais (===) para a seleção funcionar corretamente.`
          );
        }
    }
  }, [value, options, getOptionValue]);

  const sortedOptions = useMemo(() => {
    return [...options].sort((a, b) =>
      String(getOptionLabel(a)).localeCompare(String(getOptionLabel(b)), "pt-BR", {
        sensitivity: "base",
      })
    );
  }, [options, getOptionLabel]);

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sortedOptions;

    return sortedOptions.filter((item) => {
      if (filterOption) return filterOption(item, query);
      return String(getOptionLabel(item)).toLowerCase().includes(query);
    });
  }, [sortedOptions, search, filterOption, getOptionLabel]);

  const openDropdown = useCallback(() => {
    if (open) return;
    setOpen(true);
    setSearch(selected ? String(getOptionLabel(selected)) : "");

    rafRef.current = requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        if (autoSelectOnOpen) inputRef.current.select();
      }
    });
  }, [open, selected, getOptionLabel, autoSelectOnOpen]);

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setSearch("");
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        closeDropdown();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, closeDropdown]);

  function handleInputChange(val) {
    setSearch(val);
    if (!open && !isComposing.current) setOpen(true);
  }

  function handleSelect(option) {
    const optionValue = getOptionValue(option);
    onChange?.(optionValue === value ? clearValue : optionValue);
    closeDropdown();
    inputRef.current?.blur();
  }

  function handleClear(e) {
    e.stopPropagation();
    onChange?.(clearValue);
    closeDropdown();
    inputRef.current?.blur();
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      closeDropdown();
      inputRef.current?.blur();
    }
    if (e.key === "ArrowDown" && !open) {
      e.preventDefault();
      openDropdown();
    }
  }

  const selectedLabel = selected ? String(getOptionLabel(selected)) : "";
  const displayValue = open ? search : selectedLabel;
  const highlightQuery = open && search !== selectedLabel ? search.trim() : "";

  const renderDefaultOption = (option, query) => {
    const label = String(getOptionLabel(option));
    const match = label.match(/\(([^)]+)\)/);
    const name = label.replace(/\s*\([^)]*\)\s*$/, "");

    let highlightedName = <>{name}</>;
    if (query) {
      const regex = new RegExp(`(${escapeRegExp(query)})`, "gi");
      const parts = name.split(regex);
      highlightedName = (
        <>
          {parts.map((part, i) =>
            part.toLowerCase() === query.toLowerCase() ? (
              <span key={i} className="font-bold text-foreground">
                {part}
              </span>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </>
      );
    }

    return (
      <div className="flex flex-col min-w-0">
        <span className="truncate">{highlightedName}</span>
        {match && (
          <span className="text-[11px] leading-tight text-muted-foreground">
            {match[1]}
          </span>
        )}
      </div>
    );
  };

  const shouldRenderItems = !lazyRender || open;

  return (
    <CommandPrimitive
      ref={containerRef}
      shouldFilter={false}
      loop
      className={cn("relative w-full min-w-0 h-10", className)}
    >
      <div
        className={cn(
          "absolute inset-0 z-20 flex items-center w-full h-full bg-background border transition-all duration-200",
          open
            ? "border-input border-b-transparent rounded-t-md rounded-b-none ring-2 ring-ring shadow-sm"
            : "border-input rounded-md focus-within:ring-2 focus-within:ring-ring"
        )}
      >
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />

        <CommandPrimitive.Input
          ref={inputRef}
          value={displayValue}
          onValueChange={handleInputChange}
          onFocus={openDropdown}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => (isComposing.current = true)}
          onCompositionEnd={() => (isComposing.current = false)}
          placeholder={searchPlaceholder || placeholder}
          className="w-full h-full bg-transparent pl-9 pr-16 text-sm placeholder:text-muted-foreground focus:outline-none"
        />

        <div className="absolute right-2 flex items-center gap-0.5">
          {selected && (
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
              if (open) closeDropdown();
              else openDropdown();
            }}
            className="rounded p-1 hover:bg-muted transition-colors"
          >
            <ChevronsUpDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200 ease-out",
                open && "rotate-180"
              )}
            />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "absolute top-full left-0 z-[150] w-full bg-popover text-popover-foreground overflow-hidden",
          "border border-t-0 border-input rounded-b-md shadow-md",
          // O motor do tailwind cuida das interpolações:
          "origin-top transition-[opacity,transform,max-height] duration-200 ease-out",
          open
            ? "opacity-100 visible scale-100 translate-y-0"
            : "opacity-0 invisible scale-[0.98] -translate-y-0.5 pointer-events-none"
        )}
        // O valor limite de height é injetado via style
        style={{ maxHeight: open ? maxHeight : 0 }}
      >
        <CommandPrimitive.List 
          className="overflow-y-auto overflow-x-hidden p-1"
          style={{ maxHeight }} // Garante o limite do scroll interno
        >
          {shouldRenderItems && (
            <>
              {filteredOptions.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {emptyText}
                </div>
              )}

              {filteredOptions.map((option) => {
                const optionValue = getOptionValue(option);
                const isOptionSelected = optionValue === value;

                return (
                  <CommandPrimitive.Item
                    key={String(optionValue)}
                    value={String(optionValue)}
                    onSelect={() => handleSelect(option)}
                    className={cn(
                      "flex cursor-pointer select-none items-start gap-2",
                      "rounded-sm px-2 py-2 text-sm outline-none",
                      "transition-colors",
                      "aria-selected:bg-accent aria-selected:text-accent-foreground",
                      isOptionSelected && !open ? "bg-accent/40" : ""
                    )}
                  >
                    <Check
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0 transition-opacity duration-200",
                        isOptionSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    
                    {renderOption 
                      ? renderOption(option, isOptionSelected, highlightQuery) 
                      : renderDefaultOption(option, highlightQuery)}
                  </CommandPrimitive.Item>
                );
              })}
            </>
          )}
        </CommandPrimitive.List>
      </div>
    </CommandPrimitive>
  );
}