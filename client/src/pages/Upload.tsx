import { useState, useCallback, useRef } from "react";
import { useUpload } from "@/hooks/use-upload";
import { useUploadDocument } from "@/hooks/use-documents";
import { Card, CardContent } from "@/components/ui/card";
import { UploadCloud, Camera, FileText, AlertCircle, CheckCircle2, Loader2, ArrowLeft, CreditCard, MapPin, ScrollText, File as FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

const DOC_TYPES = [
  {
    id: "IC",
    label: "Identity Card (IC)",
    description: "Malaysian MyKad, MyPR, or similar identity documents",
    icon: CreditCard,
  },
  {
    id: "Geran",
    label: "Land Title (Geran)",
    description: "Geran Tanah, land title deeds and property documents",
    icon: MapPin,
  },
  {
    id: "Will",
    label: "Will / Testament",
    description: "Last will and testament, probate documents",
    icon: ScrollText,
  },
  {
    id: "Other",
    label: "Other Legal Document",
    description: "Contracts, agreements, court orders, and other legal documents",
    icon: FileIcon,
  },
];

export default function Upload() {
  const [selectedDocType, setSelectedDocType] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { uploadFile, isUploading, progress, error } = useUpload();
  const createDocumentMutation = useUploadDocument();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = useCallback(async (file: File) => {
    if (!selectedDocType) return;
    try {
      const response = await uploadFile(file);
      if (response) {
        await createDocumentMutation.mutateAsync({
          storageKey: response.objectPath,
          originalFilename: response.metadata.name,
          mimeType: response.metadata.contentType,
          docType: selectedDocType,
        });
        toast({ title: "Upload complete", description: "Document ready for extraction." });
        setLocation("/");
      }
    } catch (e) {
      toast({ title: "Upload failed", description: "There was a problem uploading the file.", variant: "destructive" });
    }
  }, [uploadFile, createDocumentMutation, setLocation, toast, selectedDocType]);

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

  if (!selectedDocType) {
    return (
      <div className="max-w-3xl mx-auto mt-10">
        <div className="mb-8">
          <h2 className="text-3xl font-display font-bold tracking-tight" data-testid="text-upload-title">Upload Document</h2>
          <p className="text-muted-foreground mt-2">Select the type of document you want to upload.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DOC_TYPES.map((docType) => (
            <Card
              key={docType.id}
              className="border-border/50 hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md"
              onClick={() => setSelectedDocType(docType.id)}
              data-testid={`card-doctype-${docType.id}`}
            >
              <CardContent className="p-6 flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
                  <docType.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{docType.label}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{docType.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const selectedType = DOC_TYPES.find(d => d.id === selectedDocType);

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <div className="mb-8">
        <Button variant="ghost" size="sm" onClick={() => setSelectedDocType(null)} className="gap-2 mb-4" data-testid="button-back-doctype">
          <ArrowLeft className="h-4 w-4" />
          Change Document Type
        </Button>
        <h2 className="text-3xl font-display font-bold tracking-tight" data-testid="text-upload-title">
          Upload {selectedType?.label}
        </h2>
        <p className="text-muted-foreground mt-2">Upload or capture your document for secure processing.</p>
      </div>

      <Card className="border-border/50 shadow-xl bg-card">
        <CardContent className="p-8">
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`
              relative flex flex-col items-center justify-center w-full h-64 
              border-2 border-dashed rounded-2xl transition-all duration-200
              ${isDragging ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border/60 hover:border-primary/50 hover:bg-muted/30'}
              ${isUploading ? 'opacity-50 pointer-events-none' : ''}
            `}
            data-testid="drop-zone"
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
                  Supports PDF, PNG, JPG, JPEG up to 50MB
                </p>
                <div className="flex gap-3">
                  <div className="relative">
                    <Button variant="secondary" className="px-6 shadow-sm gap-2" data-testid="button-browse">
                      <FileText className="h-4 w-4" />
                      Browse Files
                    </Button>
                    <input
                      type="file"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={onFileInput}
                      disabled={isUploading}
                      accept=".pdf,.png,.jpg,.jpeg"
                      data-testid="input-file"
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="px-6 gap-2 border-primary/30 text-primary hover:bg-primary/10"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isUploading}
                    data-testid="button-camera"
                  >
                    <Camera className="h-4 w-4" />
                    Take Photo
                  </Button>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={onFileInput}
                    data-testid="input-camera"
                  />
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="mt-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive" data-testid="text-upload-error">{error.message}</p>
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
