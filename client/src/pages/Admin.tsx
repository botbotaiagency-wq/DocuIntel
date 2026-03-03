import { useState } from "react";
import { useSchemas, useCreateSchema } from "@/hooks/use-schemas";
import { useUpdateOrgSettings } from "@/hooks/use-org";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Database, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const { data: schemas, isLoading: schemasLoading } = useSchemas();
  const createSchema = useCreateSchema();
  const updateSettings = useUpdateOrgSettings();
  const { toast } = useToast();

  const [newDocType, setNewDocType] = useState("");
  const [newSchemaJson, setNewSchemaJson] = useState("{\n  \"type\": \"object\",\n  \"properties\": {}\n}");

  const [retentionDays, setRetentionDays] = useState("7");
  const [processOnly, setProcessOnly] = useState(false);

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

  const handleSaveSettings = async () => {
    try {
      await updateSettings.mutateAsync({ 
        retentionDays: parseInt(retentionDays), 
        processOnlyMode: processOnly 
      });
      toast({ title: "Settings Saved", description: "Organization settings updated." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    }
  };

  if (schemasLoading) return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-display font-bold tracking-tight">Administration</h2>
        <p className="text-muted-foreground mt-1">Configure extraction rules and organizational security policies.</p>
      </div>

      <Tabs defaultValue="schemas" className="w-full">
        <TabsList className="grid w-[400px] grid-cols-2 mb-8 bg-card border border-border/50">
          <TabsTrigger value="schemas" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Schemas</TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="schemas" className="space-y-6">
          <Card className="border-border/50 shadow-sm bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" /> Create Schema</CardTitle>
              <CardDescription>Define JSON schemas to validate extracted document data automatically.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Document Type Identifier</Label>
                <Input placeholder="e.g. US_DRIVER_LICENSE" value={newDocType} onChange={(e) => setNewDocType(e.target.value)} className="bg-background/50 max-w-sm" />
              </div>
              <div className="space-y-2">
                <Label>JSON Schema Definition</Label>
                <Textarea 
                  className="font-mono text-xs min-h-[200px] bg-black/40 border-border/50 focus-visible:ring-1" 
                  value={newSchemaJson} 
                  onChange={(e) => setNewSchemaJson(e.target.value)} 
                  spellCheck={false}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleCreateSchema} disabled={createSchema.isPending || !newDocType} className="gap-2">
                <Plus className="h-4 w-4" /> Add Schema
              </Button>
            </CardFooter>
          </Card>

          <h3 className="text-lg font-semibold mt-8 mb-4">Active Schemas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schemas?.map(s => (
              <Card key={s.id} className="bg-card/50 border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex justify-between items-center">
                    {s.docType}
                    <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded">v{s.version}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs font-mono text-muted-foreground bg-black/20 p-3 rounded-md overflow-x-auto">
                    {JSON.stringify(s.jsonSchema, null, 2).slice(0, 150)}...
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="settings">
          <Card className="border-border/50 shadow-sm bg-card max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-primary" /> Security & Compliance</CardTitle>
              <CardDescription>Manage how data is retained and processed within the organization.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="flex flex-col gap-3 border-b border-border/50 pb-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Process-Only Mode (Zero Retention)</Label>
                    <p className="text-sm text-muted-foreground max-w-[80%]">When enabled, documents and extracted data are permanently deleted immediately after processing is complete.</p>
                  </div>
                  <Switch checked={processOnly} onCheckedChange={setProcessOnly} />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Label className="text-base">Data Retention Period (Days)</Label>
                <p className="text-sm text-muted-foreground">Number of days to keep documents before automatic deletion. Ignored if Process-Only Mode is enabled.</p>
                <Input 
                  type="number" 
                  value={retentionDays} 
                  onChange={(e) => setRetentionDays(e.target.value)} 
                  className="bg-background/50 max-w-[150px]" 
                  disabled={processOnly}
                />
              </div>
            </CardContent>
            <CardFooter className="pt-6">
              <Button onClick={handleSaveSettings} disabled={updateSettings.isPending} className="shadow-lg shadow-primary/20">
                Save Configuration
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
