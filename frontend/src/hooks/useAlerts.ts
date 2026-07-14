import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface AlertFilters {
  status?: string;
}

interface UpdateAlertStatusParams {
  id: number;
  status: string;
  detail?: string;
}

export function useAlerts(filters?: AlertFilters) {
  return useQuery({
    queryKey: ["alerts", filters],
    queryFn: () =>
      api.get("/api/alerts", { params: { per_page: 50, ...filters } }).then((r) => r.data),
  });
}

export function useAlertStats() {
  return useQuery({
    queryKey: ["alert-stats"],
    queryFn: () => api.get("/api/alerts/stats").then((r) => r.data),
    refetchInterval: 30_000,
  });
}

export function useUpdateAlertStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, detail }: UpdateAlertStatusParams) =>
      api.patch(`/api/alerts/${id}/status`, { status, detail }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["alert-stats"] });
    },
  });
}
