CREATE TABLE public.asset_upload_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_group_category text NOT NULL,
  asset_type text NOT NULL,
  remarks text NOT NULL,
  original_file_name text NOT NULL,
  storage_path text NOT NULL,
  file_extension text NOT NULL,
  file_size_bytes bigint NOT NULL,
  content_type text,
  uploaded_by uuid NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_by uuid,
  deleted_at timestamptz,
  deletion_reason text
);

GRANT SELECT, INSERT, UPDATE ON public.asset_upload_history TO authenticated;
GRANT ALL ON public.asset_upload_history TO service_role;

ALTER TABLE public.asset_upload_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read upload history"
  ON public.asset_upload_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert upload history"
  ON public.asset_upload_history FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Admins can mark uploads deleted"
  ON public.asset_upload_history FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read asset upload files"
  ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'asset-upload-files');

CREATE POLICY "Authenticated users can upload asset files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'asset-upload-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can delete asset upload files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'asset-upload-files' AND public.has_role(auth.uid(), 'admin'));