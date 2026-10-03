CREATE TABLE IF NOT EXISTS public.letter_heads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  letter_date date NOT NULL DEFAULT current_date,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.letter_heads TO authenticated;
GRANT ALL ON public.letter_heads TO service_role;

ALTER TABLE public.letter_heads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view letters"
ON public.letter_heads FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert letters"
ON public.letter_heads FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update letters"
ON public.letter_heads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete letters"
ON public.letter_heads FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_letter_heads_touch
BEFORE UPDATE ON public.letter_heads
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();