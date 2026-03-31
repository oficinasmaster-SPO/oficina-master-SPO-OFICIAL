import { useState, useCallback, useMemo } from 'react';
import { searchItems, getAutocompleteSuggestions } from '@/lib/searchUtils';

/**
 * Hook de full-text search com debounce automático
 * Suporta multi-campo, pesagem, e autocomplete
 */
export function useFullTextSearch({
  items = [],
  fields = [],
  weights = {},
  debounceMs = 300,
}) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce automático
  useMemo(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Busca memoizada
  const results = useMemo(
    () => searchItems(items, debouncedQuery, fields, weights),
    [items, debouncedQuery, fields, weights]
  );

  // Autocomplete suggestions
  const suggestions = useMemo(() => {
    if (!query || !fields.length) return [];
    return getAutocompleteSuggestions(items, fields[0], query);
  }, [items, query, fields]);

  const handleSearch = useCallback((newQuery) => {
    setQuery(newQuery);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
  }, []);

  return {
    query,
    debouncedQuery,
    results,
    suggestions,
    isSearching: query !== debouncedQuery,
    handleSearch,
    clearSearch,
    resultCount: results.length,
  };
}

/**
 * Variante para search em tempo real (sem debounce)
 */
export function useRealtimeSearch({
  items = [],
  fields = [],
  weights = {},
}) {
  const [query, setQuery] = useState('');

  const results = useMemo(
    () => searchItems(items, query, fields, weights),
    [items, query, fields, weights]
  );

  return {
    query,
    results,
    handleSearch: setQuery,
    clearSearch: () => setQuery(''),
  };
}