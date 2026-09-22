ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Admins can manage profiles') THEN
    CREATE POLICY "Admins can manage profiles" ON public.profiles FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='admin'));
  END IF;
END $$;
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='admin') THEN RAISE EXCEPTION 'Only administrators can delete users'; END IF;
  IF target_user_id=auth.uid() THEN RAISE EXCEPTION 'You cannot delete your own account'; END IF;
  DELETE FROM auth.users WHERE id=target_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_delete_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;