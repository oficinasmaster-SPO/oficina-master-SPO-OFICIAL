import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, X, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
// import { Badge } from "@/components/ui/badge";

export default function AdvancedFilter({ onFilter, filterConfig = [], placeholder = "Buscar..." }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({});
  const [isExpanded, setIsExpanded] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      handleApplyFilters();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Initial setup
  useEffect(() => {
    const initialFilters = {};
    filterConfig.forEach(conf => {
      if (conf.defaultValue) initialFilters[conf.key] = conf.defaultValue;
    });
    setFilters(initialFilters);
  }, []);

  const handleApplyFilters = (currentFilters = filters) => {
    onFilter({
      search: searchTerm,
      ...currentFilters
    });
  };

  const updateFilter = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    handleApplyFilters(newFilters);
  };

  const clearFilters = () => {
    setSearchTerm("");
    const initialFilters = {};
    filterConfig.forEach(conf => {
      if (conf.defaultValue) initialFilters[conf.key] = conf.defaultValue;
    });
    setFilters(initialFilters);
    handleApplyFilters(initialFilters);
  };

  const activeFiltersCount = Object.keys(filters).filter(k => {
    const conf = filterConfig.find(c => c.key === k);
    return filters[k] && filters[k] !== (conf?.defaultValue || 'all');
  }).length;

  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white"
          />
        </div>
        
        <Button 
          variant={activeFiltersCount > 0 ? "default" : "outline"} 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filtros
          {activeFiltersCount > 0 && (
            <span className="ml-1 bg-white/20 text-current h-5 px-1.5 rounded text-xs font-medium inline-flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </Button>

        {activeFiltersCount > 0 && (
          <Button variant="ghost" onClick={clearFilters} className="text-gray-500 hover:text-red-500">
            <X className="h-4 w-4 mr-2" />
            Limpar
          </Button>
        )}
      </div>

      {isExpanded && (
        <div className="p-4 bg-white rounded-lg border shadow-sm animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filterConfig.map((conf) => (
              <div key={conf.key} className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase">{conf.label}</label>
                
                {conf.type === 'select' && (
                  <Select 
                    value={filters[conf.key] || conf.defaultValue || 'all'} 
                    onValueChange={(val) => updateFilter(conf.key, val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={conf.placeholder || "Selecione..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {conf.options.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {conf.type === 'date' && (
                   <Popover>
                   <PopoverTrigger asChild>
                     <Button
                       variant={"outline"}
                       className={`w-full justify-start text-left font-normal ${!filters[conf.key] && "text-muted-foreground"}`}
                     >
                       <CalendarIcon className="mr-2 h-4 w-4" />
                       {filters[conf.key] ? format(new Date(filters[conf.key]), "PPP", { locale: ptBR }) : <span>Selecione a data</span>}
                     </Button>
                   </PopoverTrigger>
                   <PopoverContent className="w-auto p-0">
                     <Calendar
                       mode="single"
                       selected={filters[conf.key] ? new Date(filters[conf.key]) : undefined}
                       onSelect={(date) => updateFilter(conf.key, date ? date.toISOString() : null)}
                       initialFocus
                     />
                   </PopoverContent>
                 </Popover>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}