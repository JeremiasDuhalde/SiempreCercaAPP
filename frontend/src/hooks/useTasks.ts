import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface TaskItem {
  id: number;
  title: string;
  description: string | null;
  category: string;
  priority: number;
  status: string;
  client_id: number | null;
  assigned_to: number | null;
  created_by: number | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string | null;
}

export interface TaskStats {
  active: number;
  pending: number;
  high_priority: number;
}

export interface CreateTaskParams {
  title: string;
  description?: string;
  category?: string;
  priority?: number;
  client_id?: number;
  assigned_to?: number;
  due_date?: string;
}

export interface UpdateTaskParams {
  title?: string;
  description?: string;
  status?: string;
  priority?: number;
  assigned_to?: number;
  due_date?: string;
}

export function useTasks(status?: string, category?: string) {
  return useQuery<TaskItem[]>({
    queryKey: ["tasks", status, category],
    queryFn: () =>
      api
        .get("/api/tasks/", {
          params: {
            ...(status ? { status } : {}),
            ...(category ? { category } : {}),
          },
        })
        .then((r) => r.data),
  });
}

export function useTaskStats() {
  return useQuery<TaskStats>({
    queryKey: ["tasks", "stats"],
    queryFn: () => api.get("/api/tasks/stats").then((r) => r.data),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: CreateTaskParams) =>
      api.post("/api/tasks/", params).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...params }: { id: number } & UpdateTaskParams) =>
      api.patch(`/api/tasks/${id}`, params).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/tasks/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
