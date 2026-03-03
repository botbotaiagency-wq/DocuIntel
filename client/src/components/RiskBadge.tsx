import { Badge } from "@/components/ui/badge";

export function RiskBadge({ level }: { level?: string | null }) {
  if (!level) return null;
  
  switch (level.toUpperCase()) {
    case "LOW":
      return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">LOW RISK</Badge>;
    case "MED":
    case "MEDIUM":
      return <Badge variant="secondary" className="bg-amber-500/10 text-amber-400 border-amber-500/20">MED RISK</Badge>;
    case "HIGH":
      return <Badge variant="destructive" className="bg-red-500/10 text-red-400 border-red-500/20">HIGH RISK</Badge>;
    default:
      return <Badge variant="outline">{level}</Badge>;
  }
}
