import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useDocument, useExtraction, useReviewApprove, useReviewUpdate, useExtractDocument } from "@/hooks/use-documents";
import { StatusBadge } from "@/components/StatusBadge";
import { RiskBadge } from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Check, Save, AlertTriangle, ArrowLeft, Bot, FileText, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Review() {
  const params = useParams();
  const id = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: document, isLoading: docLoading } = useDocument(id);
  const { data: extraction, isLoading: extLoading } = useExtraction(id);
  
  const approveReview = useReviewApprove();
  const updateReview = useReviewUpdate();
  const extractMutation = useExtractDocument();

  const [jsonStr, setJsonStr] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"preview" | "data">("preview");

  useEffect(() => {
    if (extraction?.extractedJson) {
      setJsonStr(JSON.stringify(extraction.extractedJson, null, 2));
    }
  }, [extraction]);

  const handleApprove = async () => {
    try {
      await approveReview.mutateAsync(id);
      toast({ title: "Approved", description: "Document data has been verified." });
    } catch (e) {
      toast({ title: "Error", description: "Could not approve document.", variant: "destructive" });
    }
  };

  const handleUpdate = async () => {
    try {
      setJsonError(null);
      const parsed = JSON.parse(jsonStr);
      await updateReview.mutateAsync({ id, extractedJson: parsed });
      toast({ title: "Updated", description: "Extraction data updated successfully." });
    } catch (e) {
      if (e instanceof SyntaxError) {
        setJsonError("Invalid JSON format. Please check syntax.");
      } else {
        toast({ title: "Update Failed", description: "Could not save changes.", variant: "destructive" });
      }
    }
  };

  const handleExtract = async () => {
    try {
      await extractMutation.mutateAsync(id);
      toast({ title: "Extraction started", description: "Document is being processed by AI." });
    } catch (e) {
      toast({ title: "Extraction failed", description: "An error occurred during extraction.", variant: "destructive" });
    }
  };

  const isLoading = docLoading || extLoading;

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!document) {
    return <div className="p-8 text-center text-muted-foreground">Document not found.</div>;
  }

  const isReviewRequired = document.status === "review_required";
  const isPending = document.status === "pending";
  const previewUrl = `/api/documents/${id}/preview`;
  const isImage = document.mimeType?.includes('image');

  return (
    <div className="space-y-4 sm:space-y-6 flex flex-col" style={{ height: "calc(100dvh - 7rem)" }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-start sm:items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="shrink-0 h-9 w-9" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight truncate max-w-[200px] sm:max-w-md" data-testid="text-document-name">{document.originalFilename}</h2>
              {document.docType && (
                <span className="text-xs font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-full" data-testid="text-doc-type">
                  {document.docType}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3 mt-1 flex-wrap">
              <StatusBadge status={document.status} />
              {extraction && <RiskBadge level={extraction.riskLevel} />}
              {extraction?.confidence && (
                <span className="text-xs font-medium text-muted-foreground" data-testid="text-confidence">
                  {(extraction.confidence * 100).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 sm:gap-3 ml-12 sm:ml-0">
          {isPending && (
            <Button 
              onClick={handleExtract} 
              disabled={extractMutation.isPending} 
              className="gap-2 flex-1 sm:flex-none h-10"
              size="sm"
              data-testid="button-extract"
            >
              {extractMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
              Extract
            </Button>
          )}
          {isReviewRequired && (
            <>
              <Button variant="outline" onClick={handleUpdate} disabled={updateReview.isPending} className="gap-2 flex-1 sm:flex-none h-10" size="sm" data-testid="button-save">
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">Save Edits</span>
                <span className="sm:hidden">Save</span>
              </Button>
              <Button onClick={handleApprove} disabled={approveReview.isPending} className="gap-2 flex-1 sm:flex-none h-10 shadow-lg shadow-primary/20" size="sm" data-testid="button-approve">
                <Check className="h-4 w-4" />
                Approve
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="lg:hidden shrink-0">
        <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
          <button
            onClick={() => setActiveView("preview")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeView === "preview" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
            data-testid="toggle-preview"
          >
            <FileText className="h-4 w-4" />
            Document
          </button>
          <button
            onClick={() => setActiveView("data")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeView === "data" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
            data-testid="toggle-data"
          >
            <Shield className="h-4 w-4" />
            Data & Review
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 flex-1 min-h-0">
        <Card className={`flex-1 border-border/50 bg-card overflow-hidden flex flex-col shadow-md ${activeView !== "preview" ? "hidden lg:flex" : "flex"}`}>
          <CardHeader className="py-3 sm:py-4 border-b border-border/50 bg-muted/20 shrink-0">
            <CardTitle className="text-sm font-medium">Source Document</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 relative bg-white dark:bg-gray-900 min-h-[300px] sm:min-h-0">
            {isImage ? (
              <div className="absolute inset-0 overflow-auto p-3 sm:p-4 flex justify-center items-start">
                <img src={previewUrl} alt="Document" className="max-w-full h-auto rounded shadow-sm border border-border/50" data-testid="img-document" />
              </div>
            ) : (
              <iframe 
                src={previewUrl}
                className="w-full h-full border-0 bg-white min-h-[300px] sm:min-h-0" 
                title="Document Preview"
                data-testid="iframe-document"
              />
            )}
          </CardContent>
        </Card>

        <Card className={`lg:w-[450px] xl:w-[500px] border-border/50 bg-card flex flex-col shadow-md lg:shrink-0 ${activeView !== "data" ? "hidden lg:flex" : "flex"}`}>
          <Tabs defaultValue="data" className="flex-1 flex flex-col h-full">
            <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-border/50 bg-muted/20 shrink-0">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="data" data-testid="tab-extracted-data">Extracted Data</TabsTrigger>
                <TabsTrigger value="validation" data-testid="tab-validation">Validation</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="data" className="flex-1 p-0 m-0 overflow-hidden flex flex-col data-[state=inactive]:hidden">
              {extraction ? (
                <div className="flex-1 flex flex-col p-3 sm:p-4">
                  {jsonError && (
                    <div className="mb-3 sm:mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      {jsonError}
                    </div>
                  )}
                  <Textarea 
                    value={jsonStr}
                    onChange={(e) => setJsonStr(e.target.value)}
                    readOnly={!isReviewRequired}
                    className="flex-1 font-mono text-xs leading-relaxed resize-none focus-visible:ring-1 bg-background/50 border-border/50 min-h-[250px] sm:min-h-0"
                    spellCheck={false}
                    data-testid="textarea-json-editor"
                  />
                </div>
              ) : (
                <div className="p-6 sm:p-8 text-center text-muted-foreground flex flex-col items-center justify-center h-full min-h-[200px]">
                  <AlertTriangle className="h-8 w-8 mb-4 opacity-50" />
                  <p data-testid="text-no-extraction">No extraction data available yet.</p>
                  {isPending && (
                    <Button onClick={handleExtract} disabled={extractMutation.isPending} className="gap-2 mt-4" data-testid="button-extract-panel">
                      {extractMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                      Run AI Extraction
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="validation" className="flex-1 p-3 sm:p-4 m-0 overflow-y-auto data-[state=inactive]:hidden">
               {extraction?.validationReportJson ? (
                 <div className="space-y-4">
                   {(extraction.validationReportJson as any)?.passed === false && (
                     <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-sm text-amber-600 dark:text-amber-400 flex items-start gap-2">
                       <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                       Validation found issues that require review
                     </div>
                   )}
                   {(extraction.validationReportJson as any)?.passed === true && (
                     <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-600 dark:text-emerald-400 flex items-start gap-2">
                       <Check className="h-4 w-4 shrink-0 mt-0.5" />
                       All validation rules passed
                     </div>
                   )}
                   <pre className="text-xs font-mono text-muted-foreground bg-black/20 p-3 sm:p-4 rounded-lg overflow-x-auto border border-border/50" data-testid="text-validation-report">
                     {JSON.stringify(extraction.validationReportJson, null, 2)}
                   </pre>
                 </div>
               ) : (
                 <p className="text-sm text-muted-foreground text-center mt-10" data-testid="text-no-validation">No validation report available.</p>
               )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
