ALTER TABLE public.flats ALTER COLUMN bedrooms TYPE numeric(2,1);
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS bhk text CHECK (bhk IN ('2 BHK','2.5 BHK','3 BHK','3.5 BHK'));
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS flat_sqft numeric(12,2) CHECK (flat_sqft > 0);
UPDATE public.residents r SET bhk = trim(trailing '.0' from f.bedrooms::text) || ' BHK', flat_sqft = f.area_sqft
FROM public.flats f WHERE r.flat_id = f.id AND f.bedrooms IN (2,2.5,3,3.5) AND r.bhk IS NULL;
CREATE TABLE public.department_integrations (
 department text PRIMARY KEY CHECK (department IN ('helpdesk','facility_manager','security')),
 enabled boolean NOT NULL DEFAULT false,
 spreadsheet_id text NOT NULL DEFAULT '',
 sheet_tab text NOT NULL DEFAULT 'Sheet1',
 whatsapp_number text NOT NULL DEFAULT '',
 phone_number_id text NOT NULL DEFAULT '',
 business_account_id text NOT NULL DEFAULT '',
 webhook_url text NOT NULL DEFAULT ''
);
INSERT INTO public.department_integrations (department) VALUES ('helpdesk'),('facility_manager'),('security');
ALTER TABLE public.department_integrations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON public.department_integrations TO authenticated;
CREATE POLICY "admins manage integrations" ON public.department_integrations FOR ALL TO authenticated
 USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE FUNCTION public.read_department_sheet_config(requested_department text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active)
 OR NOT (public.has_role(auth.uid(), 'admin') OR EXISTS (
 SELECT 1 FROM user_tab_permissions WHERE user_id = auth.uid() AND can_view AND tab_key = CASE requested_department WHEN 'facility_manager' THEN 'facility_management' ELSE requested_department END
 )) THEN RAISE EXCEPTION 'Access denied'; END IF;
 SELECT jsonb_build_object('enabled',enabled,'spreadsheet_id',spreadsheet_id,'sheet_tab',sheet_tab) INTO result
 FROM department_integrations WHERE department = requested_department;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.read_department_sheet_config(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.read_department_sheet_config(text) TO authenticated;
