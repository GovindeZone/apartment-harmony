import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseAssetMatrix } from "./asset-import";

describe("asset file import", () => {
  it("retains imported columns and values, including zero quantities", () => {
    assert.deepEqual(parseAssetMatrix([["Name", "Location", "Quantity"], ["Pump", "Block A", 0]]), [
      { columns: ["Name", "Location", "Quantity"], values: ["Pump", "Block A", "0"] },
    ]);
  });
  it("ignores blank rows and fills missing cells", () => {
    assert.deepEqual(parseAssetMatrix([[], ["Name", "Location"], [], ["Pump"]]), [
      { columns: ["Name", "Location"], values: ["Pump", ""] },
    ]);
  });
  it("rejects files with no asset rows", () => {
    assert.throws(() => parseAssetMatrix([["Name"]]), /No asset records/);
    assert.throws(() => parseAssetMatrix([]), /empty/);
  });
});