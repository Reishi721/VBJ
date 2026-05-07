import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,        // 30 detik sebelum dianggap stale
      gcTime: 1000 * 60 * 5,       // cache 5 menit
      retry: 2,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 1,
    },
  },
});
