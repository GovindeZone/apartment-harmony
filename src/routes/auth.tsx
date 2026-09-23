import { useEffect, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Building2, KeyRound, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

const REMEMBERED_EMAIL_KEY = "indus_anantya_remembered_email";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Team Sign In — Indus Anantya Apartment" },
      {
        name: "description",
        content:
          "Secure sign in for facility managers, admins, security and help desk staff of Indus Anantya Apartment.",
      },
      { property: "og:title", content: "Team Sign In — Indus Anantya Apartment" },
      {
        property: "og:description",
        content: "Secure sign in for the Indus Anantya Apartment facility operations team.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("Committee Member");
  const [rememberLogin, setRememberLogin] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const rememberedEmail = window.localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberLogin(true);
    }

    const isRecoveryUrl =
      new URLSearchParams(window.location.search).get("mode") === "reset" ||
      window.location.hash.includes("type=recovery");

    if (isRecoveryUrl) setResetMode(true);

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setResetMode(true);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "")
      .maybeSingle();

    if (profile?.is_active === false) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("Your account is disabled. Please contact an administrator.");
      return;
    }

    if (rememberLogin) {
      window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      // Let the browser's password manager securely retain the password when supported.
      try {
        const PasswordCredentialCtor = (
          window as unknown as {
            PasswordCredential?: new (data: {
              id: string;
              password: string;
              name?: string;
            }) => Credential;
          }
        ).PasswordCredential;

        if (PasswordCredentialCtor && navigator.credentials) {
          await navigator.credentials.store(
            new PasswordCredentialCtor({
              id: email,
              password,
              name: "Indus Anantya Apartment",
            }),
          );
        }
      } catch {
        // Browser password-manager support is optional.
      }
    } else {
      window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    }

    setLoading(false);
    router.navigate({ to: "/dashboard" });
  }

  async function sendResetEmail(e: React.FormEvent) {
    e.preventDefault();
    const resetEmail = email.trim();

    if (!resetEmail) {
      toast.error("Enter your email address first.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth?mode=reset`,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Password reset link sent. Please check your email.");
  }

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Password updated successfully. You can now continue.");
    setResetMode(false);
    setNewPassword("");
    setConfirmPassword("");
    window.history.replaceState({}, document.title, "/auth");
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: fullName, role },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      `Your account has been created as a ${role}. A confirmation email has been sent to your registered email address. Please confirm your email. An administrator will review and approve your access before you use the apartment system.`,
    );
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-10 lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-primary/12 text-primary">
            <Building2 className="size-6" />
          </span>
          <span className="text-base font-semibold">Indus Anantya Apartment</span>
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground">
            One command deck for staff, gates, residents and help desk.
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">
            Record a gate entry in seconds, track attendance and salaries, keep every resident
            conversation on file.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Authorised community team members only.</p>
      </div>

      <div className="flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            {!resetMode && (
              <div className="mb-6 flex flex-col items-center text-center">
                <div className="mb-4 flex size-20 items-center justify-center overflow-hidden rounded-2xl border border-primary/15 bg-primary/5 p-2 shadow-sm">
                  <img
                    src="/favicon.ico"
                    alt="Indus Anantya Apartment logo"
                    className="size-full object-contain"
                  />
                </div>
                <h1 className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
                  Welcome
                </h1>
                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  Indus Anantya Apartment, Egattur, Chennai
                </p>
              </div>
            )}
            {resetMode && (
              <>
                <h1 className="text-xl font-semibold tracking-tight">Reset your password</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose a new password for your account.
                </p>
              </>
            )}

            {resetMode ? (
              <form className="mt-6 space-y-4" onSubmit={updatePassword}>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  <KeyRound className="mr-2 size-4" />
                  {loading ? "Updating…" : "Reset password"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setResetMode(false);
                    window.history.replaceState({}, document.title, "/auth");
                  }}
                >
                  <ArrowLeft className="mr-2 size-4" />
                  Back to sign in
                </Button>
              </form>
            ) : forgotMode ? (
              <form className="mt-6 space-y-4" onSubmit={sendResetEmail}>
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@ashvale.in"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending…" : "Send reset link"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setForgotMode(false)}
                >
                  <ArrowLeft className="mr-2 size-4" />
                  Back to sign in
                </Button>
              </form>
            ) : (
              <Tabs defaultValue="signin" className="mt-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Create account</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form className="mt-5 space-y-4" onSubmit={signIn}>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        autoComplete="username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@ashvale.in"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>

                    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={rememberLogin}
                        onChange={(e) => setRememberLogin(e.target.checked)}
                        className="size-4 rounded border-input accent-primary"
                      />
                      <span>Remember my login on this device</span>
                    </label>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Signing in…" : "Sign in"}
                    </Button>

                    <button
                      type="button"
                      className="w-full text-center text-sm font-medium text-primary hover:underline"
                      onClick={() => setForgotMode(true)}
                    >
                      Forgot password?
                    </button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form className="mt-5 space-y-4" onSubmit={signUp}>
                    <div className="space-y-2">
                      <Label htmlFor="name">Full name</Label>
                      <Input
                        id="name"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Priya Menon"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select value={role} onValueChange={setRole}>
                        <SelectTrigger id="role"><SelectValue placeholder="Select role" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Committee Member">Committee Member</SelectItem>
                          <SelectItem value="Facility Manager">Facility Manager</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email2">Email</Label>
                      <Input
                        id="email2"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password2">Password</Label>
                      <Input
                        id="password2"
                        type="password"
                        required
                        minLength={6}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Creating…" : "Create account"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
