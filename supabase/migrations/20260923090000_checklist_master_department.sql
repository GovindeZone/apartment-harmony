DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='checklist_master' AND column_name='category')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='checklist_master' AND column_name='department') THEN
    ALTER TABLE public.checklist_master RENAME COLUMN category TO department;
  END IF;
END $$;
ALTER TABLE public.checklist_master DROP CONSTRAINT IF EXISTS checklist_master_category_check;
ALTER TABLE public.checklist_master DROP CONSTRAINT IF EXISTS checklist_master_department_check;
ALTER TABLE public.checklist_master ADD CONSTRAINT checklist_master_department_check CHECK (department IN ('FM','MC','Security','Electrical','STP','Plumbing','House Keeping','Garden'));
DROP INDEX IF EXISTS checklist_master_category_active_idx;
CREATE INDEX IF NOT EXISTS checklist_master_department_active_idx ON public.checklist_master(department, active);