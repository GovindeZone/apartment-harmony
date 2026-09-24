import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DatabaseBackup, Mail, HardDrive, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/integration-master")({
  component: IntegrationMasterPage,
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!data) throw new Error("Administrator access required.");
  },
});

type BackupConfig = {
  id: string;
  enabled: boolean;
  frequency: "monthly";
  day_of_month: number;
  time_utc: string;
  recipient_emails: string[];
  retention_months: number;
  backup_scope: "application_data" | "application_and_documents";
  storage_status: string;
  email_status: string;
  last_backup_at: string | null;
  last_backup_status: string | null;
  last_backup_file_name: string | null;
};

function IntegrationMasterPage() {
  const [config, setConfig] = useState<BackupConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadBackupConfig() {
    setLoading(true);
    const { data, error } = await supabase.from("backup_configuration").select("*").limit(1).maybeSingle();
    if (error) toast.error(error.message);
    setConfig(data as BackupConfig | null);
    setLoading(false);
  }

  useEffect(() => { void loadBackupConfig(); }, []);

  async function saveBackupConfig() {
    if (!config) return;
    const emails = config.recipient_emails.map((email) => email.trim()).filter(Boolean);
    if (!emails.length) {
      toast.error("Enter at least one backup recipient email address.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("backup_configuration").update({
      enabled: config.enabled,
      frequency: "monthly",
      day_of_month: Math.min(28, Math.max(1, Number(config.day_of_month) || 1)),
      time_utc: config.time_utc,
      recipient_emails: emails,
      retention_months: Math.min(120, Math.max(1, Number(config.retention_months) || 12)),
      backup_scope: config.backup_scope,
      email_status: "pending",
      storage_status: "pending",
    }).eq("id", config.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Monthly backup settings saved.");
  }

  return (
    <AppShell title="App Integration" description="Configure external integrations and application backup settings">
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

        <Card>
          <CardHeader><CardTitle>Biometric Integration</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Configure the separate biometric attendance machine/application used for staff attendance maintenance.</p>
            <div className="space-y-2"><Label>Biometric Machine / Application Name</Label><Input placeholder="Enter device or application name" /></div>
            <div className="space-y-2"><Label>Device / Server IP Address</Label><Input placeholder="e.g. 192.168.1.100" /></div>
            <div className="space-y-2"><Label>API / Integration URL</Label><Input placeholder="https://..." /></div>
            <div className="space-y-2"><Label>API Key / Token</Label><Input type="password" placeholder="Enter securely" /></div>
            <div className="rounded-lg bg-muted p-3 text-sm">Use this section for the biometric system connection details. Actual synchronization can be enabled once the biometric vendor's API, protocol, or database connection details are available.</div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 lg:col-span-2">
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary"><DatabaseBackup className="size-5" /></div>
              <div>
                <CardTitle>Application Backup & Email</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Schedule a monthly application backup, retain it in the application backup repository, and send the backup notification/file to the configured email address.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading || !config ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading backup configuration…</div>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="size-5 text-primary" />
                    <div>
                      <p className="font-medium">Enable monthly backup</p>
                      <p className="text-xs text-muted-foreground">The scheduler will use these settings once the backup service is configured.</p>
                    </div>
                  </div>
                  <Switch checked={config.enabled} onCheckedChange={(enabled) => setConfig({ ...config, enabled })} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Input value="Monthly" disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Day of month</Label>
                    <Input type="number" min={1} max={28} value={config.day_of_month} onChange={(e) => setConfig({ ...config, day_of_month: Number(e.target.value) })} />
                    <p className="text-xs text-muted-foreground">1–28 keeps the schedule valid for every month.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Backup time (UTC)</Label>
                    <Input type="time" value={config.time_utc} onChange={(e) => setConfig({ ...config, time_utc: e.target.value })} />
                    <p className="text-xs text-muted-foreground">Scheduler time is stored in UTC.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Retention (months)</Label>
                    <Input type="number" min={1} max={120} value={config.retention_months} onChange={(e) => setConfig({ ...config, retention_months: Number(e.target.value) })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Backup scope</Label>
                  <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={config.backup_scope} onChange={(e) => setConfig({ ...config, backup_scope: e.target.value as BackupConfig["backup_scope"] })}>
                    <option value="application_data">Application data</option>
                    <option value="application_and_documents">Application data + documents</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Email recipient(s)</Label>
                  <Input
                    value={config.recipient_emails.join(", ")}
                    placeholder="committee@example.com, admin@example.com"
                    onChange={(e) => setConfig({ ...config, recipient_emails: e.target.value.split(",") })}
                  />
                  <p className="text-xs text-muted-foreground">Enter one or more email addresses separated by commas.</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border p-3">
                    <HardDrive className="mb-2 size-4 text-primary" />
                    <p className="text-sm font-medium">Application storage</p>
                    <p className="text-xs text-muted-foreground">Status: {config.storage_status}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <Mail className="mb-2 size-4 text-primary" />
                    <p className="text-sm font-medium">Email delivery</p>
                    <p className="text-xs text-muted-foreground">Status: {config.email_status}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <DatabaseBackup className="mb-2 size-4 text-primary" />
                    <p className="text-sm font-medium">Last backup</p>
                    <p className="text-xs text-muted-foreground">{config.last_backup_at ? new Date(config.last_backup_at).toLocaleString() : "Not yet run"}</p>
                  </div>
                </div>

                {config.last_backup_file_name ? (
                  <div className="rounded-lg bg-muted p-3 text-sm">Last backup file: <span className="font-medium">{config.last_backup_file_name}</span> ({config.last_backup_status ?? "unknown"})</div>
                ) : null}

                <div className="flex justify-end">
                  <Button onClick={() => void saveBackupConfig()} disabled={saving}>
                    {saving ? "Saving…" : "Save Backup Settings"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
