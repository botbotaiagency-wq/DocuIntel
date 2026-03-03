import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

export function useUpdateOrgSettings() {
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.orgs.settings.input>) => {
      const res = await fetch(api.orgs.settings.path, {
        method: api.orgs.settings.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update organization settings");
      return api.orgs.settings.responses[200].parse(await res.json());
    },
  });
}
