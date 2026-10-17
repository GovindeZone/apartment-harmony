import { supabase } from "@/integrations/supabase/client";
export const DEPARTMENT_LABELS = {
  helpdesk: "Help Desk",
  facility_manager: "Facility Manager",
  security: "Security",
} as const;
export type Department = keyof typeof DEPARTMENT_LABELS;
export type DepartmentIntegration = {
  department: Department;
  enabled: boolean;
  spreadsheet_id: string;
  sheet_tab: string;
  whatsapp_number: string;
  phone_number_id: string;
  business_account_id: string;
  webhook_url: string;
};
export async function integrationRequest<T>(
  department: Department,
  init?: RequestInit,
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Please sign in.");
  const response = await fetch(`/api/department-integration?department=${department}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session.access_token}`,
    },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Integration request failed.");
  return result;
}
