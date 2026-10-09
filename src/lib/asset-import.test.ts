import { describe, expect, test } from "bun:test";
import { parseAssetMatrix } from "./asset-import";

describe("asset file import", () => {
  test("retains imported columns and values, including zero quantities", () => {
    expect(parseAssetMatrix([["Name", "Location", "Quantity"], ["Pump", "Block A", 0]])).toEqual([
      { columns: ["Name", "Location", "Quantity"], values: ["Pump", "Block A", "0"] },
    ]);
  });
  test("ignores blank rows and fills missing cells", () => {
    expect(parseAssetMatrix([[], ["Name", "Location"], [], ["Pump"]])).toEqual([
      { columns: ["Name", "Location"], values: ["Pump", ""] },
    ]);
  });
  test("rejects files with no asset rows", () => {
    expect(() => parseAssetMatrix([["Name"]])).toThrow("No asset records");
    expect(() => parseAssetMatrix([])).toThrow("empty");
  });
});