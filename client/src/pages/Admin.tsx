import { useState } from "react";
import { useSchemas, useCreateSchema, useUpdateSchema } from "@/hooks/use-schemas";
import { useUpdateOrgSettings, useUsers, useCreateUser, useUpdateUserRole } from "@/hooks/use-org";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Database, ShieldAlert, Users, Pencil, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const { data: schemas, isLoading: schemasLoading } = useSchemas();
  const createSchema = useCreateSchema();
  const updateSchema = useUpdateSchema();
  const updateSettings = useUpdateOrgSettings();
  const { data: usersList, isLoading: usersLoading } = useUsers();
  const createUser = useCreateUser();
  const updateUserRole = useUpdateUserRole();
  const { toast } = useToast();

  const [newDocType, setNewDocType] = useState("");
  const [newSchemaJson, setNewSchemaJson] = useState("{\n  \"type\": \"object\",\n  \"properties\": {}\n}");

  const [retentionDays, setRetentionDays] = useState("7");
  const [processOnly, setProcessOnly] = useState(false);

  const [editingSchema, setEditingSchema] = useState<any>(null);
  const [editSchemaJson, setEditSchemaJson] = useState("");

  const [newUserName, setNewUserName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("Viewer");

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

  const handleCreateUser = async () => {
    if (!newUserName.trim() || !newUsername.trim() || !newPassword.trim()) return;
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    try {
      await createUser.mutateAsync({ displayName: newUserName, username: newUsername, password: newPassword, role: newUserRole });
      toast({ title: "User Created", description: `${newUserName} added as ${newUserRole}.` });
      setNewUserName("");
      setNewUsername("");
      setNewPassword("");
      setNewUserRole("Viewer");
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to create user.", variant: "destructive" });
    }
  };

  if (schemasLoading) return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight" data-testid="text-admin-title">Administration</h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">Configure extraction rules, user management, and security policies.</p>
      </div>

      <Tabs defaultValue="schemas" className="w-full">
        <TabsList className="w-full sm:w-auto sm:max-w-[600px] grid grid-cols-3 mb-6 sm:mb-8 bg-card border border-border/50">
          <TabsTrigger value="schemas" className="text-xs sm:text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary" data-testid="tab-schemas">Schemas</TabsTrigger>
          <TabsTrigger value="users" className="text-xs sm:text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary" data-testid="tab-users">Users</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs sm:text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary" data-testid="tab-settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="schemas" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card className="border-border/50 shadow-sm bg-card">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Users className="h-5 w-5 text-primary" /> Add Staff Member</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Create user profiles and assign roles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input 
                    placeholder="e.g. Ahmad bin Ismail" 
                    value={newUserName} 
                    onChange={(e) => setNewUserName(e.target.value)} 
                    className="bg-background/50 h-11"
                    data-testid="input-staff-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input 
                    placeholder="e.g. ahmad.ismail" 
                    value={newUsername} 
                    onChange={(e) => setNewUsername(e.target.value)} 
                    className="bg-background/50 h-11"
                    data-testid="input-staff-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input 
                    type="password"
                    placeholder="Min. 6 characters" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    className="bg-background/50 h-11"
                    data-testid="input-staff-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={newUserRole} onValueChange={setNewUserRole}>
                    <SelectTrigger className="bg-background/50 h-11" data-testid="select-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Reviewer">Reviewer</SelectItem>
                      <SelectItem value="Uploader">Uploader</SelectItem>
                      <SelectItem value="Viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreateUser} disabled={createUser.isPending || !newUserName.trim() || !newUsername.trim() || !newPassword.trim()} className="gap-2 w-full sm:w-auto" data-testid="button-add-user">
                <Plus className="h-4 w-4" /> Add User
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm bg-card/50 overflow-hidden">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base">Current Users</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {usersLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : (
                <>
                  <div className="hidden sm:block">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr className="border-b border-border/50">
                          <th className="text-left text-sm font-medium text-muted-foreground p-3 px-4 sm:px-6">Name</th>
                          <th className="text-left text-sm font-medium text-muted-foreground p-3">Username</th>
                          <th className="text-left text-sm font-medium text-muted-foreground p-3">Role</th>
                          <th className="text-right text-sm font-medium text-muted-foreground p-3 px-4 sm:px-6">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(!usersList || usersList.length === 0) ? (
                          <tr>
                            <td colSpan={4} className="h-24 text-center text-muted-foreground">
                              No users found. Add staff members above.
                            </td>
                          </tr>
                        ) : (
                          usersList.map((user: any, idx: number) => (
                            <tr key={user.userId || idx} className="border-b border-border/50" data-testid={`row-user-${user.userId}`}>
                              <td className="font-medium p-3 px-4 sm:px-6">{user.displayName || user.firstName || 'N/A'} {user.lastName || ''}</td>
                              <td className="text-muted-foreground p-3">{user.username || user.email || 'N/A'}</td>
                              <td className="p-3">
                                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                                  user.role === 'Admin' ? 'bg-red-500/10 text-red-500' :
                                  user.role === 'Reviewer' ? 'bg-amber-500/10 text-amber-500' :
                                  user.role === 'Uploader' ? 'bg-blue-500/10 text-blue-500' :
                                  'bg-gray-500/10 text-gray-500'
                                }`} data-testid={`text-role-${user.userId}`}>
                                  {user.role}
                                </span>
                              </td>
                              <td className="text-right p-3 px-4 sm:px-6">
                                <Select 
                                  value={user.role} 
                                  onValueChange={(newRole) => {
                                    updateUserRole.mutate({ userId: user.userId, role: newRole });
                                  }}
                                >
                                  <SelectTrigger className="w-[130px] h-8 text-xs ml-auto" data-testid={`select-change-role-${user.userId}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Admin">Admin</SelectItem>
                                    <SelectItem value="Reviewer">Reviewer</SelectItem>
                                    <SelectItem value="Uploader">Uploader</SelectItem>
                                    <SelectItem value="Viewer">Viewer</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="sm:hidden">
                    {(!usersList || usersList.length === 0) ? (
                      <div className="p-6 text-center text-muted-foreground text-sm">
                        No users found. Add staff members above.
                      </div>
                    ) : (
                      <div className="divide-y divide-border/50">
                        {usersList.map((user: any, idx: number) => (
                          <div key={user.userId || idx} className="p-4 space-y-3" data-testid={`card-user-${user.userId}`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{user.displayName || user.firstName || 'N/A'}</p>
                                <p className="text-xs text-muted-foreground">{user.username || user.email || 'N/A'}</p>
                              </div>
                              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                                user.role === 'Admin' ? 'bg-red-500/10 text-red-500' :
                                user.role === 'Reviewer' ? 'bg-amber-500/10 text-amber-500' :
                                user.role === 'Uploader' ? 'bg-blue-500/10 text-blue-500' :
                                'bg-gray-500/10 text-gray-500'
                              }`}>
                                {user.role}
                              </span>
                            </div>
                            <Select 
                              value={user.role} 
                              onValueChange={(newRole) => {
                                updateUserRole.mutate({ userId: user.userId, role: newRole });
                              }}
                            >
                              <SelectTrigger className="w-full h-9 text-xs">
                                <SelectValue placeholder="Change role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Admin">Admin</SelectItem>
                                <SelectItem value="Reviewer">Reviewer</SelectItem>
                                <SelectItem value="Uploader">Uploader</SelectItem>
                                <SelectItem value="Viewer">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings">
          <Card className="border-border/50 shadow-sm bg-card max-w-2xl">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><ShieldAlert className="h-5 w-5 text-primary" /> Security & Compliance</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Manage data retention and processing policies.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 sm:space-y-8 p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="flex flex-col gap-3 border-b border-border/50 pb-6">
                <div className="flex items-start sm:items-center justify-between gap-4">
                  <div className="space-y-0.5 flex-1">
                    <Label className="text-sm sm:text-base">Process-Only Mode</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">Documents deleted immediately after processing.</p>
                  </div>
                  <Switch checked={processOnly} onCheckedChange={setProcessOnly} data-testid="switch-process-only" />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Label className="text-sm sm:text-base">Retention Period (Days)</Label>
                <p className="text-xs sm:text-sm text-muted-foreground">Days to keep documents before deletion.</p>
                <Input 
                  type="number" 
                  value={retentionDays} 
                  onChange={(e) => setRetentionDays(e.target.value)} 
                  className="bg-background/50 max-w-[150px] h-11" 
                  disabled={processOnly}
                  data-testid="input-retention-days"
                />
              </div>
            </CardContent>
            <CardFooter className="p-4 sm:p-6 pt-0 sm:pt-0">
              <Button onClick={handleSaveSettings} disabled={updateSettings.isPending} className="shadow-lg shadow-primary/20 w-full sm:w-auto" data-testid="button-save-settings">
                Save Configuration
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

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
