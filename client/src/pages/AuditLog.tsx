import { useAuditLog } from "@/hooks/use-audit";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ShieldCheck, Download, Eye, FileText, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AuditLog() {
  const { data: logs, isLoading } = useAuditLog();

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Audit Log</h2>
        <p className="text-sm sm:text-base text-muted-foreground">Comprehensive tracking of all system events.</p>
      </div>

      <div className="hidden md:block">
        <Card className="border-border/50 shadow-sm bg-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/30">
              <tr className="border-b border-border/50">
                <th className="text-left text-sm font-medium text-muted-foreground p-3 px-4">Timestamp</th>
                <th className="text-left text-sm font-medium text-muted-foreground p-3">Event</th>
                <th className="text-left text-sm font-medium text-muted-foreground p-3">User ID</th>
                <th className="text-left text-sm font-medium text-muted-foreground p-3">Document ID</th>
              </tr>
            </thead>
            <tbody>
              {(!logs || logs.length === 0) ? (
                <tr>
                  <td colSpan={4} className="h-32 text-center text-muted-foreground">
                    No audit events recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-border/50">
                    <td className="font-mono text-xs text-muted-foreground p-3 px-4">
                      {log.createdAt ? format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss') : 'Unknown'}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="bg-background font-mono capitalize">
                        {log.eventType}
                      </Badge>
                    </td>
                    <td className="text-sm p-3">{log.userId || 'System'}</td>
                    <td className="font-mono text-xs text-muted-foreground p-3">
                      {log.docId ? `#${log.docId}` : 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </div>

      <div className="md:hidden space-y-2">
        {(!logs || logs.length === 0) ? (
          <Card className="border-border/50 shadow-sm bg-card/50 p-6">
            <p className="text-center text-muted-foreground text-sm">No audit events recorded yet.</p>
          </Card>
        ) : (
          logs.map((log) => (
            <Card key={log.id} className="border-border/50 shadow-sm bg-card/50">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-background font-mono capitalize text-xs">
                    {log.eventType}
                  </Badge>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {log.createdAt ? format(new Date(log.createdAt), 'MMM d, HH:mm') : 'Unknown'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>User: {log.userId || 'System'}</span>
                  <span>Doc: {log.docId ? `#${log.docId}` : 'N/A'}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
