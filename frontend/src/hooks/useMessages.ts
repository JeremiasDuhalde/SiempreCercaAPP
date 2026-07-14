import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface SendMessageParams {
  client_id: number;
  template_key?: string;
  body: string;
}

export function useTemplates() {
  return useQuery({
    queryKey: ["message-templates"],
    queryFn: () => api.get("/api/messages/templates").then((r) => r.data),
  });
}

export function useMessages(clientId?: number) {
  return useQuery({
    queryKey: ["messages", clientId],
    queryFn: () =>
      api
        .get("/api/messages", { params: clientId !== undefined ? { client_id: clientId } : {} })
        .then((r) => r.data),
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: SendMessageParams) =>
      api.post("/api/messages/send", params).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages"] });
    },
  });
}
