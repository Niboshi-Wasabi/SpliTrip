import {
  isOAuthHostileInAppBrowser,
  withOpenExternalBrowserParam,
} from "@/lib/auth/in-app-browser";
import {
  buildSameOriginPostAuthUrl,
  createAuthSessionBridgeResponse,
} from "@/lib/auth/auth-session-bridge";

describe("isOAuthHostileInAppBrowser", () => {
  it("detects LINE Android IAB", () => {
    const ua =
      "Mozilla/5.0 (Linux; Android 11; Pixel 4 Build/RQ2A.210405.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/90.0.4430.210 Mobile Safari/537.36 Line/11.10.2/IAB";
    expect(isOAuthHostileInAppBrowser(ua)).toBe(true);
  });

  it("allows normal Chrome Android", () => {
    const ua =
      "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36";
    expect(isOAuthHostileInAppBrowser(ua)).toBe(false);
  });
});

describe("withOpenExternalBrowserParam", () => {
  it("adds openExternalBrowser=1", () => {
    const result = withOpenExternalBrowserParam(
      "https://splitrip.net/join/abc",
    );
    expect(result).toContain("openExternalBrowser=1");
  });
});

describe("auth session bridge", () => {
  it("returns 200 HTML with client navigation target", async () => {
    const redirectUrl = buildSameOriginPostAuthUrl(
      "https://splitrip.net",
      "/dashboard",
      "/",
    );
    const response = createAuthSessionBridgeResponse(redirectUrl);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");
    const body = await response.text();
    expect(body).toContain("https://splitrip.net/dashboard");
    expect(body).toContain("location.replace");
  });
});
