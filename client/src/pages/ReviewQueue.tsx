import { useDocuments } from "@/hooks/use-documents";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Eye, Loader2, AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ReviewQueue() {
  const { data: documents, isLoading } = useDocuments();

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-review-queue" />
      </div>
    );
  }

  const reviewDocs = (documents || []).filter(
    (doc) => doc.status === "review_required"
  );

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="page-review-queue">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight" data-testid="text-review-title">Review Queue</h2>
        <p className="text-sm sm:text-base text-muted-foreground">Documents requiring human review before approval.</p>
      </div>

      {reviewDocs.length === 0 ? (
        <Card className="border-border/50 shadow-sm bg-card/50 p-6 sm:p-8">
          <div className="flex flex-col items-center justify-center text-center gap-3">
            <AlertTriangle className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-muted-foreground" data-testid="text-review-empty">No documents currently require review.</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="hidden md:block">
            <Card className="border-border/50 shadow-sm bg-card/50 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-border/50">
                    <TableHead className="w-[250px]">Filename</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviewDocs.map((doc) => (
                    <TableRow key={doc.id} className="border-border/50 hover:bg-muted/30 transition-colors" data-testid={`row-review-doc-${doc.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[250px]" data-testid={`text-filename-${doc.id}`}>{doc.originalFilename}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {doc.docType ? (
                          <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {doc.docType}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={doc.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {doc.createdAt ? format(new Date(doc.createdAt), 'MMM d, yyyy h:mm a') : 'Unknown'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild className="gap-2" data-testid={`button-review-${doc.id}`}>
                          <Link href={`/documents/${doc.id}`}>
                            <Eye className="h-3.5 w-3.5" />
                            Review
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          <div className="md:hidden space-y-3">
            {reviewDocs.map((doc) => (
              <Card key={doc.id} className="border-border/50 shadow-sm bg-card/50 overflow-hidden" data-testid={`card-review-doc-${doc.id}`}>
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium text-sm truncate">{doc.originalFilename}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {doc.docType && (
                      <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {doc.docType}
                      </span>
                    )}
                    <StatusBadge status={doc.status} />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {doc.createdAt ? format(new Date(doc.createdAt), 'MMM d, yyyy') : 'Unknown'}
                    </span>
                    <Button variant="secondary" size="sm" asChild className="gap-2 h-9 text-xs" data-testid={`button-review-mobile-${doc.id}`}>
                      <Link href={`/documents/${doc.id}`}>
                        <Eye className="h-3.5 w-3.5" />
                        Review
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
