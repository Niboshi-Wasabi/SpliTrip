import { stringToColor } from "./string-to-color";

describe("stringToColor", () => {
  it("同じ表示名なら常に同じ背景・前景を返す", () => {
    const first = stringToColor("田中太郎");
    const second = stringToColor("田中太郎");
    expect(first).toEqual(second);
  });

  it("複数の短い名前で背景色にばらつきがある", () => {
    const backgrounds = ["A", "B", "C", "D", "E"].map(
      (label) => stringToColor(label).background,
    );
    expect(new Set(backgrounds).size).toBeGreaterThan(1);
  });

  it("空や空白のみはニュートラルな色になる", () => {
    expect(stringToColor("")).toEqual(stringToColor("   "));
    expect(stringToColor("").background).toContain("hsl(");
  });

  it("前景色はコントラスト用の16進またはhsl表現になる", () => {
    const result = stringToColor("テストユーザー");
    expect(result.foreground).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
