CREATE TABLE IF NOT EXISTS public.checklist_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department text NOT NULL CHECK (department IN ('FM','MC','Security','Electrical','STP','Plumbing','House Keeping','Garden')),
  task text NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('Daily','Weekly','Monthly','Quarterly','Half-Yearly','Yearly')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_master TO authenticated;
GRANT ALL ON public.checklist_master TO service_role;

ALTER TABLE public.checklist_master ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'checklist_master' AND policyname = 'Authenticated users can view checklist master') THEN
    CREATE POLICY "Authenticated users can view checklist master"
      ON public.checklist_master FOR SELECT TO authenticated
      USING (active = true OR public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'checklist_master' AND policyname = 'Admins can insert checklist master') THEN
    CREATE POLICY "Admins can insert checklist master"
      ON public.checklist_master FOR INSERT TO authenticated
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'checklist_master' AND policyname = 'Admins can update checklist master') THEN
    CREATE POLICY "Admins can update checklist master"
      ON public.checklist_master FOR UPDATE TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'checklist_master' AND policyname = 'Admins can delete checklist master') THEN
    CREATE POLICY "Admins can delete checklist master"
      ON public.checklist_master FOR DELETE TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS checklist_master_department_active_idx
  ON public.checklist_master(department, active);

ALTER TABLE public.apartment_settings
  ADD COLUMN IF NOT EXISTS floors text[] NOT NULL DEFAULT '{}';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.apartment_settings TO authenticated;
GRANT ALL ON public.apartment_settings TO service_role;