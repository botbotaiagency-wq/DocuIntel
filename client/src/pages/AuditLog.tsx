import { useAuditLog } from "@/hooks/use-audit";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ShieldCheck, Download, Eye, FileText, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AuditLog() {
  const { data: logs, isLoading } = useAuditLog();

  const getEventIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'upload': return <UploadIcon className="h-4 w-4 text-blue-400" />;
      case 'view': return <Eye className="h-4 w-4 text-emerald-400" />;
      case 'extract': return <FileText className="h-4 w-4 text-purple-400" />;
      case 'export': return <Download className="h-4 w-4 text-amber-400" />;
      case 'delete': return <Trash2 className="h-4 w-4 text-red-400" />;
      default: return <ShieldCheck className="h-4 w-4 text-zinc-400" />;
    }
  };

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Audit Log</h2>
        <p className="text-muted-foreground">Comprehensive tracking of all system events for compliance.</p>
      </div>

      <Card className="border-border/50 shadow-sm bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-border/50">
              <TableHead>Timestamp</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Document ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!logs || logs.length === 0) ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  No audit events recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} className="border-border/50">
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {log.createdAt ? format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss') : 'Unknown'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-background font-mono capitalize">
                        {log.eventType}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{log.userId || 'System'}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {log.docId ? `#${log.docId}` : 'N/A'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// Helper icon component for standardizing
function UploadIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round" {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
    </svg>
  );
}
