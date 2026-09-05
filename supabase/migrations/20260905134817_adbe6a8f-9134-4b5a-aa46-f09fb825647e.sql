
-- ROLES ---------------------------------------------------------------
CREATE TYPE public.app_role AS ENUM ('admin','manager','security','helpdesk');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles readable by authenticated" ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- SETTINGS ------------------------------------------------------------
CREATE TABLE public.apartment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  city text,
  total_flats integer NOT NULL DEFAULT 0,
  blocks text[] NOT NULL DEFAULT '{}',
  zones text[] NOT NULL DEFAULT '{}',
  gates text[] NOT NULL DEFAULT '{}',
  shifts text[] NOT NULL DEFAULT '{}',
  helpdesk_whatsapp text,
  manager_whatsapp text,
  notifications_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apartment_settings TO authenticated;
GRANT ALL ON public.apartment_settings TO service_role;
ALTER TABLE public.apartment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings manage" ON public.apartment_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_settings_touch BEFORE UPDATE ON public.apartment_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- FLATS ---------------------------------------------------------------
CREATE TABLE public.flats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flat_no text NOT NULL UNIQUE,
  block text NOT NULL,
  zone text NOT NULL,
  floor integer NOT NULL,
  bedrooms integer NOT NULL DEFAULT 2,
  area_sqft integer,
  status text NOT NULL DEFAULT 'vacant',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flats TO authenticated;
GRANT ALL ON public.flats TO service_role;
ALTER TABLE public.flats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flats manage" ON public.flats FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RESIDENTS -----------------------------------------------------------
CREATE TABLE public.residents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flat_id uuid REFERENCES public.flats(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  resident_type text NOT NULL DEFAULT 'owner',
  phone text,
  whatsapp text,
  email text,
  is_primary boolean NOT NULL DEFAULT true,
  move_in_date date,
  move_out_date date,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.residents TO authenticated;
GRANT ALL ON public.residents TO service_role;
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "residents manage" ON public.residents FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  relation text,
  age integer,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_members TO authenticated;
GRANT ALL ON public.family_members TO service_role;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family manage" ON public.family_members FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flat_id uuid REFERENCES public.flats(id) ON DELETE SET NULL,
  resident_id uuid REFERENCES public.residents(id) ON DELETE SET NULL,
  vehicle_no text NOT NULL,
  vehicle_type text NOT NULL DEFAULT 'car',
  make_model text,
  sticker_no text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicles manage" ON public.vehicles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- STAFF ---------------------------------------------------------------
CREATE TABLE public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code text NOT NULL UNIQUE,
  full_name text NOT NULL,
  designation text NOT NULL,
  department text NOT NULL,
  phone text,
  whatsapp text,
  shift text NOT NULL DEFAULT 'Morning',
  join_date date,
  monthly_salary numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO authenticated;
GRANT ALL ON public.staff TO service_role;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage" ON public.staff FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.staff_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  attendance_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'present',
  check_in time,
  check_out time,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, attendance_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_attendance TO authenticated;
GRANT ALL ON public.staff_attendance TO service_role;
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attendance manage" ON public.staff_attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.staff_salaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  salary_month date NOT NULL,
  base_amount numeric(12,2) NOT NULL DEFAULT 0,
  bonus numeric(12,2) NOT NULL DEFAULT 0,
  deductions numeric(12,2) NOT NULL DEFAULT 0,
  net_amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  paid_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, salary_month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_salaries TO authenticated;
GRANT ALL ON public.staff_salaries TO service_role;
ALTER TABLE public.staff_salaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "salaries manage" ON public.staff_salaries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- GATE ----------------------------------------------------------------
CREATE TABLE public.gate_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gate text NOT NULL DEFAULT 'in_gate',
  direction text NOT NULL DEFAULT 'in',
  category text NOT NULL DEFAULT 'visitor',
  person_name text NOT NULL,
  phone text,
  flat_id uuid REFERENCES public.flats(id) ON DELETE SET NULL,
  flat_no text,
  vehicle_no text,
  vehicle_type text,
  purpose text,
  entry_time timestamptz NOT NULL DEFAULT now(),
  exit_time timestamptz,
  status text NOT NULL DEFAULT 'inside',
  recorded_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gate_entries TO authenticated;
GRANT ALL ON public.gate_entries TO service_role;
ALTER TABLE public.gate_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gate manage" ON public.gate_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- HELP DESK -----------------------------------------------------------
CREATE TABLE public.helpdesk_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid REFERENCES public.residents(id) ON DELETE SET NULL,
  flat_no text,
  resident_whatsapp text,
  helpdesk_whatsapp text,
  manager_whatsapp text,
  direction text NOT NULL DEFAULT 'inbound',
  category text NOT NULL DEFAULT 'general',
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  handled_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.helpdesk_records TO authenticated;
GRANT ALL ON public.helpdesk_records TO service_role;
ALTER TABLE public.helpdesk_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "helpdesk manage" ON public.helpdesk_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- DEMO DATA -----------------------------------------------------------
INSERT INTO public.apartment_settings (name, address, city, total_flats, blocks, zones, gates, shifts, helpdesk_whatsapp, manager_whatsapp)
VALUES ('Ashvale Residency', 'Survey 42, Baner Road', 'Pune', 24, ARRAY['A','B','C','D'], ARRAY['North','South'], ARRAY['IN Gate','Side Gate','OUT Gate'], ARRAY['Morning','Evening','Night'], '+91 98200 11223', '+91 98200 44556');

INSERT INTO public.flats (flat_no, block, zone, floor, bedrooms, area_sqft, status) VALUES
('A-101','A','North',1,2,1050,'occupied'),('A-102','A','North',1,3,1420,'occupied'),
('A-201','A','North',2,2,1050,'occupied'),('A-202','A','North',2,3,1420,'vacant'),
('A-301','A','North',3,2,1050,'occupied'),('A-302','A','North',3,3,1420,'occupied'),
('B-101','B','North',1,2,1080,'occupied'),('B-102','B','North',1,3,1450,'occupied'),
('B-201','B','North',2,2,1080,'vacant'),('B-202','B','North',2,3,1450,'occupied'),
('B-301','B','North',3,2,1080,'occupied'),('B-302','B','North',3,3,1450,'occupied'),
('C-101','C','South',1,2,1020,'occupied'),('C-102','C','South',1,3,1390,'occupied'),
('C-201','C','South',2,2,1020,'occupied'),('C-202','C','South',2,3,1390,'vacant'),
('C-301','C','South',3,2,1020,'occupied'),('C-302','C','South',3,3,1390,'occupied'),
('D-101','D','South',1,2,1100,'occupied'),('D-102','D','South',1,3,1500,'occupied'),
('D-201','D','South',2,2,1100,'occupied'),('D-202','D','South',2,3,1500,'vacant'),
('D-301','D','South',3,2,1100,'occupied'),('D-302','D','South',3,3,1500,'occupied');

INSERT INTO public.residents (flat_id, full_name, resident_type, phone, whatsapp, email, move_in_date)
SELECT f.id, v.full_name, v.rtype, v.phone, v.phone, v.email, v.movein::date
FROM (VALUES
 ('A-101','Arjun Mehta','owner','+91 98110 20101','arjun.mehta@example.com','2019-04-12'),
 ('A-102','Priya Iyer','tenant','+91 98110 20102','priya.iyer@example.com','2023-01-05'),
 ('A-201','Rakesh Nair','owner','+91 98110 20201','rakesh.nair@example.com','2018-08-20'),
 ('A-301','Sneha Kulkarni','tenant','+91 98110 20301','sneha.k@example.com','2024-02-01'),
 ('A-302','Vikram Desai','owner','+91 98110 20302','vikram.desai@example.com','2020-11-15'),
 ('B-101','Ananya Sharma','owner','+91 98110 20401','ananya.sharma@example.com','2021-06-09'),
 ('B-102','Imran Sheikh','tenant','+91 98110 20402','imran.sheikh@example.com','2023-09-18'),
 ('B-202','Deepa Menon','owner','+91 98110 20403','deepa.menon@example.com','2017-03-22'),
 ('B-301','Karan Malhotra','tenant','+91 98110 20404','karan.m@example.com','2024-07-01'),
 ('B-302','Sunita Rao','owner','+91 98110 20405','sunita.rao@example.com','2016-12-11'),
 ('C-101','Farhan Qureshi','owner','+91 98110 20501','farhan.q@example.com','2022-05-30'),
 ('C-102','Meera Joshi','tenant','+91 98110 20502','meera.joshi@example.com','2023-11-12'),
 ('C-201','Rohit Verma','owner','+91 98110 20503','rohit.verma@example.com','2019-09-25'),
 ('C-301','Lakshmi Pillai','owner','+91 98110 20504','lakshmi.p@example.com','2015-02-14'),
 ('C-302','Sameer Gupta','tenant','+91 98110 20505','sameer.gupta@example.com','2024-04-08'),
 ('D-101','Nisha Bhatt','owner','+91 98110 20601','nisha.bhatt@example.com','2020-01-19'),
 ('D-102','Aditya Rane','tenant','+91 98110 20602','aditya.rane@example.com','2022-10-03'),
 ('D-201','Kavita Shetty','owner','+91 98110 20603','kavita.shetty@example.com','2018-06-27'),
 ('D-301','Manish Agarwal','owner','+91 98110 20604','manish.a@example.com','2021-08-16'),
 ('D-302','Ritika Sen','tenant','+91 98110 20605','ritika.sen@example.com','2025-01-10')
) AS v(flat_no, full_name, rtype, phone, email, movein)
JOIN public.flats f ON f.flat_no = v.flat_no;

INSERT INTO public.family_members (resident_id, full_name, relation, age, phone)
SELECT r.id, v.name, v.rel, v.age, r.phone FROM (VALUES
 ('Arjun Mehta','Ritu Mehta','Spouse',38),
 ('Arjun Mehta','Aarav Mehta','Son',9),
 ('Priya Iyer','Ravi Iyer','Spouse',41),
 ('Rakesh Nair','Latha Nair','Spouse',52),
 ('Ananya Sharma','Dev Sharma','Son',14),
 ('Deepa Menon','Suresh Menon','Spouse',58),
 ('Farhan Qureshi','Zoya Qureshi','Daughter',7),
 ('Rohit Verma','Anita Verma','Spouse',44),
 ('Nisha Bhatt','Parth Bhatt','Son',17),
 ('Kavita Shetty','Ramesh Shetty','Spouse',49)
) AS v(resident, name, rel, age)
JOIN public.residents r ON r.full_name = v.resident;

INSERT INTO public.vehicles (flat_id, resident_id, vehicle_no, vehicle_type, make_model, sticker_no)
SELECT r.flat_id, r.id, v.vno, v.vtype, v.model, v.sticker FROM (VALUES
 ('Arjun Mehta','MH-12-AB-4471','car','Hyundai Creta','ST-1001'),
 ('Priya Iyer','MH-14-KX-9023','car','Maruti Baleno','ST-1002'),
 ('Rakesh Nair','MH-12-DP-3312','bike','Royal Enfield','ST-1003'),
 ('Vikram Desai','MH-12-QF-2290','car','Toyota Innova','ST-1004'),
 ('Ananya Sharma','MH-19-CD-3345','car','Honda City','ST-1005'),
 ('Imran Sheikh','MH-04-JK-8812','bike','Bajaj Pulsar','ST-1006'),
 ('Deepa Menon','MH-08-ZZ-1180','car','Kia Seltos','ST-1007'),
 ('Farhan Qureshi','MH-12-TR-7745','car','Tata Nexon','ST-1008'),
 ('Rohit Verma','MH-11-TD-7734','car','Skoda Slavia','ST-1009'),
 ('Nisha Bhatt','MH-12-LM-5521','bike','Honda Activa','ST-1010'),
 ('Kavita Shetty','MH-20-BR-6690','car','MG Astor','ST-1011'),
 ('Manish Agarwal','MH-12-NN-9081','car','Mahindra XUV700','ST-1012')
) AS v(resident, vno, vtype, model, sticker)
JOIN public.residents r ON r.full_name = v.resident;

INSERT INTO public.staff (employee_code, full_name, designation, department, phone, whatsapp, shift, join_date, monthly_salary, status) VALUES
('EMP-001','Ramesh Pawar','Security Guard','Security','+91 90210 10001','+91 90210 10001','Morning','2021-03-01',22000,'active'),
('EMP-002','Sanjay Yadav','Security Guard','Security','+91 90210 10002','+91 90210 10002','Night','2020-07-15',23500,'active'),
('EMP-003','Vinod Kamble','Security Supervisor','Security','+91 90210 10003','+91 90210 10003','Evening','2019-01-20',31000,'active'),
('EMP-004','Sunita Jadhav','Housekeeping','Housekeeping','+91 90210 10004','+91 90210 10004','Morning','2022-05-10',18000,'active'),
('EMP-005','Meena Sawant','Housekeeping','Housekeeping','+91 90210 10005','+91 90210 10005','Morning','2023-02-06',18000,'active'),
('EMP-006','Ganesh Patil','Plumber','Maintenance','+91 90210 10006','+91 90210 10006','Morning','2020-09-14',26000,'active'),
('EMP-007','Arun Shinde','Electrician','Maintenance','+91 90210 10007','+91 90210 10007','Evening','2021-11-23',27500,'active'),
('EMP-008','Kiran More','Gardener','Facility','+91 90210 10008','+91 90210 10008','Morning','2022-08-01',17500,'active'),
('EMP-009','Rekha Gaikwad','Help Desk Executive','Help Desk','+91 90210 10009','+91 90210 10009','Morning','2023-04-17',29000,'active'),
('EMP-010','Nitin Bhosale','Facility Manager','Administration','+91 90210 10010','+91 90210 10010','Morning','2018-06-11',58000,'active'),
('EMP-011','Pooja Kadam','Accounts Assistant','Administration','+91 90210 10011','+91 90210 10011','Morning','2022-01-09',34000,'active'),
('EMP-012','Salim Khan','Security Guard','Security','+91 90210 10012','+91 90210 10012','Night','2024-02-19',22000,'inactive');

INSERT INTO public.staff_attendance (staff_id, attendance_date, status, check_in, check_out)
SELECT s.id, CURRENT_DATE, v.st, v.cin::time, v.cout::time FROM (VALUES
 ('EMP-001','present','07:02','15:05'),('EMP-002','present','21:58',NULL),
 ('EMP-003','present','14:50',NULL),('EMP-004','present','06:55','14:10'),
 ('EMP-005','absent',NULL,NULL),('EMP-006','present','08:10','17:02'),
 ('EMP-007','present','14:45',NULL),('EMP-008','leave',NULL,NULL),
 ('EMP-009','present','08:58','18:05'),('EMP-010','present','08:30',NULL),
 ('EMP-011','present','09:05','18:00'),('EMP-012','absent',NULL,NULL)
) AS v(code, st, cin, cout)
JOIN public.staff s ON s.employee_code = v.code;

INSERT INTO public.staff_attendance (staff_id, attendance_date, status, check_in, check_out)
SELECT s.id, CURRENT_DATE - d.n, CASE WHEN (extract(day FROM CURRENT_DATE - d.n)::int + length(s.employee_code)) % 7 = 0 THEN 'absent' ELSE 'present' END, '08:00'::time, '17:00'::time
FROM public.staff s CROSS JOIN generate_series(1,6) AS d(n);

INSERT INTO public.staff_salaries (staff_id, salary_month, base_amount, bonus, deductions, net_amount, status, paid_on)
SELECT s.id, date_trunc('month', CURRENT_DATE)::date, s.monthly_salary, 0, 0, s.monthly_salary, 'pending', NULL FROM public.staff s;
INSERT INTO public.staff_salaries (staff_id, salary_month, base_amount, bonus, deductions, net_amount, status, paid_on)
SELECT s.id, (date_trunc('month', CURRENT_DATE) - interval '1 month')::date, s.monthly_salary, 1500, 500, s.monthly_salary + 1000, 'paid', (date_trunc('month', CURRENT_DATE) - interval '2 day')::date FROM public.staff s;

INSERT INTO public.gate_entries (gate, direction, category, person_name, phone, flat_id, flat_no, vehicle_no, vehicle_type, purpose, entry_time, exit_time, status, recorded_by)
SELECT v.gate, v.dir, v.cat, v.person, v.phone, f.id, v.flat_no, v.vno, v.vtype, v.purpose,
       CURRENT_DATE + v.etime::time, CASE WHEN v.xtime IS NULL THEN NULL ELSE CURRENT_DATE + v.xtime::time END,
       CASE WHEN v.xtime IS NULL AND v.dir = 'in' THEN 'inside' ELSE 'exited' END, v.rec
FROM (VALUES
 ('in_gate','in','resident','Arjun Mehta','+91 98110 20101','A-101','MH-12-AB-4471','car','Returning home','08:41',NULL,'Ramesh Pawar'),
 ('side_gate','in','vendor','Suresh Verma','+91 98220 33110','B-102','MH-14-KX-9023','bike','Grocery delivery','08:37','09:05','Vinod Kamble'),
 ('out_gate','out','resident','Deepa Menon','+91 98110 20403','B-202','MH-08-ZZ-1180','car','Office','08:33',NULL,'Sanjay Yadav'),
 ('in_gate','in','visitor','Guest of C-101','+91 98330 44221','C-101',NULL,NULL,'Family visit','08:29',NULL,'Ramesh Pawar'),
 ('in_gate','in','resident','Priya Iyer','+91 98110 20102','A-102','MH-14-KX-9023','car','Returning home','08:21','12:40','Ramesh Pawar'),
 ('side_gate','in','vendor','Amazon Courier','+91 98440 55332','D-102',NULL,NULL,'Parcel delivery','09:15','09:35','Vinod Kamble'),
 ('in_gate','in','visitor','Dr. Sameer Kale','+91 98550 66443','C-301','MH-12-PP-2211','car','Medical visit','10:02',NULL,'Ramesh Pawar'),
 ('out_gate','out','vendor','Water Tanker','+91 98660 77554',NULL,'MH-12-WT-8899','truck','Tanker supply','10:40','10:41','Sanjay Yadav'),
 ('in_gate','in','staff','Ganesh Patil','+91 90210 10006',NULL,NULL,NULL,'Duty','08:10',NULL,'Ramesh Pawar'),
 ('out_gate','out','resident','Rohit Verma','+91 98110 20503','C-201','MH-11-TD-7734','car','Shopping','11:20',NULL,'Sanjay Yadav'),
 ('in_gate','in','visitor','Neha Kapoor','+91 98770 88665','D-301',NULL,NULL,'Guest','11:55',NULL,'Ramesh Pawar'),
 ('side_gate','in','vendor','Housekeeping Supplies','+91 98880 99776',NULL,'MH-12-HK-4433','van','Supplies','12:30','13:10','Vinod Kamble')
) AS v(gate, dir, cat, person, phone, flat_no, vno, vtype, purpose, etime, xtime, rec)
LEFT JOIN public.flats f ON f.flat_no = v.flat_no;

INSERT INTO public.helpdesk_records (resident_id, flat_no, resident_whatsapp, helpdesk_whatsapp, manager_whatsapp, direction, category, message, status, handled_by, created_at)
SELECT r.id, fl.flat_no, r.whatsapp, '+91 98200 11223', '+91 98200 44556', v.dir, v.cat, v.msg, v.st, v.handler, now() - (v.hrs || ' hours')::interval
FROM (VALUES
 ('Arjun Mehta','inbound','maintenance','Water leakage in the kitchen sink, please send a plumber.','open','Rekha Gaikwad',2),
 ('Priya Iyer','outbound','notice','Lift B maintenance scheduled tomorrow 10am-1pm.','resolved','Rekha Gaikwad',5),
 ('Deepa Menon','inbound','security','Unknown vehicle parked in my slot B-202.','resolved','Vinod Kamble',9),
 ('Farhan Qureshi','inbound','billing','Requesting maintenance invoice for this quarter.','open','Pooja Kadam',12),
 ('Rohit Verma','outbound','general','Your visitor pass for tonight has been approved.','resolved','Rekha Gaikwad',20),
 ('Nisha Bhatt','inbound','maintenance','Corridor light on 1st floor is not working.','open','Arun Shinde',26),
 ('Kavita Shetty','inbound','general','Please share the clubhouse booking process.','resolved','Rekha Gaikwad',33),
 ('Manish Agarwal','inbound','security','Requesting extra guard round near D block at night.','open','Nitin Bhosale',40)
) AS v(resident, dir, cat, msg, st, handler, hrs)
JOIN public.residents r ON r.full_name = v.resident
LEFT JOIN public.flats fl ON fl.id = r.flat_id;
