import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const profilesTable = (supabase as unknown as {
      from: (name: "profiles") => {
        select: (columns: "is_active") => {
          eq: (column: "id", value: string) => {
            maybeSingle: () => Promise<{ data: { is_active: boolean } | null; error: unknown }>;
          };
        };
      };
    }).from("profiles");
    const { data: profile, error: profileError } = await profilesTable
      .select("is_active")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profileError || profile?.is_active === false) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
