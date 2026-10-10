CREATE TABLE public.ai_gateway_access_state (id text PRIMARY KEY, status integer NOT NULL DEFAULT 403, message text NOT NULL DEFAULT 'AI access is paused.', updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.ai_gateway_access_state TO authenticated;
GRANT ALL ON public.ai_gateway_access_state TO service_role;
ALTER TABLE public.ai_gateway_access_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_access_state_read ON public.ai_gateway_access_state FOR SELECT TO authenticated USING (true);