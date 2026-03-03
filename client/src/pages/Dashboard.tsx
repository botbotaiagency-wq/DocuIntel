import { useState } from "react";
import { useDocuments, useExtractDocument, useDeleteDocument } from "@/hooks/use-documents";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, Eye, Bot, Loader2, ArrowRight, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { data: documents, isLoading } = useDocuments();
  const extractMutation = useExtractDocument();
  const deleteMutation = useDeleteDocument();
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({ title: "Document deleted", description: `"${deleteTarget.name}" has been removed.` });
    } catch (e) {
      toast({ title: "Delete failed", description: "An error occurred while deleting the document.", variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleExtract = async (id: number) => {
    try {
      await extractMutation.mutateAsync(id);
      toast({ title: "Extraction started", description: "The document is now being processed." });
    } catch (e) {
      toast({ title: "Extraction failed", description: "An error occurred.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const docs = documents || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Recent Documents</h2>
          <p className="text-muted-foreground">Manage and track your document extractions.</p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/upload">
            <ArrowRight className="h-4 w-4" />
            Upload New
          </Link>
        </Button>
      </div>

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
            {docs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  No documents found. Upload one to get started.
                </TableCell>
              </TableRow>
            ) : (
              docs.map((doc) => (
                <TableRow key={doc.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate max-w-[250px]">{doc.originalFilename}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {doc.docType ? (
                      <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full" data-testid={`text-doctype-${doc.id}`}>
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
                    <div className="flex justify-end gap-2">
                      {doc.status === 'pending' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleExtract(doc.id)}
                          disabled={extractMutation.isPending}
                          className="gap-2 border-primary/20 hover:bg-primary/10 hover:text-primary"
                          data-testid={`button-extract-${doc.id}`}
                        >
                          <Bot className="h-3.5 w-3.5" />
                          Extract Data
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" asChild className="gap-2" data-testid={`button-view-${doc.id}`}>
                        <Link href={`/documents/${doc.id}`}>
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget({ id: doc.id, name: doc.originalFilename })}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${doc.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-delete-confirm-title">Delete Document</AlertDialogTitle>
            <AlertDialogDescription data-testid="text-delete-confirm-description">
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-delete-confirm"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
