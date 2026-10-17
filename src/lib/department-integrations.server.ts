import { createClient } from "@supabase/supabase-js";
import { createSign } from "node:crypto";
import { z } from "zod";
const schema = z
  .object({
    enabled: z.boolean(),
    spreadsheet_id: z
      .string()
      .regex(/^[\w-]*$/)
      .max(200),
    sheet_tab: z.string().min(1).max(100),
    whatsapp_number: z.string().regex(/^\+?\d{0,15}$/),
    phone_number_id: z.string().regex(/^\d*$/),
    business_account_id: z.string().regex(/^\d*$/),
    webhook_url: z.union([z.literal(""), z.string().url().startsWith("https://")]),
  })
  .strict();
export async function handleIntegration(request: Request) {
  const department = new URL(request.url).searchParams.get("department");
  if (!department || !["helpdesk", "facility_manager", "security"].includes(department))
    return Response.json({ message: "Invalid department." }, { status: 400 });
  const url = process.env["SUPABASE_URL"],
    key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key)
    return Response.json({ message: "Supabase server configuration is missing." }, { status: 503 });
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer "))
    return Response.json({ message: "Sign in required." }, { status: 401 });
  const db = createClient(url, key, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: auth, error } = await db.auth.getUser(authorization.slice(7));
  if (error || !auth.user) return Response.json({ message: "Sign in required." }, { status: 401 });
  const [role, profile] = await Promise.all([
    db.from("user_roles").select("role").eq("user_id", auth.user.id),
    db.from("profiles").select("is_active").eq("id", auth.user.id).single(),
  ]);
  if (role.error || profile.error || !profile.data?.is_active)
    return Response.json({ message: "Account access unavailable." }, { status: 403 });
  const admin = role.data.some((r) => r.role === "admin");
  const configuration =
    new URL(request.url).searchParams.get("configuration") === "true" || request.method === "PUT";
  if (configuration && !admin)
    return Response.json({ message: "Administrator access required." }, { status: 403 });
  if (!admin) {
    const tab = department === "facility_manager" ? "facility_management" : department;
    const { data: permission, error: permissionError } = await db
      .from("user_tab_permissions")
      .select("can_view")
      .eq("user_id", auth.user.id)
      .eq("tab_key", tab)
      .maybeSingle();
    if (permissionError || !permission?.can_view)
      return Response.json({ message: "Module view permission required." }, { status: 403 });
  }
  if (request.method === "PUT") {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success || (parsed.data.enabled && !parsed.data.spreadsheet_id))
      return Response.json(
        { message: "Check the integration fields. An enabled integration needs a spreadsheet ID." },
        { status: 400 },
      );
    const { error: saveError } = await db
      .from("department_integrations")
      .update(parsed.data)
      .eq("department", department);
    return Response.json(
      { message: saveError ? "Unable to save integration." : "Settings saved." },
      { status: saveError ? 500 : 200 },
    );
  }
  // Admin-only configuration stays behind RLS; module readers use a narrowly scoped definer function.
  const { data: config, error: configError } = admin
    ? await db.from("department_integrations").select("*").eq("department", department).single()
    : await db.rpc("read_department_sheet_config", { requested_department: department });
  if (configError || !config)
    return Response.json(
      { message: "Integration settings unavailable. Apply the database migration." },
      { status: 503 },
    );
  if (configuration) return Response.json(config);
  if (!config.enabled)
    return Response.json(
      { message: "Google Sheets integration is disabled. Ask an administrator to configure it." },
      { status: 409 },
    );
  try {
    const credentials = JSON.parse(
      process.env[`GOOGLE_SERVICE_ACCOUNT_${department.toUpperCase()}`] || "{}",
    );
    if (!credentials.client_email || !credentials.private_key) throw new Error("credentials");
    const now = Math.floor(Date.now() / 1000);
    const encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
    const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iss: credentials.client_email, scope: "https://www.googleapis.com/auth/spreadsheets.readonly", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`;
    const signer = createSign("RSA-SHA256");
    signer.update(unsigned);
    const assertion = `${unsigned}.${signer.sign(credentials.private_key, "base64url")}`;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const token = await tokenResponse.json();
    if (!tokenResponse.ok || !token.access_token) throw new Error("auth");
    const range = `'${config.sheet_tab.replaceAll("'", "''")}'!A1:AZ5001`;
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.spreadsheet_id)}/values/${encodeURIComponent(range)}`,
      {
        headers: { Authorization: `Bearer ${token.access_token}` },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok) throw new Error("sheet");
    const data = await response.json();
    const [headers = [], ...rows] = data.values || [];
    return Response.json({
      headers,
      rows,
      retrievedAt: new Date().toISOString(),
      limited: rows.length >= 5000,
    });
  } catch {
    return Response.json(
      {
        message:
          "Cannot read Google Sheet. Check the server service account, spreadsheet ID, tab name and sharing permissions.",
      },
      { status: 502 },
    );
  }
}
