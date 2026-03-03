import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useDocument, useExtraction, useReviewApprove, useReviewUpdate } from "@/hooks/use-documents";
import { StatusBadge } from "@/components/StatusBadge";
import { RiskBadge } from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Check, Save, AlertTriangle, ArrowLeft } from "lucide-react";
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

  const [jsonStr, setJsonStr] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

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

  const isLoading = docLoading || extLoading;

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!document) {
    return <div className="p-8 text-center text-muted-foreground">Document not found.</div>;
  }

  const isReviewRequired = document.status === "review_required";

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight truncate max-w-md">{document.originalFilename}</h2>
            <div className="flex items-center gap-3 mt-1">
              <StatusBadge status={document.status} />
              {extraction && <RiskBadge level={extraction.riskLevel} />}
              {extraction?.confidence && (
                <span className="text-xs font-medium text-muted-foreground">
                  Confidence: {(extraction.confidence * 100).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          {isReviewRequired && (
            <>
              <Button variant="outline" onClick={handleUpdate} disabled={updateReview.isPending} className="gap-2">
                <Save className="h-4 w-4" />
                Save Edits
              </Button>
              <Button onClick={handleApprove} disabled={approveReview.isPending} className="gap-2 shadow-lg shadow-primary/20">
                <Check className="h-4 w-4" />
                Approve Data
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Split View */}
      <div className="flex gap-6 flex-1 min-h-0">
        {/* Left: Document Viewer */}
        <Card className="flex-1 border-border/50 bg-card overflow-hidden flex flex-col shadow-md">
          <CardHeader className="py-4 border-b border-border/50 bg-muted/20 shrink-0">
            <CardTitle className="text-sm font-medium">Source Document</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 relative bg-white">
            {document.mimeType?.includes('image') ? (
              <div className="absolute inset-0 overflow-auto p-4 flex justify-center items-start">
                <img src={document.storageKey} alt="Document" className="max-w-full h-auto rounded shadow-sm border border-border/50" />
              </div>
            ) : (
              <iframe 
                src={document.storageKey} 
                className="w-full h-full border-0 bg-white" 
                title="Document Preview"
                key={document.storageKey}
              />
            )}
          </CardContent>
        </Card>

        {/* Right: Data Editor */}
        <Card className="w-[450px] lg:w-[500px] border-border/50 bg-card flex flex-col shadow-md shrink-0">
          <Tabs defaultValue="data" className="flex-1 flex flex-col h-full">
            <div className="px-4 py-3 border-b border-border/50 bg-muted/20 shrink-0">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="data">Extracted Data</TabsTrigger>
                <TabsTrigger value="validation">Validation</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="data" className="flex-1 p-0 m-0 overflow-hidden flex flex-col data-[state=inactive]:hidden">
              {extraction ? (
                <div className="flex-1 flex flex-col p-4">
                  {jsonError && (
                    <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      {jsonError}
                    </div>
                  )}
                  <Textarea 
                    value={jsonStr}
                    onChange={(e) => setJsonStr(e.target.value)}
                    readOnly={!isReviewRequired}
                    className="flex-1 font-mono text-xs leading-relaxed resize-none focus-visible:ring-1 bg-background/50 border-border/50"
                    spellCheck={false}
                  />
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
                  <AlertTriangle className="h-8 w-8 mb-4 opacity-50" />
                  <p>No extraction data available yet.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="validation" className="flex-1 p-4 m-0 overflow-y-auto data-[state=inactive]:hidden">
               {extraction?.validationReportJson ? (
                 <pre className="text-xs font-mono text-muted-foreground bg-black/20 p-4 rounded-lg overflow-x-auto border border-border/50">
                   {JSON.stringify(extraction.validationReportJson, null, 2)}
                 </pre>
               ) : (
                 <p className="text-sm text-muted-foreground text-center mt-10">No validation report available.</p>
               )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
