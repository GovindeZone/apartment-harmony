import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserCog, UserX, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { SectionCard } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/user-management")({
  component: UserManagementPage,
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!data) throw redirect({ to: "/dashboard" });
  },
});

type Profile = { id: string; full_name: string | null; email: string | null; created_at: string; is_active?: boolean; role?: string | null };

function UserManagementPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadUsers() {
    setLoading(true);
    const { data, error } = await supabase.from("profiles").select("id,full_name,email,created_at,user_metadata").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setUsers((data ?? []).map((u: any) => ({ ...u, role: u.user_metadata?.role ?? "Committee Member" })) as Profile[]);
    setLoading(false);
  }

  useEffect(() => { void loadUsers(); }, []);

  async function toggleActive(user: Profile) {
    const { error } = await supabase.from("profiles").update({ is_active: !(user.is_active ?? true) }).eq("id", user.id);
    if (error) toast.error(error.message);
    else { toast.success((user.is_active ?? true) ? "User disabled." : "User enabled."); void loadUsers(); }
  }

  async function deleteUser(user: Profile) {
    if (!window.confirm("Delete " + (user.full_name || user.email || "this user") + " permanently? This action cannot be undone.")) return;
    const { error } = await supabase.rpc("admin_delete_user", { target_user_id: user.id });
    if (error) toast.error(error.message);
    else { toast.success("User deleted."); void loadUsers(); }
  }

  return <AppShell title="User Management" description="View, disable and delete application users">
    <SectionCard title="Users" description="Only administrators can access this page.">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left"><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Created</th><th className="p-3 text-right">Actions</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading users…</td></tr> :
              users.map(user => <tr key={user.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{user.full_name || "—"}</td>
                <td className="p-3">{user.email || "—"}</td>
                <td className="p-3">{user.role || "Committee Member"}</td><td className="p-3"><span className={"rounded-full px-2 py-1 text-xs font-medium " + ((user.is_active ?? true) ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800")}>{(user.is_active ?? true) ? "Active" : "Disabled"}</span></td>
                <td className="p-3">{new Date(user.created_at).toLocaleDateString("en-US")}</td>
                <td className="p-3"><div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => void toggleActive(user)}><UserX className="mr-1 size-4"/>{user.is_active ? "Disable" : "Enable"}</Button>
                  <Button size="sm" variant="destructive" onClick={() => void deleteUser(user)}><Trash2 className="mr-1 size-4"/>Delete</Button>
                </div></td>
              </tr>)}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><UserCog className="size-4"/>Disabled users remain registered but can be marked inactive. Permanent deletion removes the authentication account.</div>
    </SectionCard>
  </AppShell>;
}