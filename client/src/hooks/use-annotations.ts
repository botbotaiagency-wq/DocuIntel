import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useAnnotations() {
  return useQuery({
    queryKey: [api.annotations.list.path],
    queryFn: async () => {
      const res = await fetch(api.annotations.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch annotations");
      return res.json();
    },
  });
}

export function useAnnotationByDocType(docType: string) {
  return useQuery({
    queryKey: [api.annotations.getByDocType.path, docType],
    queryFn: async () => {
      const url = buildUrl(api.annotations.getByDocType.path, { docType });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch annotation");
      return res.json();
    },
    enabled: !!docType,
  });
}

export function useSaveAnnotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      docType: string;
      templateStorageKey?: string;
      annotations: Array<{ x: number; y: number; width: number; height: number; label: string }>;
    }) => {
      const res = await fetch(api.annotations.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to save annotation");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.annotations.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.annotations.getByDocType.path, variables.docType] });
    },
  });
}
