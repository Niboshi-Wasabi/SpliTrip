import React from "react";
import { render, screen } from "@testing-library/react";
import jaMessages from "../../../messages/ja.json";
import { LoginForm } from "./login-form";

const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithOAuth: jest.fn().mockResolvedValue({ error: null }),
      signInAnonymously: jest.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

jest.mock("next-intl", () => ({
  useTranslations:
    (namespace: keyof typeof jaMessages) => (key: string) => {
      const scope = jaMessages[namespace] as Record<string, string>;
      return scope[key] ?? key;
    },
  useLocale: () => "ja",
}));

jest.mock("@/lib/i18n/localized-paths", () => ({
  localizedDashboardPath: () => "/dashboard",
}));

jest.mock("@/components/theme/splitrip-theme-provider", () => ({
  SplitripThemeProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  useTheme: () => ({
    theme: "system",
    setTheme: jest.fn(),
    resolvedTheme: "light",
    themes: ["light", "dark", "system"],
    systemTheme: "light",
  }),
}));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test-project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key-for-jest";
});

describe("LoginForm", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
  });

  it("アプリ名「SpliTrip」が表示される", () => {
    render(<LoginForm />);
    expect(screen.getByText("SpliTrip")).toBeInTheDocument();
  });

  it("Googleログインボタンが表示される", () => {
    render(<LoginForm />);
    expect(screen.getByText("Googleでログイン")).toBeInTheDocument();
  });

  it("LINEログインボタンが表示される", () => {
    render(<LoginForm />);
    expect(screen.getByText("LINEでログイン")).toBeInTheDocument();
  });

  it("認証ボタン3つとテーマ切り替えが存在する", () => {
    render(<LoginForm />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(4);
  });

  it("ゲストモードボタンが表示される", () => {
    render(<LoginForm />);
    expect(
      screen.getByRole("button", {
        name: /アカウント作成せずに利用する（ゲストモード）/,
      }),
    ).toBeInTheDocument();
  });

  it("キャッチコピーが表示される", () => {
    render(<LoginForm />);
    expect(
      screen.getByText("グループ旅行の精算を、もっとシンプルに。"),
    ).toBeInTheDocument();
  });
});
