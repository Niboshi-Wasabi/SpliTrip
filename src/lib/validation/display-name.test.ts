import {
  DISPLAY_NAME_MAX_LENGTH,
  clampDisplayNameForProfileStorage,
  validateDisplayNameInput,
} from "./display-name";

describe("validateDisplayNameInput", () => {
  it("トリム後1〜50文字は成功", () => {
    const result = validateDisplayNameInput("  山田  ");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("山田");
    }
  });

  it("51文字超は too_long", () => {
    const longName = "あ".repeat(DISPLAY_NAME_MAX_LENGTH + 1);
    const result = validateDisplayNameInput(longName);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("too_long");
    }
  });

  it("空文字・空白のみは empty", () => {
    expect(validateDisplayNameInput("").ok).toBe(false);
    expect(validateDisplayNameInput("  \n  ").ok).toBe(false);
  });

  it("文字列以外は not_string", () => {
    expect(validateDisplayNameInput(123).ok).toBe(false);
    expect(validateDisplayNameInput(null).ok).toBe(false);
  });
});

describe("clampDisplayNameForProfileStorage", () => {
  it("51文字超は先頭50文字に切り詰め", () => {
    const long = "あ".repeat(DISPLAY_NAME_MAX_LENGTH + 5);
    expect(clampDisplayNameForProfileStorage(long).length).toBe(
      DISPLAY_NAME_MAX_LENGTH,
    );
  });

  it("空白のみはユーザーにフォールバック", () => {
    expect(clampDisplayNameForProfileStorage("  \t  ")).toBe("ユーザー");
  });

  it("トリムしてそのまま返す", () => {
    expect(clampDisplayNameForProfileStorage("  abc  ")).toBe("abc");
  });
});
