import { useState } from "react";
import { useDocuments, useExtractDocument, useDeleteDocument } from "@/hooks/use-documents";
import { useAuth } from "@/hooks/use-auth";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Eye, Bot, Loader2, ArrowRight, Trash2, User, Plus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { data: documents, isLoading } = useDocuments();
  const { user } = useAuth();
  const extractMutation = useExtractDocument();
  const deleteMutation = useDeleteDocument();
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const isAdmin = user?.role === "Admin";
  const displayName = user?.displayName || user?.firstName || user?.username || "User";

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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight" data-testid="text-dashboard-title">
            {isAdmin ? "All Documents" : "My Documents"}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground" data-testid="text-dashboard-greeting">
            Welcome back, {displayName}.
          </p>
        </div>
        <Button asChild className="gap-2 w-full sm:w-auto" data-testid="button-upload-new">
          <Link href="/upload">
            <Plus className="h-4 w-4" />
            Upload New
          </Link>
        </Button>
      </div>

      <div className="hidden md:block">
        <Card className="border-border/50 shadow-sm bg-card/50 overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="border-border/50">
                <TableHead className="w-[250px]">Filename</TableHead>
                <TableHead>Type</TableHead>
                {isAdmin && <TableHead>Uploaded By</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 6 : 5} className="h-32 text-center text-muted-foreground" data-testid="text-no-documents">
                    No documents found. Upload one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                docs.map((doc: any) => (
                  <TableRow key={doc.id} className="border-border/50 hover:bg-muted/30 transition-colors" data-testid={`row-document-${doc.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[250px]">{doc.originalFilename}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {doc.docType ? (
                        <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full" data-testid={`text-doctype-${doc.id}`}>
                          {doc.docType}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex items-center gap-2" data-testid={`text-uploader-${doc.id}`}>
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{doc.uploaderName || doc.uploaderUsername || "Unknown"}</span>
                        </div>
                      </TableCell>
                    )}
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
                            Extract
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
      </div>

      <div className="md:hidden space-y-3">
        {docs.length === 0 ? (
          <Card className="border-border/50 shadow-sm bg-card/50 p-8">
            <p className="text-center text-muted-foreground" data-testid="text-no-documents-mobile">
              No documents found. Upload one to get started.
            </p>
          </Card>
        ) : (
          docs.map((doc: any) => (
            <Card key={doc.id} className="border-border/50 shadow-sm bg-card/50 overflow-hidden" data-testid={`card-document-${doc.id}`}>
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium text-sm truncate">{doc.originalFilename}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8"
                    onClick={() => setDeleteTarget({ id: doc.id, name: doc.originalFilename })}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-mobile-${doc.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {doc.docType && (
                    <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {doc.docType}
                    </span>
                  )}
                  <StatusBadge status={doc.status} />
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{doc.createdAt ? format(new Date(doc.createdAt), 'MMM d, yyyy') : 'Unknown'}</span>
                  {isAdmin && (doc.uploaderName || doc.uploaderUsername) && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{doc.uploaderName || doc.uploaderUsername}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  {doc.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExtract(doc.id)}
                      disabled={extractMutation.isPending}
                      className="flex-1 gap-2 h-9 border-primary/20 hover:bg-primary/10 hover:text-primary text-xs"
                      data-testid={`button-extract-mobile-${doc.id}`}
                    >
                      <Bot className="h-3.5 w-3.5" />
                      Extract
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" asChild className="flex-1 gap-2 h-9 text-xs" data-testid={`button-view-mobile-${doc.id}`}>
                    <Link href={`/documents/${doc.id}`}>
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-delete-confirm-title">Delete Document</AlertDialogTitle>
            <AlertDialogDescription data-testid="text-delete-confirm-description">
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto" data-testid="button-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground w-full sm:w-auto"
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
