import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import { Search, User, CheckSquare, Briefcase, MessageSquare, Target, Loader2, X, FileText, FileCheck, ClipboardList, GraduationCap, Trophy, Building, Filter } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function GlobalSearch({ workshopId }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const navigate = useNavigate();

  // Toggle with keyboard shortcut
  useEffect(() => {
    const down = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Debounce search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setTotal(0);
      setHasMore(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      console.log("🔍 [GlobalSearch] Iniciando busca:", { query, workshopId, selectedTypes });
      try {
        const response = await base44.functions.invoke("globalSearch", {
          query,
          workshop_id: workshopId,
          skip: 0,
          limit: 20,
          entity_types: selectedTypes
        });
        console.log("📦 [GlobalSearch] Resposta:", response.data);
        setResults(response.data?.results || []);
        setTotal(response.data?.total || 0);
        setHasMore(response.data?.hasMore || false);
      } catch (error) {
        console.error("❌ [GlobalSearch] Erro:", error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, workshopId, selectedTypes]);

  const handleSelect = (url) => {
    setOpen(false);
    setQuery("");
    setSelectedTypes([]);
    navigate(createPageUrl(url));
  };

  const toggleTypeFilter = (type) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const availableTypes = [
    { value: 'ProcessDocument', label: 'Processos (MAPs)' },
    { value: 'InstructionDocument', label: 'Instruções (ITs)' },
    { value: 'CompanyDocument', label: 'Documentos' },
    { value: 'TrainingCourse', label: 'Treinamentos' },
    { value: 'Employee', label: 'Colaboradores' },
    { value: 'Challenge', label: 'Desafios' },
    { value: 'Task', label: 'Tarefas' },
    { value: 'Goal', label: 'Metas' }
  ];

  const icons = {
    User: User,
    CheckSquare: CheckSquare,
    Briefcase: Briefcase,
    MessageSquare: MessageSquare,
    Target: Target,
    FileText: FileText,
    FileCheck: FileCheck,
    ClipboardList: ClipboardList,
    GraduationCap: GraduationCap,
    Trophy: Trophy,
    Building: Building,
    Search: Search
  };

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start rounded-[0.5rem] text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
        onClick={() => setOpen(true)}
      >
        <span className="hidden lg:inline-flex">Buscar...</span>
        <span className="inline-flex lg:hidden">Buscar...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 overflow-hidden max-w-[650px] top-[15%] translate-y-0">
          <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
            <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Command.Input 
                placeholder="Busque por processos, documentos, treinamentos, colaboradores..." 
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                value={query}
                onValueChange={setQuery}
              />
              {loading && <Loader2 className="h-4 w-4 animate-spin opacity-50" />}
            </div>
            
            {/* Filtros por tipo */}
            <div className="border-b px-3 py-2">
              <div className="flex items-center gap-2 mb-2">
                <Filter className="h-3 w-3 text-gray-500" />
                <span className="text-xs text-gray-600 font-medium">Filtrar por tipo:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {availableTypes.map(type => (
                  <Badge
                    key={type.value}
                    variant={selectedTypes.includes(type.value) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleTypeFilter(type.value)}
                  >
                    {type.label}
                  </Badge>
                ))}
              </div>
            </div>
            
            <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden py-2 px-2">
              <Command.Empty className="py-6 text-center text-sm">
                {query.length < 2 ? "Digite para buscar..." : "Nenhum resultado encontrado."}
              </Command.Empty>
              
              {results.map((result, idx) => {
                  const Icon = icons[result.icon] || Search;
                  console.log(`🔹 [Render Item ${idx}]`, result);
                  return (
                      <Command.Item
                          key={result.id}
                          value={`${result.title} ${result.subtitle || ''}`}
                          onSelect={() => handleSelect(result.url)}
                          className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-3 text-sm outline-none hover:bg-slate-100 aria-selected:bg-slate-100"
                      >
                          <Icon className="h-4 w-4 text-slate-500 flex-shrink-0" />
                          <div className="flex flex-col flex-1 min-w-0">
                              <span className="font-medium text-slate-900 truncate">{result.title}</span>
                              {result.subtitle && (
                                  <span className="text-xs text-slate-500 truncate">{result.subtitle}</span>
                              )}
                          </div>
                          <span className="text-xs text-slate-400">{translateType(result.type)}</span>
                      </Command.Item>
                  );
              })}
            </Command.List>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}

function translateType(type) {
    switch(type) {
        case 'Employee': return 'Colaboradores';
        case 'Task': return 'Tarefas';
        case 'Goal': return 'Metas';
        case 'EmployeeFeedback': return 'Feedbacks';
        case 'Client': return 'Clientes';
        case 'ProcessDocument': return 'Processos (MAPs)';
        case 'CompanyDocument': return 'Documentos';
        case 'InstructionDocument': return 'Instruções (ITs)';
        case 'TrainingCourse': return 'Treinamentos';
        case 'Challenge': return 'Desafios';
        case 'Workshop': return 'Oficina';
        default: return type;
    }
}