import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canReadChatDataset, CHAT_DATASETS } from "./data-chat-policy";

describe("read-only data chat permissions", () => {
  it("denies data without its module's view permission", () => {
    assert.equal(canReadChatDataset("residents", false, [{ tab_key: "/dashboard", can_view: true }]), false);
    assert.equal(canReadChatDataset("staff", false, [{ tab_key: "/staff", can_view: false }]), false);
  });
  it("allows module view permission and verified administrators", () => {
    assert.equal(canReadChatDataset("flats", false, [{ tab_key: "/residents", can_view: true }]), true);
    assert.equal(canReadChatDataset("staff", true, []), true);
  });
  it("never projects private contacts, financial fields, documents or arbitrary JSON", () => {
    const columns = Object.values(CHAT_DATASETS).flatMap((dataset) => dataset.columns.split(","));
    for (const field of ["phone", "email", "aadhaar_number", "monthly_salary", "asset_data", "address", "message", "document_path"]) {
      assert.equal(columns.includes(field), false);
    }
  });
});