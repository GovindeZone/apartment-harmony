-- Bye-Law Repository
CREATE TABLE IF NOT EXISTS public.bye_law_repository (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bye_law_type text NOT NULL DEFAULT 'Existing',
  document_name text NOT NULL,
  document_description text,
  gb_approved_date date,
  effective_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bye_law_type_valid
    CHECK (bye_law_type IN ('Change in Existing particulars', 'New Rule', 'Existing')),
  CONSTRAINT bye_law_dates_valid
    CHECK (
      gb_approved_date IS NULL
      OR effective_date IS NULL
      OR effective_date >= gb_approved_date
    )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bye_law_repository TO authenticated;
GRANT ALL ON public.bye_law_repository TO service_role;

ALTER TABLE public.bye_law_repository ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bye law repository authenticated access" ON public.bye_law_repository;
CREATE POLICY "bye law repository authenticated access"
  ON public.bye_law_repository
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_bye_law_repository_type
  ON public.bye_law_repository(bye_law_type);

CREATE INDEX IF NOT EXISTS idx_bye_law_repository_effective_date
  ON public.bye_law_repository(effective_date);

CREATE INDEX IF NOT EXISTS idx_bye_law_repository_approved_date
  ON public.bye_law_repository(gb_approved_date);

DROP TRIGGER IF EXISTS trg_bye_law_repository_touch ON public.bye_law_repository;
CREATE TRIGGER trg_bye_law_repository_touch
BEFORE UPDATE ON public.bye_law_repository
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();
