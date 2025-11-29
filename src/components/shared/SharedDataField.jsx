import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link2, Edit3, RefreshCw, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useSharedData } from "./SharedDataProvider";

// Mapeamento de fontes para páginas de edição
const SOURCE_PAGES = {
  'tcmp2': 'DRETCMP2',
  'workshop': 'GestaoOficina',
  'goals': 'GestaoMetas',
  'dre': 'DRETCMP2',
  'os': 'DiagnosticoOS',
};

const SOURCE_LABELS = {
  'tcmp2': 'TCMP²',
  'workshop': 'Cadastro da Oficina',
  'goals': 'Metas',
  'dre': 'DRE/TCMP²',
  'os': 'Diagnóstico O.S.',
};

export default function SharedDataField({
  source,           // 'tcmp2', 'workshop', 'goals', 'dre', 'os'
  field,            // nome do campo na fonte
  label,            // label do campo
  value,            // valor atual (pode ser sobrescrito)
  onChange,         // callback quando valor muda
  type = "text",    // tipo do input
  placeholder,
  disabled = false,
  allowOverride = true,  // permite sobrescrever valor da fonte
  formatValue,      // função para formatar valor para exibição
  parseValue,       // função para parsear valor do input
  className = "",
  showSourceBadge = true,
}) {
  const sharedData = useSharedData();
  const [isOverridden, setIsOverridden] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  // Obter valor da fonte
  const getSourceValue = () => {
    const sourceMap = {
      'tcmp2': sharedData.tcmp2Data,
      'workshop': sharedData.workshopData,
      'goals': sharedData.goalsData,
      'dre': sharedData.latestDRE,
      'os': sharedData.latestOSDiagnostic,
    };
    const sourceData = sourceMap[source] || {};
    return sourceData?.[field];
  };

  const sourceValue = getSourceValue();
  const hasSourceValue = sourceValue !== undefined && sourceValue !== null && sourceValue !== '';

  // Determinar valor a exibir
  useEffect(() => {
    if (value !== undefined && value !== null && value !== '') {
      // Valor explícito fornecido
      setLocalValue(value);
      setIsOverridden(hasSourceValue && value !== sourceValue);
    } else if (hasSourceValue && !isOverridden) {
      // Usar valor da fonte
      setLocalValue(sourceValue);
      if (onChange) onChange(sourceValue);
    }
  }, [sourceValue, value]);

  const handleChange = (e) => {
    const newValue = parseValue ? parseValue(e.target.value) : e.target.value;
    setLocalValue(newValue);
    setIsOverridden(hasSourceValue && newValue !== sourceValue);
    if (onChange) onChange(newValue);
  };

  const handleResetToSource = () => {
    if (hasSourceValue) {
      setLocalValue(sourceValue);
      setIsOverridden(false);
      if (onChange) onChange(sourceValue);
    }
  };

  const displayValue = formatValue ? formatValue(localValue) : localValue;
  const sourcePage = SOURCE_PAGES[source];
  const sourceLabel = SOURCE_LABELS[source];

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">{label}</label>
          <div className="flex items-center gap-1">
            {showSourceBadge && hasSourceValue && !isOverridden && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      <Link2 className="w-3 h-3 mr-1" />
                      {sourceLabel}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Dado vinculado ao {sourceLabel}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {isOverridden && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Personalizado
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Valor diferente do {sourceLabel}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      )}
      
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            type={type}
            value={displayValue ?? ''}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled || (!allowOverride && hasSourceValue)}
            className={`${hasSourceValue && !isOverridden ? 'bg-blue-50/50 border-blue-200' : ''} ${isOverridden ? 'bg-amber-50/50 border-amber-200' : ''}`}
          />
        </div>
        
        <div className="flex gap-1">
          {isOverridden && hasSourceValue && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="icon"
                    onClick={handleResetToSource}
                    className="h-10 w-10 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Restaurar valor do {sourceLabel}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {sourcePage && hasSourceValue && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to={createPageUrl(sourcePage)}>
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="icon"
                      className="h-10 w-10 text-gray-500 hover:text-gray-700"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Editar na origem ({sourceLabel})</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente para exibição somente leitura de dados compartilhados
export function SharedDataDisplay({
  source,
  field,
  label,
  formatValue,
  fallback = '-',
  className = "",
  showSourceLink = true,
}) {
  const sharedData = useSharedData();
  
  const getSourceValue = () => {
    const sourceMap = {
      'tcmp2': sharedData.tcmp2Data,
      'workshop': sharedData.workshopData,
      'goals': sharedData.goalsData,
      'dre': sharedData.latestDRE,
      'os': sharedData.latestOSDiagnostic,
    };
    const sourceData = sourceMap[source] || {};
    return sourceData?.[field];
  };

  const value = getSourceValue();
  const displayValue = value !== undefined && value !== null 
    ? (formatValue ? formatValue(value) : value) 
    : fallback;
  
  const sourcePage = SOURCE_PAGES[source];
  const sourceLabel = SOURCE_LABELS[source];

  return (
    <div className={`${className}`}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-500">{label}</span>
          {showSourceLink && sourcePage && (
            <Link 
              to={createPageUrl(sourcePage)} 
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              <Link2 className="w-3 h-3" />
              {sourceLabel}
            </Link>
          )}
        </div>
      )}
      <p className="font-medium text-gray-900">{displayValue}</p>
    </div>
  );
}