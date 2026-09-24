ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

CREATE INDEX IF NOT EXISTS profiles_is_active_idx ON public.profiles(is_active);

COMMENT ON COLUMN public.profiles.is_active IS 'When false, the application denies access without deleting historical records.';