// ═══════════════════════════════════════════════════════════════════════
// ARGUS-X — Query Client Configuration
// TanStack Query defaults for all data fetching
// ═══════════════════════════════════════════════════════════════════════

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 3s (matches polling interval)
      staleTime: 3000,

      // Keep unused data in cache for 5 minutes
      gcTime: 5 * 60 * 1000,

      // Retry 3 times with exponential backoff
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),

      // Refetch on window focus for immediate sync
      refetchOnWindowFocus: true,

      // Don't refetch on reconnect — WebSocket handles that
      refetchOnReconnect: false,
    },
  },
});
