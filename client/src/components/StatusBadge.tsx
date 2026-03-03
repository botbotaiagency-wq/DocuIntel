import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  switch (status.toLowerCase()) {
    case "pending":
      return <Badge variant="outline" className="bg-zinc-800 text-zinc-300 border-zinc-700">Pending</Badge>;
    case "processing":
      return <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">Processing</Badge>;
    case "review_required":
      return <Badge variant="secondary" className="bg-amber-500/20 text-amber-300 border-amber-500/30">Review Required</Badge>;
    case "completed":
      return <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">Completed</Badge>;
    case "failed":
      return <Badge variant="destructive" className="bg-red-500/20 text-red-300 border-red-500/30">Failed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
