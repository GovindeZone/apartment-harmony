export const CHAT_DATASETS = {
  flats: { tab: "/residents", columns: "id,flat_no,block,floor,zone,bedrooms,status" },
  residents: { tab: "/residents", columns: "id,full_name,flat_id,resident_type,occupant_type,status,move_in_date,move_out_date" },
  staff: { tab: "/staff", columns: "id,full_name,employee_code,department,designation,staff_type,status,shift" },
  staff_attendance: { tab: "/attendance", columns: "staff_id,attendance_date,status,shift,check_in,check_out" },
  facility_management_tasks: { tab: "/facility-management", columns: "id,task_name,task_type,status,assigned_department,task_start_date,expected_end_date" },
  gate_entries: { tab: "/security", columns: "category,direction,entry_time,exit_time,gate,status" },
  asset_records: { tab: "/asset-management", columns: "asset_id,asset_category,asset_status,asset_status_date" },
  helpdesk_records: { tab: "/helpdesk", columns: "category,status,direction,created_at,flat_no" },
} as const;

export type ChatDataset = keyof typeof CHAT_DATASETS;
export function canReadChatDataset(dataset: ChatDataset, admin: boolean, permissions: ReadonlyArray<{ tab_key: string; can_view: boolean }>) {
  return admin || permissions.some((permission) => permission.tab_key === CHAT_DATASETS[dataset].tab && permission.can_view);
}