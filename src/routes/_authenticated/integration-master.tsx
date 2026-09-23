import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/integration-master")({ component: IntegrationMasterPage });

function IntegrationMasterPage() {
  return <AppShell title="Integration Master" description="Configure external apartment management application integrations">
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Apartment Adda</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Integration setup for Apartment Adda. Enter the connection details supplied by the service provider.</p>
          <div className="space-y-2"><Label>API / Integration URL</Label><Input placeholder="https://..." /></div>
          <div className="space-y-2"><Label>API Key / Token</Label><Input type="password" placeholder="Enter securely" /></div>
          <div className="rounded-lg bg-muted p-3 text-sm">Connection settings are shown here as a configuration template. Credentials should be stored securely and should not be hard-coded in the application.</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>MyGate</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Integration setup for MyGate. Enter the connection details supplied by the service provider.</p>
          <div className="space-y-2"><Label>API / Integration URL</Label><Input placeholder="https://..." /></div>
          <div className="space-y-2"><Label>API Key / Token</Label><Input type="password" placeholder="Enter securely" /></div>
          <div className="rounded-lg bg-muted p-3 text-sm">Connection settings are shown here as a configuration template. Credentials should be stored securely and should not be hard-coded in the application.</div>
        </CardContent>
      </Card>
    </div>
  </AppShell>;
}
