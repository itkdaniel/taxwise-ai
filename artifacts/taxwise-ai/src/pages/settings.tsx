import { useState, useEffect } from "react";
import { useGetCurrentAuthUser, useUpdateUserSettings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@workspace/replit-auth-web";

export default function Settings() {
  const { data: userEnv, isLoading } = useGetCurrentAuthUser();
  const user = userEnv?.user;
  const updateSettings = useUpdateUserSettings();
  const { toast } = useToast();
  const { logout } = useAuth();
  
  const [twoFactor, setTwoFactor] = useState(false);

  useEffect(() => {
    // We don't have this field explicitly in the mock API type returned above, but assuming it exists
    if (user && (user as any).twoFactorEnabled !== undefined) {
      setTwoFactor((user as any).twoFactorEnabled);
    }
  }, [user]);

  const handleSaveSettings = async () => {
    try {
      await updateSettings.mutateAsync({ data: { twoFactorEnabled: twoFactor } as any });
      toast({ title: "Settings Saved", description: "Your preferences have been updated." });
    } catch (e: any) {
      toast({ title: "Failed to save", description: e.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="flex h-[50vh] justify-center items-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground">Manage your profile and security preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Your personal identity and role on the platform.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="text-2xl">{user?.firstName?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h3 className="font-medium text-lg">{user?.firstName} {user?.lastName}</h3>
              <p className="text-muted-foreground">{user?.email || 'No email set'}</p>
              <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase bg-primary/10 text-primary mt-2">
                {(user as any)?.role || 'User'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Manage your account security and authentication methods.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between border p-4 rounded-lg">
            <div className="space-y-0.5">
              <Label className="text-base">Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">Require a verification code when logging in.</p>
            </div>
            <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
          </div>

          <div className="flex justify-between items-center pt-4">
            <Button variant="outline" onClick={() => logout()}>Log out of all devices</Button>
            <Button onClick={handleSaveSettings} disabled={updateSettings.isPending}>
              {updateSettings.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
