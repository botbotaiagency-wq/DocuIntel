import { useState, useRef, useCallback, useEffect } from "react";
import { useAnnotationByDocType, useSaveAnnotation } from "@/hooks/use-annotations";
import { useUpload } from "@/hooks/use-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Save, Trash2, Plus, Tag, MousePointer2, Image as ImageIcon, CreditCard, MapPin, ScrollText, File as FileIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Annotation {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

const DOC_TYPES = [
  { id: "IC", label: "Identity Card (IC)", icon: CreditCard },
  { id: "Geran", label: "Land Title (Geran)", icon: MapPin },
  { id: "Will", label: "Will / Testament", icon: ScrollText },
  { id: "Other", label: "Other Legal Document", icon: FileIcon },
];

const COLORS = [
  "rgba(59, 130, 246, 0.6)",
  "rgba(239, 68, 68, 0.6)",
  "rgba(34, 197, 94, 0.6)",
  "rgba(168, 85, 247, 0.6)",
  "rgba(249, 115, 22, 0.6)",
  "rgba(236, 72, 153, 0.6)",
  "rgba(20, 184, 166, 0.6)",
  "rgba(245, 158, 11, 0.6)",
];

export default function Annotate() {
  const { toast } = useToast();
  const [selectedDocType, setSelectedDocType] = useState<string>("");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [templateStorageKey, setTemplateStorageKey] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [pendingLabel, setPendingLabel] = useState("");
  const [pendingAnnotationIdx, setPendingAnnotationIdx] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { uploadFile, isUploading } = useUpload();
  const saveAnnotation = useSaveAnnotation();
  const { data: existingAnnotation, isLoading: annotationLoading } = useAnnotationByDocType(selectedDocType);

  useEffect(() => {
    if (existingAnnotation && selectedDocType) {
      setAnnotations(existingAnnotation.annotations || []);
      if (existingAnnotation.templateStorageKey) {
        setTemplateStorageKey(existingAnnotation.templateStorageKey);
        setTemplateUrl(`/api/documents/annotation-template/${encodeURIComponent(selectedDocType)}`);
      }
    } else if (selectedDocType) {
      setAnnotations([]);
      setTemplateUrl(null);
      setTemplateStorageKey(null);
    }
  }, [existingAnnotation, selectedDocType]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    ctx.drawImage(img, 0, 0);

    annotations.forEach((ann, i) => {
      const px = (ann.x / 100) * canvas.width;
      const py = (ann.y / 100) * canvas.height;
      const pw = (ann.width / 100) * canvas.width;
      const ph = (ann.height / 100) * canvas.height;

      const color = COLORS[i % COLORS.length];
      const isSelected = selectedIdx === i;

      ctx.strokeStyle = isSelected ? "rgba(255, 255, 255, 0.9)" : color;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeRect(px, py, pw, ph);

      ctx.fillStyle = color.replace("0.6", "0.15");
      ctx.fillRect(px, py, pw, ph);

      if (ann.label) {
        ctx.font = `bold ${Math.max(14, canvas.width * 0.018)}px sans-serif`;
        const textWidth = ctx.measureText(ann.label).width;
        const labelH = Math.max(20, canvas.width * 0.025);
        const labelY = py > labelH + 4 ? py - labelH - 2 : py;
        ctx.fillStyle = color.replace("0.6", "0.85");
        ctx.fillRect(px, labelY, textWidth + 12, labelH);
        ctx.fillStyle = "#fff";
        ctx.textBaseline = "middle";
        ctx.fillText(ann.label, px + 6, labelY + labelH / 2);
      }
    });

    if (currentRect) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(
        (currentRect.x / 100) * canvas.width,
        (currentRect.y / 100) * canvas.height,
        (currentRect.w / 100) * canvas.width,
        (currentRect.h / 100) * canvas.height
      );
      ctx.setLineDash([]);
    }
  }, [annotations, selectedIdx, currentRect]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const getCanvasPosition = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: ((e.clientX - rect.left) * scaleX / canvas.width) * 100,
      y: ((e.clientY - rect.top) * scaleY / canvas.height) * 100,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pos = getCanvasPosition(e);

    const clickedIdx = annotations.findIndex(ann => {
      return pos.x >= ann.x && pos.x <= ann.x + ann.width &&
             pos.y >= ann.y && pos.y <= ann.y + ann.height;
    });

    if (clickedIdx >= 0) {
      setSelectedIdx(clickedIdx);
      return;
    }

    setSelectedIdx(null);
    setDrawing(true);
    setStartPos(pos);
    setCurrentRect(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !startPos) return;
    const pos = getCanvasPosition(e);
    setCurrentRect({
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      w: Math.abs(pos.x - startPos.x),
      h: Math.abs(pos.y - startPos.y),
    });
  };

  const handleMouseUp = () => {
    if (!drawing || !currentRect) {
      setDrawing(false);
      return;
    }

    if (currentRect.w > 1 && currentRect.h > 1) {
      const newAnnotation: Annotation = {
        x: currentRect.x,
        y: currentRect.y,
        width: currentRect.w,
        height: currentRect.h,
        label: "",
      };
      const newIdx = annotations.length;
      setAnnotations([...annotations, newAnnotation]);
      setPendingAnnotationIdx(newIdx);
      setPendingLabel("");
      setLabelDialogOpen(true);
    }

    setDrawing(false);
    setStartPos(null);
    setCurrentRect(null);
  };

  const handleLabelSave = () => {
    if (pendingAnnotationIdx === null) return;
    const updated = [...annotations];
    updated[pendingAnnotationIdx] = { ...updated[pendingAnnotationIdx], label: pendingLabel || `Field ${pendingAnnotationIdx + 1}` };
    setAnnotations(updated);
    setLabelDialogOpen(false);
    setPendingAnnotationIdx(null);
    setSelectedIdx(pendingAnnotationIdx);
  };

  const handleDeleteAnnotation = (idx: number) => {
    setAnnotations(annotations.filter((_, i) => i !== idx));
    setSelectedIdx(null);
  };

  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const response = await uploadFile(file);
      if (response) {
        setTemplateStorageKey(response.objectPath);
        const reader = new FileReader();
        reader.onload = () => {
          setTemplateUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
        toast({ title: "Template uploaded", description: "Now draw boxes around each field to annotate." });
      }
    } catch (err) {
      toast({ title: "Upload failed", description: "Could not upload template image.", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!selectedDocType || annotations.length === 0) return;
    try {
      await saveAnnotation.mutateAsync({
        docType: selectedDocType,
        templateStorageKey: templateStorageKey || undefined,
        annotations,
      });
      toast({ title: "Annotations saved", description: `${annotations.length} field annotations saved for ${selectedDocType} documents.` });
    } catch (err) {
      toast({ title: "Save failed", description: "Could not save annotations.", variant: "destructive" });
    }
  };

  const handleImageLoad = () => {
    drawCanvas();
  };

  const handleEditLabel = (idx: number) => {
    setPendingAnnotationIdx(idx);
    setPendingLabel(annotations[idx].label);
    setLabelDialogOpen(true);
  };

  if (!selectedDocType) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight" data-testid="text-annotate-title">Document Annotations</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
            Upload a template document and draw boxes around fields to teach the AI where to find each piece of data.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {DOC_TYPES.map((docType) => (
            <Card
              key={docType.id}
              className="border-border/50 hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
              onClick={() => setSelectedDocType(docType.id)}
              data-testid={`card-annotate-${docType.id}`}
            >
              <CardContent className="p-4 sm:p-6 flex items-start gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 rounded-xl bg-primary/10 text-primary shrink-0">
                  <docType.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-base sm:text-lg">{docType.label}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Configure field annotations</p>
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
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" onClick={() => setSelectedDocType("")} className="gap-2 mb-2 -ml-2" data-testid="button-back-annotate">
            <MousePointer2 className="h-4 w-4" />
            Change Type
          </Button>
          <h2 className="text-xl sm:text-2xl font-display font-bold tracking-tight" data-testid="text-annotate-doctype">
            Annotate: {selectedType?.label}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {templateUrl ? "Draw boxes around fields and label them. The AI will use these annotations during extraction." : "Upload a template image to start annotating."}
          </p>
        </div>
        {templateUrl && annotations.length > 0 && (
          <Button onClick={handleSave} disabled={saveAnnotation.isPending} className="gap-2 w-full sm:w-auto" data-testid="button-save-annotations">
            {saveAnnotation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Annotations ({annotations.length})
          </Button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
        <Card className="flex-1 border-border/50 bg-card shadow-md overflow-hidden">
          <CardHeader className="py-3 sm:py-4 border-b border-border/50 bg-muted/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Template Document</CardTitle>
              <div className="relative">
                <Button variant="outline" size="sm" className="gap-2" disabled={isUploading} data-testid="button-upload-template">
                  {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                  {templateUrl ? "Replace" : "Upload"} Template
                </Button>
                <input
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleTemplateUpload}
                  accept="image/*,.png,.jpg,.jpeg"
                  disabled={isUploading}
                  data-testid="input-template-file"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 relative bg-gray-100 dark:bg-gray-900" ref={containerRef}>
            {annotationLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : templateUrl ? (
              <div className="relative">
                <img
                  ref={imgRef}
                  src={templateUrl}
                  alt="Template"
                  style={{ position: "absolute", visibility: "hidden", pointerEvents: "none" }}
                  onLoad={handleImageLoad}
                  crossOrigin="anonymous"
                />
                <canvas
                  ref={canvasRef}
                  className="w-full h-auto cursor-crosshair"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  data-testid="canvas-annotation"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 sm:h-80 text-muted-foreground gap-4 p-6">
                <ImageIcon className="h-12 w-12 opacity-40" />
                <p className="text-center text-sm">Upload a sample/template image of a <strong>{selectedType?.label}</strong> document to start annotating fields.</p>
                <div className="relative">
                  <Button variant="secondary" className="gap-2" data-testid="button-upload-template-cta">
                    <Plus className="h-4 w-4" />
                    Upload Template Image
                  </Button>
                  <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleTemplateUpload}
                    accept="image/*,.png,.jpg,.jpeg"
                    disabled={isUploading}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:w-[320px] xl:w-[360px] border-border/50 bg-card shadow-md shrink-0">
          <CardHeader className="py-3 sm:py-4 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              Field Labels ({annotations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 max-h-[400px] overflow-y-auto">
            {annotations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {templateUrl ? "Draw a box around a field on the template to add an annotation." : "Upload a template first, then draw boxes around fields."}
              </p>
            ) : (
              <div className="space-y-2">
                {annotations.map((ann, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors cursor-pointer ${
                      selectedIdx === i ? "border-primary bg-primary/5" : "border-border/50 hover:bg-muted/30"
                    }`}
                    onClick={() => setSelectedIdx(i)}
                    data-testid={`annotation-item-${i}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-sm font-medium truncate">{ann.label || `Field ${i + 1}`}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); handleEditLabel(i); }}
                        data-testid={`button-edit-label-${i}`}
                      >
                        <Tag className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDeleteAnnotation(i); }}
                        data-testid={`button-delete-annotation-${i}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={labelDialogOpen} onOpenChange={setLabelDialogOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Label This Field</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Field Name</Label>
              <Input
                value={pendingLabel}
                onChange={(e) => setPendingLabel(e.target.value)}
                placeholder="e.g. IC Number, Full Name, Address"
                autoFocus
                className="h-11"
                onKeyDown={(e) => { if (e.key === "Enter") handleLabelSave(); }}
                data-testid="input-field-label"
              />
              <p className="text-xs text-muted-foreground">
                This label tells the AI what data to extract from this region of the document.
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setLabelDialogOpen(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleLabelSave} className="w-full sm:w-auto" data-testid="button-save-label">Save Label</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
