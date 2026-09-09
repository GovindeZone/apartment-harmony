CREATE POLICY "staff docs read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'staff-documents');
CREATE POLICY "staff docs insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'staff-documents');
CREATE POLICY "staff docs update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'staff-documents') WITH CHECK (bucket_id = 'staff-documents');
CREATE POLICY "staff docs delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'staff-documents');