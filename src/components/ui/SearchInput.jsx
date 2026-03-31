import React, { useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useFullTextSearch } from '@/hooks/useFullTextSearch';

/**
 * Input de busca com full-text search integrado
 *
 * Props:
 * - items: array de items para buscar
 * - fields: campos para buscar (ex: ['name', 'email'])
 * - weights: peso de cada campo (ex: {name: 2, email: 1})
 * - onResults: callback com resultados
 * - placeholder: placeholder do input
 * - debounceMs: delay do debounce (padrão: 300ms)
 * - showSuggestions: mostrar autocomplete (padrão: true)
 * - className: classes customizadas
 *
 * Exemplo:
 * <SearchInput
 *   items={employees}
 *   fields={['full_name', 'email', 'position']}
 *   weights={{full_name: 3, email: 1}}
 *   onResults={(results) => setFiltered(results)}
 *   placeholder="Buscar colaborador..."
 * />
 */
export default function SearchInput({
  items = [],
  fields = [],
  weights = {},
  onResults,
  placeholder = 'Buscar...',
  debounceMs = 300,
  showSuggestions = true,
  className = '',
}) {
  const {
    query,
    results,
    suggestions,
    isSearching,
    handleSearch,
    clearSearch,
    resultCount,
  } = useFullTextSearch({
    items,
    fields,
    weights,
    debounceMs,
  });

  // Notificar pai dos resultados
  useEffect(() => {
    onResults?.(results);
  }, [results, onResults]);

  return (
    <div className={`relative w-full ${className}`}>
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />

        {/* Clear button */}
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Loading state */}
      {isSearching && (
        <div className="absolute right-3 top-3">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Result count */}
      {query && !isSearching && (
        <p className="text-xs text-gray-500 mt-1">
          {resultCount} resultado{resultCount !== 1 ? 's' : ''}
        </p>
      )}

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && query && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
          <div className="max-h-40 overflow-y-auto">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSearch(suggestion)}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm text-gray-700"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No results */}
      {query && !isSearching && resultCount === 0 && (
        <p className="text-xs text-gray-500 mt-1">Nenhum resultado encontrado</p>
      )}
    </div>
  );
}