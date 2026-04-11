import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import jaMessages from "../../../../messages/ja.json";
import { GuestAccountLinkModal } from "./guest-account-link-modal";

const linkIdentityMock = jest.fn().mockResolvedValue({ error: null });

jest.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    auth: {
      linkIdentity: (
        credentials: Record<string, unknown>,
      ): ReturnType<typeof linkIdentityMock> =>
        linkIdentityMock(credentials),
    },
  }),
}));

jest.mock("@/utils/supabase/env", () => ({
  isSupabaseConfigured: () => true,
}));

jest.mock("@/utils/public-site-url", () => ({
  getPublicSiteOrigin: () => "https://example.test",
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

describe("GuestAccountLinkModal", () => {
  beforeEach(() => {
    linkIdentityMock.mockClear();
    linkIdentityMock.mockResolvedValue({ error: null });
  });

  it("モーダルを開き、Google 紐づけで linkIdentity が呼ばれる", async () => {
    render(<GuestAccountLinkModal />);

    fireEvent.click(
      screen.getByRole("button", { name: "アカウントを紐づける" }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("dialog", {
          name: jaMessages.Dashboard.guestLinkModalTitle,
        }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Googleで紐づける" }));

    await waitFor(() => {
      expect(linkIdentityMock).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "google",
          options: expect.objectContaining({
            redirectTo: expect.stringContaining("/auth/callback?next="),
          }),
        }),
      );
    });
  });

  it("モーダル内に LINE 紐づけボタンが表示される", async () => {
    render(<GuestAccountLinkModal />);

    fireEvent.click(
      screen.getByRole("button", { name: "アカウントを紐づける" }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "LINEで紐づける" }),
      ).toBeInTheDocument();
    });
  });
});
