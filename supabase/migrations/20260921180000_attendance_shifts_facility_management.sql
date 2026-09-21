-- Attendance shift support
ALTER TABLE public.staff_attendance
  ADD COLUMN IF NOT EXISTS shift text NOT NULL DEFAULT 'General Shift (9 AM - 6 PM)';

UPDATE public.staff_attendance sa
SET shift = CASE
  WHEN lower(coalesce(s.shift, '')) = 'evening' THEN 'First Shift (2 PM - 10 PM)'
  WHEN lower(coalesce(s.shift, '')) IN ('night', 'second') THEN 'Second Shift (10 PM - 9 AM)'
  ELSE 'General Shift (9 AM - 6 PM)'
END
FROM public.staff s
WHERE s.id = sa.staff_id;

ALTER TABLE public.staff_attendance
  DROP CONSTRAINT IF EXISTS staff_attendance_shift_check;

ALTER TABLE public.staff_attendance
  ADD CONSTRAINT staff_attendance_shift_check
  CHECK (shift IN (
    'General Shift (9 AM - 6 PM)',
    'First Shift (2 PM - 10 PM)',
    'Second Shift (10 PM - 9 AM)'
  ));

CREATE INDEX IF NOT EXISTS idx_staff_attendance_shift_date
  ON public.staff_attendance(shift, attendance_date);

-- Facility Management
CREATE TABLE IF NOT EXISTS public.facility_management_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_name text NOT NULL,
  task_type text NOT NULL DEFAULT 'Regular',
  assigned_staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  assigned_department text,
  task_description text,
  task_start_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_end_date date,
  status text NOT NULL DEFAULT 'Started',
  frequency text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT facility_task_type_check
    CHECK (task_type IN ('Regular', 'Occasional')),
  CONSTRAINT facility_task_status_check
    CHECK (status IN ('Started', 'In-Progress', 'Completed', 'Aborted')),
  CONSTRAINT facility_task_frequency_check
    CHECK (frequency IS NULL OR frequency IN ('Daily', 'Weekly', 'Monthly', 'Quarterly', 'Half Yearly', 'Full Year')),
  CONSTRAINT facility_task_regular_frequency_check
    CHECK (task_type = 'Occasional' OR frequency IS NOT NULL),
  CONSTRAINT facility_task_dates_check
    CHECK (expected_end_date IS NULL OR expected_end_date >= task_start_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.facility_management_tasks TO authenticated;
GRANT ALL ON public.facility_management_tasks TO service_role;
ALTER TABLE public.facility_management_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "facility management tasks manage" ON public.facility_management_tasks;
CREATE POLICY "facility management tasks manage"
  ON public.facility_management_tasks
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_facility_tasks_start_date
  ON public.facility_management_tasks(task_start_date);
CREATE INDEX IF NOT EXISTS idx_facility_tasks_status
  ON public.facility_management_tasks(status);
CREATE INDEX IF NOT EXISTS idx_facility_tasks_staff
  ON public.facility_management_tasks(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_facility_tasks_department
  ON public.facility_management_tasks(assigned_department);

CREATE OR REPLACE FUNCTION public.set_facility_management_tasks_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_facility_management_tasks_updated_at ON public.facility_management_tasks;
CREATE TRIGGER set_facility_management_tasks_updated_at
BEFORE UPDATE ON public.facility_management_tasks
FOR EACH ROW
EXECUTE FUNCTION public.set_facility_management_tasks_updated_at();
