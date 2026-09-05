import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Flat = {
  id: string;
  flat_no: string;
  block: string;
  zone: string;
  floor: number;
  bedrooms: number;
  area_sqft: number | null;
  status: string;
};

export type Resident = {
  id: string;
  flat_id: string | null;
  full_name: string;
  resident_type: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  move_in_date: string | null;
  move_out_date: string | null;
  status: string;
  flats?: Flat | null;
};

export type FamilyMember = {
  id: string;
  resident_id: string;
  full_name: string;
  relation: string | null;
  age: number | null;
  phone: string | null;
};

export type Vehicle = {
  id: string;
  flat_id: string | null;
  resident_id: string | null;
  vehicle_no: string;
  vehicle_type: string;
  make_model: string | null;
  sticker_no: string | null;
  flats?: { flat_no: string } | null;
  residents?: { full_name: string } | null;
};

export type Staff = {
  id: string;
  employee_code: string;
  full_name: string;
  designation: string;
  department: string;
  phone: string | null;
  whatsapp: string | null;
  shift: string;
  join_date: string | null;
  monthly_salary: number;
  status: string;
  address: string | null;
};

export type Attendance = {
  id: string;
  staff_id: string;
  attendance_date: string;
  status: string;
  check_in: string | null;
  check_out: string | null;
  staff?: { full_name: string; employee_code: string; department: string } | null;
};

export type Salary = {
  id: string;
  staff_id: string;
  salary_month: string;
  base_amount: number;
  bonus: number;
  deductions: number;
  net_amount: number;
  status: string;
  paid_on: string | null;
  staff?: { full_name: string; employee_code: string } | null;
};

export type GateEntry = {
  id: string;
  gate: string;
  direction: string;
  category: string;
  person_name: string;
  phone: string | null;
  flat_no: string | null;
  vehicle_no: string | null;
  vehicle_type: string | null;
  purpose: string | null;
  entry_time: string;
  exit_time: string | null;
  status: string;
  recorded_by: string | null;
};

export type HelpdeskRecord = {
  id: string;
  resident_id: string | null;
  flat_no: string | null;
  resident_whatsapp: string | null;
  helpdesk_whatsapp: string | null;
  manager_whatsapp: string | null;
  direction: string;
  category: string;
  message: string;
  status: string;
  handled_by: string | null;
  created_at: string;
};

export type Settings = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  total_flats: number;
  blocks: string[];
  zones: string[];
  gates: string[];
  shifts: string[];
  helpdesk_whatsapp: string | null;
  manager_whatsapp: string | null;
  notifications_enabled: boolean;
};

async function unwrap<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>) {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return (data ?? []) as T;
}

const table = supabase.from.bind(supabase);

export const flatsQuery = queryOptions({
  queryKey: ["flats"],
  queryFn: () => unwrap<Flat[]>(table("flats").select("*").order("flat_no")),
});

export const residentsQuery = queryOptions({
  queryKey: ["residents"],
  queryFn: () =>
    unwrap<Resident[]>(table("residents").select("*, flats(*)").order("full_name")),
});

export const vehiclesQuery = queryOptions({
  queryKey: ["vehicles"],
  queryFn: () =>
    unwrap<Vehicle[]>(
      table("vehicles").select("*, flats(flat_no), residents(full_name)").order("vehicle_no"),
    ),
});

export const staffQuery = queryOptions({
  queryKey: ["staff"],
  queryFn: () => unwrap<Staff[]>(table("staff").select("*").order("employee_code")),
});

export const attendanceQuery = queryOptions({
  queryKey: ["attendance"],
  queryFn: () =>
    unwrap<Attendance[]>(
      table("staff_attendance")
        .select("*, staff(full_name, employee_code, department)")
        .order("attendance_date", { ascending: false })
        .limit(400),
    ),
});

export const salariesQuery = queryOptions({
  queryKey: ["salaries"],
  queryFn: () =>
    unwrap<Salary[]>(
      table("staff_salaries")
        .select("*, staff(full_name, employee_code)")
        .order("salary_month", { ascending: false }),
    ),
});

export const gateEntriesQuery = queryOptions({
  queryKey: ["gate_entries"],
  queryFn: () =>
    unwrap<GateEntry[]>(
      table("gate_entries").select("*").order("entry_time", { ascending: false }).limit(300),
    ),
});

export const helpdeskQuery = queryOptions({
  queryKey: ["helpdesk"],
  queryFn: () =>
    unwrap<HelpdeskRecord[]>(
      table("helpdesk_records").select("*").order("created_at", { ascending: false }),
    ),
});

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async () => {
    const { data, error } = await table("apartment_settings").select("*").limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    return data as Settings | null;
  },
});

export function familyQuery(residentId: string) {
  return queryOptions({
    queryKey: ["family", residentId],
    queryFn: () =>
      unwrap<FamilyMember[]>(
        table("family_members").select("*").eq("resident_id", residentId).order("full_name"),
      ),
  });
}
