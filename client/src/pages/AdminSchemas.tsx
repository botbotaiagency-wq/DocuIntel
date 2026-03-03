import { useState } from "react";
import { useSchemas, useCreateSchema, useUpdateSchema } from "@/hooks/use-schemas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Database, Pencil, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminSchemas() {
  const { data: schemas, isLoading: schemasLoading } = useSchemas();
  const createSchema = useCreateSchema();
  const updateSchema = useUpdateSchema();
  const { toast } = useToast();

  const [newDocType, setNewDocType] = useState("");
  const [newSchemaJson, setNewSchemaJson] = useState("{\n  \"type\": \"object\",\n  \"properties\": {}\n}");
  const [editingSchema, setEditingSchema] = useState<any>(null);
  const [editSchemaJson, setEditSchemaJson] = useState("");

  const handleCreateSchema = async () => {
    try {
      const parsed = JSON.parse(newSchemaJson);
      await createSchema.mutateAsync({ docType: newDocType, jsonSchema: parsed });
      toast({ title: "Schema Created", description: "New document schema has been added." });
      setNewDocType("");
    } catch (e) {
      toast({ title: "Invalid JSON", description: "Please check schema syntax.", variant: "destructive" });
    }
  };

  const handleEditSchema = (schema: any) => {
    setEditingSchema(schema);
    setEditSchemaJson(JSON.stringify(schema.jsonSchema, null, 2));
  };

  const handleSaveSchema = async () => {
    try {
      const parsed = JSON.parse(editSchemaJson);
      await updateSchema.mutateAsync({ id: editingSchema.id, jsonSchema: parsed });
      toast({ title: "Schema Updated", description: "Schema has been saved successfully." });
      setEditingSchema(null);
    } catch (e) {
      toast({ title: "Invalid JSON", description: "Please check schema syntax.", variant: "destructive" });
    }
  };

  if (schemasLoading) return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight" data-testid="text-admin-title">Document Schemas</h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">Define JSON schemas and validation rules for document extraction (IC, Geran, Will, Other).</p>
      </div>

      <Card className="border-border/50 shadow-sm bg-card">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Database className="h-5 w-5 text-primary" /> Create Schema</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Define JSON schemas with validation rules for document data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="space-y-2">
            <Label>Document Type Identifier</Label>
            <Input placeholder="e.g. IC, Geran, Will" value={newDocType} onChange={(e) => setNewDocType(e.target.value)} className="bg-background/50 max-w-full sm:max-w-sm" data-testid="input-doc-type" />
          </div>
          <div className="space-y-2">
            <Label>JSON Schema Definition</Label>
            <p className="text-xs text-muted-foreground">
              For IC documents, gender is auto-detected: A/L, bin = Male; A/P, binti, bt = Female.
            </p>
            <Textarea 
              className="font-mono text-xs min-h-[150px] sm:min-h-[200px] bg-black/40 border-border/50 focus-visible:ring-1" 
              value={newSchemaJson} 
              onChange={(e) => setNewSchemaJson(e.target.value)} 
              spellCheck={false}
              data-testid="textarea-schema-json"
            />
          </div>
        </CardContent>
        <CardFooter className="p-4 sm:p-6 pt-0 sm:pt-0">
          <Button onClick={handleCreateSchema} disabled={createSchema.isPending || !newDocType} className="gap-2 w-full sm:w-auto" data-testid="button-add-schema">
            <Plus className="h-4 w-4" /> Add Schema
          </Button>
        </CardFooter>
      </Card>

      <h3 className="text-base sm:text-lg font-semibold mt-6 sm:mt-8 mb-3 sm:mb-4">Active Schemas</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {schemas?.map(s => (
          <Card key={s.id} className="bg-card/50 border-border/50" data-testid={`card-schema-${s.id}`}>
            <CardHeader className="pb-3 p-4 sm:p-6 sm:pb-3">
              <CardTitle className="text-base flex justify-between items-center">
                <span>{s.docType}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded">v{s.version}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditSchema(s)} data-testid={`button-edit-schema-${s.id}`}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              <pre className="text-xs font-mono text-muted-foreground bg-black/20 p-3 rounded-md overflow-x-auto max-h-[150px]">
                {JSON.stringify(s.jsonSchema, null, 2)}
              </pre>
              {s.docType === "IC" && (
                <div className="mt-3 p-2 bg-primary/5 rounded-md border border-primary/10">
                  <p className="text-xs font-medium text-primary mb-1">Validation Rules:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Gender auto-detect: A/L, bin = Male</li>
                    <li>• Gender auto-detect: A/P, binti, bt = Female</li>
                    <li>• IC format: XXXXXX-XX-XXXX</li>
                    <li>• DOB consistency with IC prefix</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editingSchema} onOpenChange={(open) => !open && setEditingSchema(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Schema: {editingSchema?.docType}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>JSON Schema</Label>
              <Textarea 
                className="font-mono text-xs min-h-[200px] sm:min-h-[300px] bg-black/40 border-border/50 focus-visible:ring-1" 
                value={editSchemaJson} 
                onChange={(e) => setEditSchemaJson(e.target.value)} 
                spellCheck={false}
                data-testid="textarea-edit-schema"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setEditingSchema(null)} className="w-full sm:w-auto" data-testid="button-cancel-edit">Cancel</Button>
            <Button onClick={handleSaveSchema} disabled={updateSchema.isPending} className="gap-2 w-full sm:w-auto" data-testid="button-save-schema">
              <Save className="h-4 w-4" /> Save Schema
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
