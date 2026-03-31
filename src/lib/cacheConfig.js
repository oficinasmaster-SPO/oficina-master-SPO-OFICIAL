// Cache configuration for TanStack Query
// Defines staleTime and gcTime for different data categories

export const CACHE_TIMES = {
  // Immutable data - never changes once created
  IMMUTABLE: {
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  },
  
  // Stable data - changes rarely (workshop config, permissions)
  STABLE: {
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
  },
  
  // Moderate data - changes occasionally (employee list, diagnostics)
  MODERATE: {
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  },
  
  // Real-time data - changes frequently (notifications, tasks)
  REALTIME: {
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
  },
};

// Apply cache config to query key
export const withCache = (queryKey, cacheType = 'STABLE') => ({
  queryKey,
  ...CACHE_TIMES[cacheType],
});