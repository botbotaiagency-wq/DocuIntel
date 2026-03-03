import { useState, useCallback } from "react";
import { useUpload } from "@/hooks/use-upload";
import { useUploadDocument } from "@/hooks/use-documents";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadCloud, File, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function Upload() {
  const [isDragging, setIsDragging] = useState(false);
  const { uploadFile, isUploading, progress, error } = useUpload();
  const createDocumentMutation = useUploadDocument();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleFileProcess = useCallback(async (file: File) => {
    try {
      const response = await uploadFile(file);
      if (response) {
        await createDocumentMutation.mutateAsync({
          storageKey: response.objectPath,
          originalFilename: response.metadata.name,
          mimeType: response.metadata.contentType,
        });
        toast({ title: "Upload complete", description: "Document ready for extraction." });
        setLocation("/dashboard");
      }
    } catch (e) {
      toast({ title: "Upload failed", description: "There was a problem uploading the file.", variant: "destructive" });
    }
  }, [uploadFile, createDocumentMutation, setLocation, toast]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files?.length > 0) {
      handleFileProcess(files[0]);
    }
  }, [handleFileProcess]);

  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length > 0) {
      handleFileProcess(files[0]);
    }
  }, [handleFileProcess]);

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <div className="mb-8">
        <h2 className="text-3xl font-display font-bold tracking-tight">Upload Document</h2>
        <p className="text-muted-foreground mt-2">Upload legal documents, IDs, or forms for secure processing.</p>
      </div>

      <Card className="border-border/50 shadow-xl bg-card">
        <CardContent className="p-8">
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`
              relative flex flex-col items-center justify-center w-full h-72 
              border-2 border-dashed rounded-2xl transition-all duration-200
              ${isDragging ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border/60 hover:border-primary/50 hover:bg-muted/30'}
              ${isUploading ? 'opacity-50 pointer-events-none' : ''}
            `}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-4 w-full max-w-xs">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <div className="w-full space-y-2 text-center">
                  <p className="text-sm font-medium">Uploading securely...</p>
                  <Progress value={progress} className="h-2" />
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 rounded-full bg-primary/10 text-primary mb-4">
                  <UploadCloud className="h-10 w-10" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Drag & Drop file here</h3>
                <p className="text-sm text-muted-foreground mb-6 text-center max-w-xs">
                  Supports PDF, PNG, JPG, JPEG up to 50MB. Files are stored with zero-retention compliance options.
                </p>
                <div className="relative">
                  <Button variant="secondary" className="px-8 shadow-sm">Browse Files</Button>
                  <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={onFileInput}
                    disabled={isUploading}
                    accept=".pdf,.png,.jpg,.jpeg"
                  />
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="mt-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error.message}</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" /> End-to-end Encrypted
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" /> SOC2 Compliant
        </div>
      </div>
    </div>
  );
}
