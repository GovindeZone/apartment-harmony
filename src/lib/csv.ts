export function downloadCsv(filename: string, headers: string[], rows: string[][] = []) {
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const body = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob([`\ufeff${body}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  const headerRow = rows.shift();
  if (!headerRow) return [];
  const headers = headerRow.map((header) => header.replace(/^\ufeff/, "").split(" ")[0] ?? header);
  return rows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
}

export const IMPORT_TEMPLATES = {
  residents: {
    file: "residents-import-template.csv",
    headers: [
      "full_name",
      "flat_no",
      "resident_type (owner/tenant)",
      "occupant_type (family/bachelors)",
      "phone",
      "whatsapp",
      "email",
      "move_in_date (YYYY-MM-DD)",
      "move_out_date (YYYY-MM-DD)",
      "status (active/inactive)",
    ],
    sample: [
      [
        "Ramesh Kumar",
        "A-101",
        "owner",
        "family",
        "+91 90000 00001",
        "+91 90000 00001",
        "ramesh@example.com",
        "2024-04-01",
        "",
        "active",
      ],
    ],
  },
  flats: {
    file: "flat-directory-import-template.csv",
    headers: [
      "flat_no",
      "block",
      "zone",
      "floor",
      "bedrooms",
      "area_sqft",
      "status (occupied/vacant)",
    ],
    sample: [["A-101", "A", "North", "1", "2", "1150", "occupied"]],
  },
  vehicles: {
    file: "vehicle-details-import-template.csv",
    headers: [
      "vehicle_no",
      "vehicle_type (car/bike/auto/cycle)",
      "make_model",
      "flat_no",
      "resident_name",
      "sticker_no",
    ],
    sample: [["TN01AB1234", "car", "Hyundai i20", "A-101", "Ramesh Kumar", "STK-001"]],
  },
} as const;
