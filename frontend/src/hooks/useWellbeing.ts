import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useWellbeingSnapshots(date?: string) {
  return useQuery({
    queryKey: ["wellbeing", date],
    queryFn: () =>
      api
        .get("/api/wellbeing", { params: date !== undefined ? { date } : {} })
        .then((r) => r.data),
  });
}

export function useClientWellbeing(clientId: number | null, days?: number) {
  return useQuery({
    queryKey: ["wellbeing", clientId, days],
    queryFn: () =>
      api
        .get(`/api/wellbeing/${clientId}`, { params: days !== undefined ? { days } : {} })
        .then((r) => r.data),
    enabled: clientId !== null,
  });
}
