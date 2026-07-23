import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AppointmentData } from "@/lib/types";

interface CreateAppointmentParams {
  client_id: number | null;
  type: string;
  detail: string;
  scheduled_at: string;
  status?: string;
  recurrence?: string | null;
  recurrence_end?: string | null;
  whatsapp_reminder?: boolean;
  notes?: string | null;
}

interface UpdateAppointmentParams extends Partial<CreateAppointmentParams> {
  id: number;
}

export function useAppointments(dateFrom?: string, dateTo?: string, clientId?: number) {
  return useQuery<AppointmentData[]>({
    queryKey: ["agenda", dateFrom, dateTo, clientId],
    queryFn: () =>
      api
        .get("/api/agenda/", {
          params: {
            ...(dateFrom !== undefined ? { date_from: dateFrom } : {}),
            ...(dateTo !== undefined ? { date_to: dateTo } : {}),
            ...(clientId !== undefined ? { client_id: clientId } : {}),
          },
        })
        .then((r) => r.data),
  });
}

export function useClientAppointments(clientId: number | null) {
  return useQuery<AppointmentData[]>({
    queryKey: ["agenda", "client", clientId],
    queryFn: () =>
      api.get(`/api/agenda/client/${clientId}`).then((r) => r.data),
    enabled: clientId !== null,
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: CreateAppointmentParams) =>
      api.post("/api/agenda/", params).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda"] });
    },
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...params }: UpdateAppointmentParams) =>
      api.patch(`/api/agenda/${id}`, params).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda"] });
    },
  });
}

export function useUpdateAppointmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/api/agenda/${id}/status`, { status }).then((r) => r.data),
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
