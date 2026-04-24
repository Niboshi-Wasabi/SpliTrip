import { createBackupCodeList, hashBackupCode } from "@/lib/auth/two-factor";

describe("two-factor helpers", () => {
  test("createBackupCodeList returns requested count", () => {
    const codes = createBackupCodeList(8);
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
  });

  test("hashBackupCode is deterministic and non-empty", () => {
    const code = "abcdef1234";
    const hash1 = hashBackupCode(code);
    const hash2 = hashBackupCode(code);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });
});
