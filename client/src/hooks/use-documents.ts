import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

function parseData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    console.error("Validation failed:", error);
    throw error;
  }
}

export function useDocuments() {
  return useQuery({
    queryKey: [api.documents.list.path],
    queryFn: async () => {
      const res = await fetch(api.documents.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch documents");
      return parseData(api.documents.list.responses[200], await res.json());
    },
  });
}

export function useDocument(id: number) {
  return useQuery({
    queryKey: [api.documents.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.documents.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch document");
      return parseData(api.documents.get.responses[200], await res.json());
    },
    enabled: !!id,
  });
}

export function useExtraction(documentId: number) {
  return useQuery({
    queryKey: [api.documents.getExtraction.path, documentId],
    queryFn: async () => {
      const url = buildUrl(api.documents.getExtraction.path, { id: documentId });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch extraction");
      return parseData(api.documents.getExtraction.responses[200], await res.json());
    },
    enabled: !!documentId,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.documents.upload.input>) => {
      const res = await fetch(api.documents.upload.path, {
        method: api.documents.upload.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to upload document metadata");
      return parseData(api.documents.upload.responses[201], await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.documents.list.path] });
    },
  });
}

export function useExtractDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.documents.extract.path, { id });
      const res = await fetch(url, {
        method: api.documents.extract.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to extract document");
      return parseData(api.documents.extract.responses[200], await res.json());
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [api.documents.get.path, id] });
      queryClient.invalidateQueries({ queryKey: [api.documents.getExtraction.path, id] });
      queryClient.invalidateQueries({ queryKey: [api.documents.list.path] });
    },
  });
}

export function useReviewApprove() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.documents.reviewApprove.path, { id });
      const res = await fetch(url, {
        method: api.documents.reviewApprove.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to approve document");
      return parseData(api.documents.reviewApprove.responses[200], await res.json());
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [api.documents.get.path, id] });
      queryClient.invalidateQueries({ queryKey: [api.documents.list.path] });
    },
  });
}

export function useReviewUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, extractedJson }: { id: number; extractedJson: any }) => {
      const url = buildUrl(api.documents.reviewUpdate.path, { id });
      const res = await fetch(url, {
        method: api.documents.reviewUpdate.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extractedJson }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update document extraction");
      return parseData(api.documents.reviewUpdate.responses[200], await res.json());
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [api.documents.get.path, id] });
      queryClient.invalidateQueries({ queryKey: [api.documents.getExtraction.path, id] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.documents.delete.path, { id });
      const res = await fetch(url, {
        method: api.documents.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete document");
      return parseData(api.documents.delete.responses[200], await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.documents.list.path] });
    },
  });
}
