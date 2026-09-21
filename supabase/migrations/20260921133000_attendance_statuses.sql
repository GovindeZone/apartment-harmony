-- Attendance status model for the dedicated Attendance tab.
ALTER TABLE public.staff_attendance
  DROP CONSTRAINT IF EXISTS staff_attendance_status_check;

ALTER TABLE public.staff_attendance
  ADD CONSTRAINT staff_attendance_status_check
  CHECK (status IN (
    'present',
    'absent',
    'half_day_am_absent',
    'half_day_pm_absent',
    'leave',
    'week_off',
    'festival_holiday',
    'overtime',
    'comp_off'
  ));

CREATE INDEX IF NOT EXISTS idx_staff_attendance_status_date
  ON public.staff_attendance(status, attendance_date);
