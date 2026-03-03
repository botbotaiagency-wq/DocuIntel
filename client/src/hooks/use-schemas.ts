import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

export function useSchemas() {
  return useQuery({
    queryKey: [api.schemas.list.path],
    queryFn: async () => {
      const res = await fetch(api.schemas.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch schemas");
      return api.schemas.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateSchema() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.schemas.create.input>) => {
      const res = await fetch(api.schemas.create.path, {
        method: api.schemas.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create schema");
      return api.schemas.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.schemas.list.path] });
    },
  });
}

export function useUpdateSchema() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & z.infer<typeof api.schemas.update.input>) => {
      const url = buildUrl(api.schemas.update.path, { id });
      const res = await fetch(url, {
        method: api.schemas.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update schema");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.schemas.list.path] });
    },
  });
}
