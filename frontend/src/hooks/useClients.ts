import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface ClientFilters {
  barrio?: string;
  search?: string;
  is_active?: boolean;
}

export function useClients(filters?: ClientFilters) {
  return useQuery({
    queryKey: ["clients", filters],
    queryFn: () =>
      api.get("/api/clients", { params: { per_page: 100, ...filters } }).then((r) => r.data),
  });
}

export function useClient(id: number | null) {
  return useQuery({
    queryKey: ["clients", id],
    queryFn: () => api.get(`/api/clients/${id}`).then((r) => r.data),
    enabled: id !== null,
  });
}
