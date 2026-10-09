export type AssetData = { columns: string[]; values: string[] };

export function parseAssetMatrix(matrix: unknown[][]): AssetData[] {
  const nonempty = matrix.filter((row) => row.some((value) => String(value ?? "").trim()));
  const header = nonempty[0];
  if (!header) throw new Error("The uploaded file is empty.");
  const columns = header.map((value, index) => String(value ?? "").trim() || `Column ${index + 1}`);
  const rows = nonempty.slice(1).map((row) => ({
    columns: [...columns],
    values: columns.map((_, index) => String(row[index] ?? "")),
  }));
  if (!rows.length) throw new Error("No asset records were found below the header row.");
  return rows;
}