import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface CreateAppointmentParams {
  client_id: number;
  type: string;
  detail: string;
  scheduled_at: string;
}

export function useAppointments(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["agenda", dateFrom, dateTo],
    queryFn: () =>
      api
        .get("/api/agenda", {
          params: {
            ...(dateFrom !== undefined ? { date_from: dateFrom } : {}),
            ...(dateTo !== undefined ? { date_to: dateTo } : {}),
          },
        })
        .then((r) => r.data),
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: CreateAppointmentParams) =>
      api.post("/api/agenda", params).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda"] });
    },
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/agenda/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda"] });
    },
  });
}
