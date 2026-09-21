-- Official Records, Managing Committee (MC) and Election Commission repositories.

CREATE TABLE IF NOT EXISTS public.official_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_name text NOT NULL,
  document_description text,
  additional_remarks text,
  document_type text NOT NULL DEFAULT 'Normal',
  document_path text,
  document_file_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.official_records DROP CONSTRAINT IF EXISTS official_records_document_type_valid;
ALTER TABLE public.official_records ADD CONSTRAINT official_records_document_type_valid
  CHECK (document_type IN ('Confidential', 'Semi-Confidential', 'Normal'));

CREATE TABLE IF NOT EXISTS public.mc_repository (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_from date NOT NULL,
  period_to date NOT NULL,
  flat_id uuid NOT NULL REFERENCES public.flats(id) ON DELETE RESTRICT,
  resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE RESTRICT,
  family_member_id uuid REFERENCES public.family_members(id) ON DELETE RESTRICT,
  designation text NOT NULL,
  primary_portfolio text,
  secondary_portfolio text,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mc_repository DROP CONSTRAINT IF EXISTS mc_repository_period_valid;
ALTER TABLE public.mc_repository ADD CONSTRAINT mc_repository_period_valid
  CHECK (period_to >= period_from);

ALTER TABLE public.mc_repository DROP CONSTRAINT IF EXISTS mc_repository_phone_valid;
ALTER TABLE public.mc_repository ADD CONSTRAINT mc_repository_phone_valid
  CHECK (phone IS NULL OR phone = '' OR phone ~ '^[0-9]{10}
ALTER TABLE public.mc_repository ADD CONSTRAINT mc_repository_designation_valid
  CHECK (designation IN ('President','Vice President','Secretary','Joint Secretary','Treasurer','Joint Treasurer','Committee Member'));

CREATE TABLE IF NOT EXISTS public.ec_repository (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_from date NOT NULL,
  period_to date NOT NULL,
  flat_id uuid NOT NULL REFERENCES public.flats(id) ON DELETE RESTRICT,
  resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE RESTRICT,
  family_member_id uuid REFERENCES public.family_members(id) ON DELETE RESTRICT,
  designation text NOT NULL,
  general_body_approved_date date,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ec_repository DROP CONSTRAINT IF EXISTS ec_repository_period_valid;
ALTER TABLE public.ec_repository ADD CONSTRAINT ec_repository_period_valid
  CHECK (period_to >= period_from);

ALTER TABLE public.ec_repository DROP CONSTRAINT IF EXISTS ec_repository_phone_valid;
ALTER TABLE public.ec_repository ADD CONSTRAINT ec_repository_phone_valid
  CHECK (phone IS NULL OR phone = '' OR phone ~ '^[0-9]{10}
ALTER TABLE public.ec_repository ADD CONSTRAINT ec_repository_designation_valid
  CHECK (designation IN ('Election Commissioner','Joint Election Commissioner'));

CREATE INDEX IF NOT EXISTS idx_official_records_type ON public.official_records(document_type);
CREATE INDEX IF NOT EXISTS idx_official_records_created_at ON public.official_records(created_at);
CREATE INDEX IF NOT EXISTS idx_mc_repository_period ON public.mc_repository(period_from, period_to);
CREATE INDEX IF NOT EXISTS idx_mc_repository_flat ON public.mc_repository(flat_id);
CREATE INDEX IF NOT EXISTS idx_mc_repository_member ON public.mc_repository(resident_id, family_member_id);
CREATE INDEX IF NOT EXISTS idx_ec_repository_period ON public.ec_repository(period_from, period_to);
CREATE INDEX IF NOT EXISTS idx_ec_repository_flat ON public.ec_repository(flat_id);
CREATE INDEX IF NOT EXISTS idx_ec_repository_member ON public.ec_repository(resident_id, family_member_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.official_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mc_repository TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ec_repository TO authenticated;

ALTER TABLE public.official_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mc_repository ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ec_repository ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "official records authenticated access" ON public.official_records;
CREATE POLICY "official records authenticated access" ON public.official_records
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "mc repository authenticated access" ON public.mc_repository;
CREATE POLICY "mc repository authenticated access" ON public.mc_repository
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "ec repository authenticated access" ON public.ec_repository;
CREATE POLICY "ec repository authenticated access" ON public.ec_repository
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_official_records_touch ON public.official_records;
CREATE TRIGGER trg_official_records_touch BEFORE UPDATE ON public.official_records
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_mc_repository_touch ON public.mc_repository;
CREATE TRIGGER trg_mc_repository_touch BEFORE UPDATE ON public.mc_repository
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_ec_repository_touch ON public.ec_repository;
CREATE TRIGGER trg_ec_repository_touch BEFORE UPDATE ON public.ec_repository
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO storage.buckets (id, name, public)
VALUES ('official-records', 'official-records', false)
ON CONFLICT (id) DO NOTHING;

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/pdf', 'image/jpeg']
WHERE id = 'official-records';

DROP POLICY IF EXISTS "official records storage read" ON storage.objects;
CREATE POLICY "official records storage read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'official-records');

DROP POLICY IF EXISTS "official records storage upload" ON storage.objects;
CREATE POLICY "official records storage upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'official-records');

DROP POLICY IF EXISTS "official records storage update" ON storage.objects;
CREATE POLICY "official records storage update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'official-records') WITH CHECK (bucket_id = 'official-records');

DROP POLICY IF EXISTS "official records storage delete" ON storage.objects;
CREATE POLICY "official records storage delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'official-records');
);

ALTER TABLE public.mc_repository DROP CONSTRAINT IF EXISTS mc_repository_designation_valid;
ALTER TABLE public.mc_repository ADD CONSTRAINT mc_repository_designation_valid
  CHECK (designation IN ('President','Vice President','Secretary','Joint Secretary','Treasurer','Joint Treasurer','Committee Member'));

CREATE TABLE IF NOT EXISTS public.ec_repository (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_from date NOT NULL,
  period_to date NOT NULL,
  flat_id uuid NOT NULL REFERENCES public.flats(id) ON DELETE RESTRICT,
  resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE RESTRICT,
  family_member_id uuid REFERENCES public.family_members(id) ON DELETE RESTRICT,
  designation text NOT NULL,
  general_body_approved_date date,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ec_repository DROP CONSTRAINT IF EXISTS ec_repository_period_valid;
ALTER TABLE public.ec_repository ADD CONSTRAINT ec_repository_period_valid
  CHECK (period_to >= period_from);

ALTER TABLE public.ec_repository DROP CONSTRAINT IF EXISTS ec_repository_designation_valid;
ALTER TABLE public.ec_repository ADD CONSTRAINT ec_repository_designation_valid
  CHECK (designation IN ('Election Commissioner','Joint Election Commissioner'));

CREATE INDEX IF NOT EXISTS idx_official_records_type ON public.official_records(document_type);
CREATE INDEX IF NOT EXISTS idx_official_records_created_at ON public.official_records(created_at);
CREATE INDEX IF NOT EXISTS idx_mc_repository_period ON public.mc_repository(period_from, period_to);
CREATE INDEX IF NOT EXISTS idx_mc_repository_flat ON public.mc_repository(flat_id);
CREATE INDEX IF NOT EXISTS idx_mc_repository_member ON public.mc_repository(resident_id, family_member_id);
CREATE INDEX IF NOT EXISTS idx_ec_repository_period ON public.ec_repository(period_from, period_to);
CREATE INDEX IF NOT EXISTS idx_ec_repository_flat ON public.ec_repository(flat_id);
CREATE INDEX IF NOT EXISTS idx_ec_repository_member ON public.ec_repository(resident_id, family_member_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.official_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mc_repository TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ec_repository TO authenticated;

ALTER TABLE public.official_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mc_repository ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ec_repository ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "official records authenticated access" ON public.official_records;
CREATE POLICY "official records authenticated access" ON public.official_records
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "mc repository authenticated access" ON public.mc_repository;
CREATE POLICY "mc repository authenticated access" ON public.mc_repository
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "ec repository authenticated access" ON public.ec_repository;
CREATE POLICY "ec repository authenticated access" ON public.ec_repository
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_official_records_touch ON public.official_records;
CREATE TRIGGER trg_official_records_touch BEFORE UPDATE ON public.official_records
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_mc_repository_touch ON public.mc_repository;
CREATE TRIGGER trg_mc_repository_touch BEFORE UPDATE ON public.mc_repository
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_ec_repository_touch ON public.ec_repository;
CREATE TRIGGER trg_ec_repository_touch BEFORE UPDATE ON public.ec_repository
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO storage.buckets (id, name, public)
VALUES ('official-records', 'official-records', false)
ON CONFLICT (id) DO NOTHING;

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/pdf', 'image/jpeg']
WHERE id = 'official-records';

DROP POLICY IF EXISTS "official records storage read" ON storage.objects;
CREATE POLICY "official records storage read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'official-records');

DROP POLICY IF EXISTS "official records storage upload" ON storage.objects;
CREATE POLICY "official records storage upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'official-records');

DROP POLICY IF EXISTS "official records storage update" ON storage.objects;
CREATE POLICY "official records storage update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'official-records') WITH CHECK (bucket_id = 'official-records');

DROP POLICY IF EXISTS "official records storage delete" ON storage.objects;
CREATE POLICY "official records storage delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'official-records');
);

ALTER TABLE public.ec_repository DROP CONSTRAINT IF EXISTS ec_repository_designation_valid;
ALTER TABLE public.ec_repository ADD CONSTRAINT ec_repository_designation_valid
  CHECK (designation IN ('Election Commissioner','Joint Election Commissioner'));

CREATE INDEX IF NOT EXISTS idx_official_records_type ON public.official_records(document_type);
CREATE INDEX IF NOT EXISTS idx_official_records_created_at ON public.official_records(created_at);
CREATE INDEX IF NOT EXISTS idx_mc_repository_period ON public.mc_repository(period_from, period_to);
CREATE INDEX IF NOT EXISTS idx_mc_repository_flat ON public.mc_repository(flat_id);
CREATE INDEX IF NOT EXISTS idx_mc_repository_member ON public.mc_repository(resident_id, family_member_id);
CREATE INDEX IF NOT EXISTS idx_ec_repository_period ON public.ec_repository(period_from, period_to);
CREATE INDEX IF NOT EXISTS idx_ec_repository_flat ON public.ec_repository(flat_id);
CREATE INDEX IF NOT EXISTS idx_ec_repository_member ON public.ec_repository(resident_id, family_member_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.official_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mc_repository TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ec_repository TO authenticated;

ALTER TABLE public.official_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mc_repository ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ec_repository ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "official records authenticated access" ON public.official_records;
CREATE POLICY "official records authenticated access" ON public.official_records
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "mc repository authenticated access" ON public.mc_repository;
CREATE POLICY "mc repository authenticated access" ON public.mc_repository
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "ec repository authenticated access" ON public.ec_repository;
CREATE POLICY "ec repository authenticated access" ON public.ec_repository
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_official_records_touch ON public.official_records;
CREATE TRIGGER trg_official_records_touch BEFORE UPDATE ON public.official_records
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_mc_repository_touch ON public.mc_repository;
CREATE TRIGGER trg_mc_repository_touch BEFORE UPDATE ON public.mc_repository
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_ec_repository_touch ON public.ec_repository;
CREATE TRIGGER trg_ec_repository_touch BEFORE UPDATE ON public.ec_repository
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO storage.buckets (id, name, public)
VALUES ('official-records', 'official-records', false)
ON CONFLICT (id) DO NOTHING;

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/pdf', 'image/jpeg']
WHERE id = 'official-records';

DROP POLICY IF EXISTS "official records storage read" ON storage.objects;
CREATE POLICY "official records storage read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'official-records');

DROP POLICY IF EXISTS "official records storage upload" ON storage.objects;
CREATE POLICY "official records storage upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'official-records');

DROP POLICY IF EXISTS "official records storage update" ON storage.objects;
CREATE POLICY "official records storage update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'official-records') WITH CHECK (bucket_id = 'official-records');

DROP POLICY IF EXISTS "official records storage delete" ON storage.objects;
CREATE POLICY "official records storage delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'official-records');
);

ALTER TABLE public.mc_repository DROP CONSTRAINT IF EXISTS mc_repository_designation_valid;
ALTER TABLE public.mc_repository ADD CONSTRAINT mc_repository_designation_valid
  CHECK (designation IN ('President','Vice President','Secretary','Joint Secretary','Treasurer','Joint Treasurer','Committee Member'));

CREATE TABLE IF NOT EXISTS public.ec_repository (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_from date NOT NULL,
  period_to date NOT NULL,
  flat_id uuid NOT NULL REFERENCES public.flats(id) ON DELETE RESTRICT,
  resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE RESTRICT,
  family_member_id uuid REFERENCES public.family_members(id) ON DELETE RESTRICT,
  designation text NOT NULL,
  general_body_approved_date date,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ec_repository DROP CONSTRAINT IF EXISTS ec_repository_period_valid;
ALTER TABLE public.ec_repository ADD CONSTRAINT ec_repository_period_valid
  CHECK (period_to >= period_from);

ALTER TABLE public.ec_repository DROP CONSTRAINT IF EXISTS ec_repository_designation_valid;
ALTER TABLE public.ec_repository ADD CONSTRAINT ec_repository_designation_valid
  CHECK (designation IN ('Election Commissioner','Joint Election Commissioner'));

CREATE INDEX IF NOT EXISTS idx_official_records_type ON public.official_records(document_type);
CREATE INDEX IF NOT EXISTS idx_official_records_created_at ON public.official_records(created_at);
CREATE INDEX IF NOT EXISTS idx_mc_repository_period ON public.mc_repository(period_from, period_to);
CREATE INDEX IF NOT EXISTS idx_mc_repository_flat ON public.mc_repository(flat_id);
CREATE INDEX IF NOT EXISTS idx_mc_repository_member ON public.mc_repository(resident_id, family_member_id);
CREATE INDEX IF NOT EXISTS idx_ec_repository_period ON public.ec_repository(period_from, period_to);
CREATE INDEX IF NOT EXISTS idx_ec_repository_flat ON public.ec_repository(flat_id);
CREATE INDEX IF NOT EXISTS idx_ec_repository_member ON public.ec_repository(resident_id, family_member_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.official_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mc_repository TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ec_repository TO authenticated;

ALTER TABLE public.official_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mc_repository ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ec_repository ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "official records authenticated access" ON public.official_records;
CREATE POLICY "official records authenticated access" ON public.official_records
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "mc repository authenticated access" ON public.mc_repository;
CREATE POLICY "mc repository authenticated access" ON public.mc_repository
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "ec repository authenticated access" ON public.ec_repository;
CREATE POLICY "ec repository authenticated access" ON public.ec_repository
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_official_records_touch ON public.official_records;
CREATE TRIGGER trg_official_records_touch BEFORE UPDATE ON public.official_records
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_mc_repository_touch ON public.mc_repository;
CREATE TRIGGER trg_mc_repository_touch BEFORE UPDATE ON public.mc_repository
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_ec_repository_touch ON public.ec_repository;
CREATE TRIGGER trg_ec_repository_touch BEFORE UPDATE ON public.ec_repository
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO storage.buckets (id, name, public)
VALUES ('official-records', 'official-records', false)
ON CONFLICT (id) DO NOTHING;

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/pdf', 'image/jpeg']
WHERE id = 'official-records';

DROP POLICY IF EXISTS "official records storage read" ON storage.objects;
CREATE POLICY "official records storage read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'official-records');

DROP POLICY IF EXISTS "official records storage upload" ON storage.objects;
CREATE POLICY "official records storage upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'official-records');

DROP POLICY IF EXISTS "official records storage update" ON storage.objects;
CREATE POLICY "official records storage update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'official-records') WITH CHECK (bucket_id = 'official-records');

DROP POLICY IF EXISTS "official records storage delete" ON storage.objects;
CREATE POLICY "official records storage delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'official-records');
