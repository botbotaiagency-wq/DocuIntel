import { useState } from "react";
import { useUpdateOrgSettings, useUsers, useCreateUser, useUpdateUserRole } from "@/hooks/use-org";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, ShieldAlert, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminOrgSettings() {
  const updateSettings = useUpdateOrgSettings();
  const { data: usersList, isLoading: usersLoading } = useUsers();
  const createUser = useCreateUser();
  const updateUserRole = useUpdateUserRole();
  const { toast } = useToast();

  const [retentionDays, setRetentionDays] = useState("7");
  const [processOnly, setProcessOnly] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("Viewer");

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

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight" data-testid="text-org-settings-title">Organization Settings</h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">User management, roles, and security policies.</p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="w-full sm:w-auto sm:max-w-[400px] grid grid-cols-2 mb-6 sm:mb-8 bg-card border border-border/50">
          <TabsTrigger value="users" className="text-xs sm:text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary" data-testid="tab-users">Users</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs sm:text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary" data-testid="tab-settings">Settings</TabsTrigger>
        </TabsList>
        
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
    </div>
  );
}
